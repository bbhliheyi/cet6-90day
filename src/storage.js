const STORAGE_KEY = "cet6-90day-state-v1";

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
  practiceAttempts: [],
  drafts: {},
  drafts: {},
  notes: {
    title: "我的六级学习笔记",
    html: "",
    updatedAt: null,
  },
  timers: {},
  studyMinutes: 0,
  lastStudyDate: null,
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
    drafts: { ...base.drafts, ...(candidate.drafts || {}) },
    drafts: { ...base.drafts, ...(candidate.drafts || {}) },
    notes: { ...base.notes, ...(candidate.notes || {}) },
    timers: { ...base.timers, ...(candidate.timers || {}) },
  };
}

export function loadState() {
  try {
    return mergeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return cloneDefaultState();
  }
}

export function saveState(state) {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportState(state) {
  const payload = {
    app: "cet6-90day",
    exportedAt: new Date().toISOString(),
    state,
    note: "口语录音等大文件未包含在首版JSON备份中。",
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cet6-90day-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importState(file) {
  if (!file || file.size > 8 * 1024 * 1024) {
    throw new Error("备份文件无效或超过8MB。" );
  }
  const text = await file.text();
  const payload = JSON.parse(text);
  if (payload?.app !== "cet6-90day" || payload?.state?.schemaVersion !== 1) {
    throw new Error("这不是受支持的六级训练营备份文件。" );
  }
  const nextState = mergeState(payload.state);
  saveState(nextState);
  return nextState;
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return cloneDefaultState();
}
