import { getActiveAccountId, getCurrentAccount } from "./accounts.js?v=0.5.6";

const LEGACY_STORAGE_KEY = "cet6-90day-state-v1";
const ACCOUNT_STORAGE_PREFIX = "cet6-90day-state-v2";

export const DEFAULT_STATE = Object.freeze({
  schemaVersion: 1,
  profile: {
    region: "吉林",
    targetScore: 500,
    dailyMode: 130,
    takesOralExam: true,
  },
  completedTasks: {},
  completedDays: {},
  vocabulary: {},
  sentenceProgress: {},
  earTraining: {},
  practiceAttempts: [],
  mockSession: null,
  mockResults: [],
  drafts: {},
  notes: {
    title: "我的六级学习笔记",
    html: "",
    updatedAt: null,
  },
  timers: {},
  studyMinutes: 0,
  lastStudyDate: null,
  lastActivity: null,
  lastExportAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function mergeState(candidate) {
  const base = cloneDefaultState();
  if (!candidate || candidate.schemaVersion !== 1) return base;
  return {
    ...base,
    ...candidate,
    profile: { ...base.profile, ...(candidate.profile || {}) },
    completedTasks: { ...base.completedTasks, ...(candidate.completedTasks || {}) },
    completedDays: { ...base.completedDays, ...(candidate.completedDays || {}) },
    vocabulary: { ...base.vocabulary, ...(candidate.vocabulary || {}) },
    sentenceProgress: { ...base.sentenceProgress, ...(candidate.sentenceProgress || {}) },
    earTraining: { ...base.earTraining, ...(candidate.earTraining || {}) },
    drafts: { ...base.drafts, ...(candidate.drafts || {}) },
    mockSession: candidate.mockSession || null,
    mockResults: Array.isArray(candidate.mockResults) ? candidate.mockResults : [],
    notes: { ...base.notes, ...(candidate.notes || {}) },
    timers: { ...base.timers, ...(candidate.timers || {}) },
  };
}

export function getStateStorageKey(accountId = getActiveAccountId()) {
  return `${ACCOUNT_STORAGE_PREFIX}:${accountId}`;
}

function migrateLegacyGuestState() {
  const guestKey = getStateStorageKey("guest");
  const legacyState = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacyState) return;
  if (!localStorage.getItem(guestKey)) localStorage.setItem(guestKey, legacyState);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function loadState(accountId = getActiveAccountId()) {
  try {
    if (accountId === "guest") migrateLegacyGuestState();
    return mergeState(JSON.parse(localStorage.getItem(getStateStorageKey(accountId))));
  } catch {
    return cloneDefaultState();
  }
}

export function saveState(state, touchUpdatedAt = true, accountId = getActiveAccountId()) {
  if (touchUpdatedAt) state.updatedAt = new Date().toISOString();
  localStorage.setItem(getStateStorageKey(accountId), JSON.stringify(state));
}

export function saveStateForAccount(state, accountId, touchUpdatedAt = true) {
  const snapshot = mergeState(JSON.parse(JSON.stringify(state)));
  saveState(snapshot, touchUpdatedAt, accountId);
  return snapshot;
}

export function exportState(state, account = getCurrentAccount()) {
  const exportedAt = new Date().toISOString();
  state.lastExportAt = exportedAt;
  state.updatedAt = exportedAt;
  saveState(state, false);
  const payload = {
    app: "cet6-90day",
    exportedAt,
    account: {
      username: account.username,
      displayName: account.displayName,
      type: account.type,
    },
    state,
    note: "口语录音等大文件未包含在首版JSON备份中。",
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const accountName = account.username.replace(/[^\p{L}\p{N}_-]+/gu, "-");
  link.download = `cet6-90day-${accountName}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importState(file, accountId = getActiveAccountId()) {
  if (!file || file.size > 8 * 1024 * 1024) {
    throw new Error("备份文件无效或超过8MB。" );
  }
  const text = await file.text();
  const payload = JSON.parse(text);
  if (payload?.app !== "cet6-90day" || payload?.state?.schemaVersion !== 1) {
    throw new Error("这不是受支持的六级训练营备份文件。" );
  }
  const nextState = mergeState(payload.state);
  saveState(nextState, true, accountId);
  return nextState;
}

export function resetState(accountId = getActiveAccountId()) {
  localStorage.removeItem(getStateStorageKey(accountId));
  return cloneDefaultState();
}

export function deleteStateForAccount(accountId) {
  localStorage.removeItem(getStateStorageKey(accountId));
}
