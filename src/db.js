const DB_NAME = "cet6-90day-local";
const DB_VERSION = 1;
const RECORDING_STORE = "recordings";

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("当前浏览器不支持本地录音数据库。"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RECORDING_STORE)) {
        const store = database.createObjectStore(RECORDING_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("无法打开本地数据库。"));
  });
}

export async function saveRecording(recording) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(RECORDING_STORE, "readwrite");
    transaction.objectStore(RECORDING_STORE).put(recording);
    transaction.oncomplete = () => {
      database.close();
      resolve(recording.id);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("录音保存失败。"));
    };
  });
}

function recordingBelongsToAccount(recording, accountId) {
  if (recording.accountId) return recording.accountId === accountId;
  return accountId === "guest";
}

export async function getLatestRecording(kind = null, accountId = "guest") {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(RECORDING_STORE, "readonly");
    const request = transaction.objectStore(RECORDING_STORE).index("createdAt").openCursor(null, "prev");
    request.onsuccess = () => {
      const value = request.result?.value;
      const kindMatches = !kind || value?.kind === kind || (kind === "speaking" && !value?.kind);
      if (!value || (recordingBelongsToAccount(value, accountId) && kindMatches)) {
        database.close();
        resolve(value || null);
        return;
      }
      request.result.continue();
    };
    request.onerror = () => {
      database.close();
      reject(request.error || new Error("读取录音失败。"));
    };
  });
}

export async function getRecordings(kind = null, accountId = "guest", limit = 2, promptId = null) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const recordings = [];
    const transaction = database.transaction(RECORDING_STORE, "readonly");
    const request = transaction.objectStore(RECORDING_STORE).index("createdAt").openCursor(null, "prev");
    request.onsuccess = () => {
      const value = request.result?.value;
      if (!value) {
        database.close();
        resolve(recordings);
        return;
      }
      const kindMatches = !kind || value.kind === kind || (kind === "speaking" && !value.kind);
      const promptMatches = !promptId || value.promptId === promptId;
      if (recordingBelongsToAccount(value, accountId) && kindMatches && promptMatches) recordings.push(value);
      if (recordings.length >= Math.max(1, limit)) {
        database.close();
        resolve(recordings);
        return;
      }
      request.result.continue();
    };
    request.onerror = () => {
      database.close();
      reject(request.error || new Error("读取录音列表失败。"));
    };
  });
}

export async function deleteRecordingsForAccount(accountId) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(RECORDING_STORE, "readwrite");
    const store = transaction.objectStore(RECORDING_STORE);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (recordingBelongsToAccount(cursor.value, accountId)) cursor.delete();
      cursor.continue();
    };
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("账户录音清理失败。"));
    };
  });
}
