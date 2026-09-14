import { createClient } from "./vendor/supabase.js?v=0.5.4";
import { CLOUD_CONFIG } from "./cloud-config.js?v=0.5.4";

const SYNC_META_PREFIX = "cet6-90day-cloud-sync-v1";
const PENDING_MIGRATION_KEY = "cet6-90day-cloud-migration-v1";
const DEVICE_ID_KEY = "cet6-90day-device-id-v1";
const MAX_CLOUD_STATE_BYTES = 4 * 1024 * 1024;

let client = null;
let cloudUser = null;
let queuedState = null;
let syncTimer = null;
let syncGeneration = 0;
let syncStatus = Object.freeze({ state: "local", label: "本机保存", detail: "尚未登录云账户" });
const statusListeners = new Set();

function getClient() {
  if (!client) {
    client = createClient(CLOUD_CONFIG.projectUrl, CLOUD_CONFIG.publishableKey, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "cet6-90day-supabase-auth",
      },
    });
  }
  return client;
}

function emitStatus(state, label, detail) {
  syncStatus = Object.freeze({ state, label, detail });
  statusListeners.forEach((listener) => listener(syncStatus));
}

function syncMetaKey(userId) {
  return `${SYNC_META_PREFIX}:${userId}`;
}

function readSyncMeta(userId = cloudUser?.id) {
  if (!userId) return { revision: 0, pending: false, lastSyncedAt: null };
  try {
    const candidate = JSON.parse(localStorage.getItem(syncMetaKey(userId)));
    return {
      revision: Number(candidate?.revision) || 0,
      pending: Boolean(candidate?.pending),
      lastSyncedAt: candidate?.lastSyncedAt || null,
    };
  } catch {
    return { revision: 0, pending: false, lastSyncedAt: null };
  }
}

function writeSyncMeta(meta, userId = cloudUser?.id) {
  if (!userId) return;
  localStorage.setItem(syncMetaKey(userId), JSON.stringify(meta));
}

function deviceId() {
  let value = localStorage.getItem(DEVICE_ID_KEY);
  if (value) return value;
  value = crypto.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(DEVICE_ID_KEY, value);
  return value;
}

function serializableState(state) {
  const snapshot = JSON.parse(JSON.stringify(state));
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot)).byteLength;
  if (bytes > MAX_CLOUD_STATE_BYTES) {
    throw new Error("当前学习数据超过4MB，请先删除笔记中的大图片或附件，再进行云同步。");
  }
  return snapshot;
}

function pendingMigrationFor(email) {
  try {
    const candidate = JSON.parse(localStorage.getItem(PENDING_MIGRATION_KEY));
    if (candidate?.email?.toLocaleLowerCase() !== email?.toLocaleLowerCase()) return null;
    return candidate;
  } catch {
    return null;
  }
}

function clearPendingMigration() {
  localStorage.removeItem(PENDING_MIGRATION_KEY);
}

function databaseSetupMessage(error) {
  if (error?.code === "PGRST205" || /study_states|sync_study_state/i.test(error?.message || "")) {
    return "云账户已登录，但数据库尚未初始化。请在 Supabase SQL Editor 运行 supabase/schema.sql。";
  }
  return error?.message || "云同步暂时不可用。";
}

export function subscribeCloudStatus(listener) {
  statusListeners.add(listener);
  listener(syncStatus);
  return () => statusListeners.delete(listener);
}

export function getCloudStatus() {
  return syncStatus;
}

export function getCloudUser() {
  return cloudUser;
}

export async function initializeCloudAuth() {
  emitStatus("connecting", "连接云端", "正在恢复登录状态");
  const { data, error } = await getClient().auth.getSession();
  if (error) {
    emitStatus("error", "连接失败", error.message);
    throw error;
  }
  cloudUser = data.session?.user || null;
  if (!cloudUser) emitStatus("local", "本机保存", "尚未登录云账户");
  return data.session || null;
}

export async function signInCloud(email, password) {
  emitStatus("connecting", "正在登录", "正在验证云账户");
  const { data, error } = await getClient().auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    emitStatus("error", "登录失败", error.message);
    throw error;
  }
  cloudUser = data.user;
  return data;
}

export async function signUpCloud(email, password, displayName) {
  emitStatus("connecting", "正在注册", "正在创建云账户");
  const { data, error } = await getClient().auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { display_name: displayName.trim() },
      emailRedirectTo: CLOUD_CONFIG.siteUrl,
    },
  });
  if (error) {
    emitStatus("error", "注册失败", error.message);
    throw error;
  }
  cloudUser = data.session?.user || null;
  return data;
}

export async function signOutCloud() {
  clearTimeout(syncTimer);
  queuedState = null;
  const { error } = await getClient().auth.signOut({ scope: "local" });
  if (error) throw error;
  cloudUser = null;
  emitStatus("local", "本机保存", "已退出云账户");
}

