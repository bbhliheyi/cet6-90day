const ACCOUNT_INDEX_KEY = "cet6-90day-accounts-v1";
const ACTIVE_ACCOUNT_KEY = "cet6-90day-active-account-v1";
const GUEST_ID = "guest";
const PIN_ITERATIONS = 120_000;

const GUEST_ACCOUNT = Object.freeze({
  id: GUEST_ID,
  username: "guest",
  displayName: "访客",
  type: "guest",
});

function readIndex() {
  try {
    const candidate = JSON.parse(localStorage.getItem(ACCOUNT_INDEX_KEY));
    if (candidate?.schemaVersion !== 1 || !Array.isArray(candidate.accounts)) {
      return { schemaVersion: 1, accounts: [] };
    }
    return {
      schemaVersion: 1,
      accounts: candidate.accounts.filter((account) => account?.id && account?.username && account?.pinHash && account?.pinSalt),
    };
  } catch {
    return { schemaVersion: 1, accounts: [] };
  }
}

function writeIndex(index) {
  localStorage.setItem(ACCOUNT_INDEX_KEY, JSON.stringify(index));
}

function publicAccount(account) {
  if (!account) return null;
  const { pinHash, pinSalt, ...safeAccount } = account;
  return safeAccount;
}

function normalizeUsername(username) {
  return username.trim().toLocaleLowerCase("zh-CN");
}

function validateAccountInput({ username, displayName, password }) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedDisplayName = displayName.trim();
  if (!/^[\p{L}\p{N}_-]{2,24}$/u.test(normalizedUsername)) {
    throw new Error("用户名需为2—24位文字、字母、数字、下划线或短横线。");
  }
  if (normalizedDisplayName.length < 1 || normalizedDisplayName.length > 20) {
    throw new Error("显示名称需为1—20个字符。");
  }
  if (password.length < 6 || password.length > 64) {
    throw new Error("登录口令需为6—64个字符。");
  }
  return { username: normalizedUsername, displayName: normalizedDisplayName, password };
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hashPassword(password, salt) {
  if (!crypto?.subtle) throw new Error("当前浏览器不支持安全口令存储，请升级浏览器后重试。");
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PIN_ITERATIONS },
    keyMaterial,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

function createAccountId() {
  if (crypto?.randomUUID) return `local-${crypto.randomUUID()}`;
  const random = crypto.getRandomValues(new Uint32Array(4));
  return `local-${[...random].map((value) => value.toString(16)).join("")}`;
}

export function listLocalAccounts() {
  return readIndex().accounts.map(publicAccount).sort((left, right) => (right.lastLoginAt || "").localeCompare(left.lastLoginAt || ""));
}

export function getActiveAccountId() {
  const activeId = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  if (!activeId || activeId === GUEST_ID) return GUEST_ID;
  if (readIndex().accounts.some((account) => account.id === activeId)) return activeId;
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, GUEST_ID);
  return GUEST_ID;
}

export function getCurrentAccount() {
  const accountId = getActiveAccountId();
  if (accountId === GUEST_ID) return GUEST_ACCOUNT;
  return publicAccount(readIndex().accounts.find((account) => account.id === accountId)) || GUEST_ACCOUNT;
}

export function setActiveAccount(accountId) {
  if (accountId === GUEST_ID) {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, GUEST_ID);
    return GUEST_ACCOUNT;
  }
  const index = readIndex();
  const account = index.accounts.find((item) => item.id === accountId);
  if (!account) throw new Error("找不到该本机账户。");
  account.lastLoginAt = new Date().toISOString();
  account.updatedAt = account.lastLoginAt;
  writeIndex(index);
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, accountId);
  return publicAccount(account);
}

export async function createLocalAccount(input) {
  const values = validateAccountInput(input);
  const index = readIndex();
  if (index.accounts.some((account) => account.username === values.username)) {
    throw new Error("该用户名已存在，请换一个用户名或直接登录。");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const now = new Date().toISOString();
  const account = {
    id: createAccountId(),
    username: values.username,
    displayName: values.displayName,
    type: "local",
    pinSalt: bytesToBase64(salt),
    pinHash: await hashPassword(values.password, salt),
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };
  index.accounts.push(account);
  writeIndex(index);
  return publicAccount(account);
}

export async function authenticateLocalAccount(accountId, password) {
  const index = readIndex();
  const account = index.accounts.find((item) => item.id === accountId);
  if (!account) throw new Error("找不到该本机账户。");
  const candidateHash = await hashPassword(password, base64ToBytes(account.pinSalt));
  if (candidateHash !== account.pinHash) throw new Error("登录口令不正确。");
  return publicAccount(account);
}

export async function deleteLocalAccount(accountId, password) {
  await authenticateLocalAccount(accountId, password);
  const index = readIndex();
  index.accounts = index.accounts.filter((account) => account.id !== accountId);
  writeIndex(index);
  if (getActiveAccountId() === accountId) localStorage.setItem(ACTIVE_ACCOUNT_KEY, GUEST_ID);
}

export function useGuestAccount() {
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, GUEST_ID);
  return GUEST_ACCOUNT;
}