export function stageCloudMigration(email, state) {
  localStorage.setItem(PENDING_MIGRATION_KEY, JSON.stringify({
    email: email.trim().toLocaleLowerCase(),
    state: serializableState(state),
    createdAt: new Date().toISOString(),
  }));
}

export async function fetchCloudState() {
  if (!cloudUser) return null;
  const { data, error } = await getClient()
    .from("study_states")
    .select("state_json, revision, updated_at")
    .eq("user_id", cloudUser.id)
    .maybeSingle();
  if (error) {
    const message = databaseSetupMessage(error);
    emitStatus("error", "同步失败", message);
    throw new Error(message);
  }
  return data || null;
}

async function uploadWithRevision(state, expectedRevision, generation = null) {
  if (!cloudUser) throw new Error("请先登录云账户。");
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const offlineError = new Error("当前离线，学习记录已保存在本机，联网后会自动同步。");
    emitStatus("offline", "等待联网", offlineError.message);
    throw offlineError;
  }
  emitStatus("syncing", "同步中", "正在上传最新学习记录");
  const { data, error } = await getClient().rpc("sync_study_state", {
    p_state: serializableState(state),
    p_expected_revision: expectedRevision,
    p_device_id: deviceId(),
  });
  if (error) {
    const message = databaseSetupMessage(error);
    emitStatus("error", "同步失败", message);
    throw new Error(message);
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) {
    const conflict = new Error("云端已有其他设备的新记录，请选择下载云端记录或强制上传本机记录。");
    conflict.code = "SYNC_CONFLICT";
    throw conflict;
  }
  const hasNewerChanges = generation !== null && generation !== syncGeneration;
  const meta = {
    revision: Number(result.new_revision) || expectedRevision + 1,
    pending: hasNewerChanges,
    lastSyncedAt: result.synced_at || new Date().toISOString(),
  };
  writeSyncMeta(meta);
  if (hasNewerChanges) emitStatus("pending", "待同步", "较新的本机修改正在等待上传");
  else emitStatus("synced", "已同步", `云端版本 ${meta.revision}`);
  return meta;
}

export async function reconcileCloudState(localState, confirmMigrationOverwrite) {
  if (!cloudUser) return { state: localState, source: "local" };
  emitStatus("syncing", "同步中", "正在检查云端学习记录");
  const remote = await fetchCloudState();
  const meta = readSyncMeta();
  const migration = pendingMigrationFor(cloudUser.email);

  if (migration) {
    if (!remote || confirmMigrationOverwrite(remote)) {
      const expectedRevision = remote ? Number(remote.revision) || 0 : 0;
      await uploadWithRevision(migration.state, expectedRevision);
      clearPendingMigration();
      return { state: migration.state, source: "migration" };
    }
    clearPendingMigration();
  }

  if (!remote) {
    await uploadWithRevision(localState, 0);
    return { state: localState, source: "local" };
  }

  if (meta.pending) {
    if (meta.revision === Number(remote.revision)) {
      await uploadWithRevision(localState, meta.revision);
      return { state: localState, source: "local" };
    }
    emitStatus("conflict", "同步冲突", "本机与云端都有新记录，请在账户管理中选择保留版本");
    return { state: localState, source: "conflict", remote };
  }

  writeSyncMeta({ revision: Number(remote.revision) || 0, pending: false, lastSyncedAt: remote.updated_at });
  emitStatus("synced", "已同步", `已载入云端版本 ${remote.revision}`);
  return { state: remote.state_json, source: "remote" };
}

export function queueCloudSync(state, options = {}) {
  if (!cloudUser) return;
  const generation = ++syncGeneration;
  queuedState = state;
  const meta = { ...readSyncMeta(), pending: true };
  writeSyncMeta(meta);
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    emitStatus("offline", "等待联网", "记录已安全保存在本机");
    return;
  }
  emitStatus("pending", "待同步", "本机记录已保存");
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      await uploadWithRevision(queuedState, readSyncMeta().revision, generation);
    } catch (error) {
      emitStatus(error.code === "SYNC_CONFLICT" ? "conflict" : "error", error.code === "SYNC_CONFLICT" ? "同步冲突" : "同步失败", error.message);
    }
  }, options.immediate ? 0 : 2500);
}

export async function forceUploadCloudState(state) {
  clearTimeout(syncTimer);
  queuedState = null;
  const generation = ++syncGeneration;
  const remote = await fetchCloudState();
  return uploadWithRevision(state, Number(remote?.revision) || 0, generation);
}

export async function forceDownloadCloudState() {
  clearTimeout(syncTimer);
  queuedState = null;
  syncGeneration += 1;
  const remote = await fetchCloudState();
  if (!remote) throw new Error("云端还没有学习记录。");
  writeSyncMeta({ revision: Number(remote.revision) || 0, pending: false, lastSyncedAt: remote.updated_at });
  emitStatus("synced", "已同步", `已下载云端版本 ${remote.revision}`);
  return remote.state_json;
}
