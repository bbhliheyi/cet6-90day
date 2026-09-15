import {
  APP_VERSION,
  CORE_SENTENCES,
  EXAM_CONFIG,
  PHASES,
  PRACTICE_CONTENT,
  PREP_TASKS,
  SKILL_LABELS,
  VOCABULARY,
  buildPlan,
  dailyCoreSentences,
} from "./content.js?v=0.9.0";
import { RESOURCE_CATALOG } from "./resources.js?v=0.9.0";
import { EAR_TRAINING_UNITS } from "./ear-training.js?v=0.9.0";
import { MOCK_EXAMS, REAL_EXAM_INDEX } from "./mock-exams.js?v=0.9.0";
import { LESSONS, LESSON_BY_ID as LESSON_LIBRARY, MODULE_ANALYSIS } from "./lessons.js?v=0.9.0";
import { CET_VOCABULARY_DATA } from "./vocabulary-bank.js?v=0.9.0";
import { VOCABULARY_ENRICHMENT_MAP, VOCABULARY_PHRASES } from "./vocabulary-enrichment.js?v=0.9.0";
import { deleteRecordingsForAccount, getLatestRecording, saveRecording } from "./db.js?v=0.9.0";
import {
  authenticateLocalAccount,
  clearCloudAccount,
  createLocalAccount,
  deleteLocalAccount,
  getActiveAccountId,
  getCurrentAccount,
  listLocalAccounts,
  setCloudAccount,
  setActiveAccount,
  useGuestAccount,
} from "./accounts.js?v=0.9.0";
import {
  deleteStateForAccount,
  exportState,
  importState,
  loadState,
  resetState,
  saveState,
  saveStateForAccount,
} from "./storage.js?v=0.9.0";
import {
  forceDownloadCloudState,
  forceUploadCloudState,
  getCloudStatus,
  initializeCloudAuth,
  queueCloudSync,
  reconcileCloudState,
  signInCloud,
  signOutCloud,
  signUpCloud,
  stageCloudMigration,
  subscribeCloudStatus,
} from "./cloud.js?v=0.9.0";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const ROUTE_TITLES = Object.freeze({
  dashboard: "学习首页",
  plan: "90天计划",
  vocabulary: "单词训练",
  review: "错题复盘",
  sentences: "每日核心句",
  eartraining: "每日磨耳朵",
  practice: "专项训练",
  tests: "完整测试",
  lessons: "系统讲解",
  notices: "官方通知",
  notes: "学习笔记",
  resources: "资料中心",
});

const DAILY_MODE_OPTIONS = Object.freeze([15, 30, 60, 130]);
const DAILY_MODE_LABELS = Object.freeze({
  15: "15分钟快速版",
  30: "30分钟基础版",
  60: "60分钟标准版",
  130: "130分钟完整版",
});
const DAILY_TASK_PRIORITIES = Object.freeze({
  exam: 0,
  notice: 1,
  vocabulary: 2,
  listening: 3,
  review: 4,
  reading: 5,
  sentences: 6,
  eartraining: 7,
  plan: 8,
  data: 9,
  writing: 10,
  translation: 10,
  speaking: 11,
});
const DAILY_TASK_WEIGHTS = Object.freeze({
  exam: 520,
  notice: 260,
  vocabulary: 300,
  listening: 170,
  review: 160,
  reading: 130,
  sentences: 100,
  eartraining: 110,
  plan: 190,
  data: 150,
  writing: 80,
  translation: 80,
  speaking: 70,
});

const PLAN = buildPlan();
const ENRICHED_VOCABULARY = new Map();
[...VOCABULARY, ...VOCABULARY_ENRICHMENT_MAP.values()].forEach((entry) => {
  const key = entry.word.toLocaleLowerCase();
  ENRICHED_VOCABULARY.set(key, { ...(ENRICHED_VOCABULARY.get(key) || {}), ...entry });
});
const DATA_VOCABULARY_BANK = CET_VOCABULARY_DATA.map((row, index) => {
  const [word, meaning, frequency, cet6, category, subcategory, alternate] = row;
  const enriched = ENRICHED_VOCABULARY.get(word.toLocaleLowerCase());
  return Object.freeze({
    word,
    meaning: enriched?.meaning || meaning,
    frequency,
    frequencyRank: index + 1,
    cet6: Boolean(cet6) || Boolean(enriched),
    category: category || "综合语境",
    subcategory: subcategory || "",
    alternate: alternate || "",
    pos: enriched?.pos || inferVocabularyPartOfSpeech(word, meaning),
    example: enriched?.example || enriched?.listening || `This report examines how ${word} influences everyday decisions.`,
    collocation: enriched?.collocation || enriched?.collocations || "",
    collocations: enriched?.collocations || enriched?.collocation || "",
    ipa: enriched?.ipa || "",
    root: enriched?.root || "",
    family: enriched?.family || "",
    synonyms: enriched?.synonyms || alternate || "",
    writing: enriched?.writing || "",
    translation: enriched?.translation || "",
    listening: enriched?.listening || "",
    topic: enriched?.topic || category || "综合语境",
    examFocus: enriched?.examFocus || "结合词义、词性和上下文判断，避免只记单一中文释义。",
    enriched: Boolean(enriched),
    isPhrase: false,
    sourceType: enriched?.sourceType || "open-data",
    sourceLabel: enriched?.sourceLabel || "开放四六级词表",
    sourceDetail: enriched?.sourceDetail || "开放数据词表；本站仅补充学习字段，不复制商业题库内容。",
  });
});
const DATA_VOCABULARY_WORDS = new Set(DATA_VOCABULARY_BANK.map((entry) => entry.word.toLocaleLowerCase()));
const ORIGINAL_VOCABULARY_BANK = VOCABULARY.filter((entry) => !DATA_VOCABULARY_WORDS.has(entry.word.toLocaleLowerCase())).map((entry, index) => {
  const enriched = ENRICHED_VOCABULARY.get(entry.word.toLocaleLowerCase());
  return Object.freeze({
    ...entry,
    frequency: 0,
    frequencyRank: CET_VOCABULARY_DATA.length + index + 1,
    cet6: true,
    category: "六级核心表达",
    subcategory: "本站扩充",
    alternate: "",
    ipa: "",
    root: enriched?.root || "",
    family: enriched?.family || "",
    synonyms: enriched?.synonyms || "",
    collocations: enriched?.collocations || enriched?.collocation || entry.collocation || "",
    writing: enriched?.writing || "",
    translation: enriched?.translation || "",
    listening: enriched?.listening || "",
    topic: enriched?.topic || "六级核心表达",
    examFocus: enriched?.examFocus || "结合词义、词性和上下文判断，优先掌握高频搭配。",
    enriched: true,
    isPhrase: false,
    sourceType: "original-modeled",
    sourceLabel: "本站原创精讲词",
    sourceDetail: "依据六级能力要求独立编写，不复制真题、商业题库或付费解析。",
  });
});
const VOCABULARY_BANK = Object.freeze([
  ...DATA_VOCABULARY_BANK,
  ...ORIGINAL_VOCABULARY_BANK,
]);
const PHRASE_VOCABULARY_BANK = Object.freeze(VOCABULARY_PHRASES.map((entry, index) => Object.freeze({
  ...entry,
  frequencyRank: CET_VOCABULARY_DATA.length + VOCABULARY_BANK.length + index + 1,
  root: "",
  family: "",
  synonyms: entry.alternate || "",
  collocations: entry.collocation,
  writing: entry.example,
  translation: entry.meaning,
  listening: entry.example,
  topic: entry.category,
  examFocus: "先理解表达功能，再替换到自己的写作、翻译或口语句子中。",
})));
const VOCABULARY_LIBRARY = Object.freeze([...VOCABULARY_BANK, ...PHRASE_VOCABULARY_BANK]);
let state = loadState();
let currentRoute = "dashboard";
let currentWordIndex = 0;
let activePhase = "all";
let activePracticeModule = "listening";
let activePracticeIndex = 0;
let activeReviewFilter = "all";
let activeLessonId = "vocabulary-method";
let activeEarIndex = 0;
let activeTaskDay = null;
let activeMockExamId = MOCK_EXAMS[0].id;
let activeMockYear = "all";
let activeMockType = "all";
let activeRealExamYear = "all";
let activeRealExamType = "all";
let vocabularyTest = null;
let deferredInstallPrompt = null;
let workspaceTimer = null;
let mediaRecorder = null;
let recordingStream = null;
let recordingContext = null;
let noteSaveTimer = null;
let cloudInitializationError = null;
let selectionContext = null;
let selectionTranslationResult = null;
let selectionRequestId = 0;
let selectionCheckTimer = null;
let vocabularyCardRevealed = false;
let vocabularySpellingResult = null;
let vocabularyPointerStart = null;
let vocabularyBrowserPage = 0;
let forcedVocabularyWord = null;
let vocabularySwipeAt = 0;

const LOCAL_IPA = Object.freeze({
  substantial: "/səbˈstænʃəl/",
  allocate: "/ˈæləkeɪt/",
  anticipate: "/ænˈtɪsəpeɪt/",
  coherent: "/koʊˈhɪrənt/",
  compelling: "/kəmˈpelɪŋ/",
  consecutive: "/kənˈsekjətɪv/",
  controversy: "/ˈkɑːntrəvɜːrsi/",
  diminish: "/dɪˈmɪnɪʃ/",
  diverse: "/daɪˈvɜːrs/",
  elaborate: "/ɪˈlæbəreɪt/",
  encounter: "/ɪnˈkaʊntər/",
  facilitate: "/fəˈsɪləteɪt/",
  feasible: "/ˈfiːzəbəl/",
  fluctuate: "/ˈflʌktʃueɪt/",
  formulate: "/ˈfɔːrmjəleɪt/",
  incentive: "/ɪnˈsentɪv/",
  inevitable: "/ɪnˈevɪtəbəl/",
  inhibit: "/ɪnˈhɪbɪt/",
  innovative: "/ˈɪnəveɪtɪv/",
  legitimate: "/lɪˈdʒɪtəmət/",
  maintain: "/meɪnˈteɪn/",
  mitigate: "/ˈmɪtɪɡeɪt/",
  mutual: "/ˈmjuːtʃuəl/",
  neglect: "/nɪˈɡlekt/",
  perceive: "/pərˈsiːv/",
  persistent: "/pərˈsɪstənt/",
  preliminary: "/prɪˈlɪməneri/",
  profound: "/prəˈfaʊnd/",
  reluctant: "/rɪˈlʌktənt/",
  reinforce: "/ˌriːɪnˈfɔːrs/",
  resilient: "/rɪˈzɪliənt/",
  retain: "/rɪˈteɪn/",
  shift: "/ʃɪft/",
  specify: "/ˈspesɪfaɪ/",
  sustainable: "/səˈsteɪnəbəl/",
  transform: "/trænsˈfɔːrm/",
  underlying: "/ˌʌndərˈlaɪɪŋ/",
  valid: "/ˈvælɪd/",
  widespread: "/ˈwaɪdspred/",
  yield: "/jiːld/",
});

function persist() {
  saveState(state);
  queueCloudSync(state);
}

function recordActivity(route, label, detail = "", metadata = {}) {
  state.lastActivity = {
    route,
    label,
    detail,
    ...metadata,
    updatedAt: new Date().toISOString(),
  };
}

function todayInChina() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function chinaDateFromIso(isoDate) {
  return new Date(`${isoDate}T12:00:00+08:00`);
}

function getCurrentPlanDay() {
  const start = chinaDateFromIso(PLAN[0].date).getTime();
  const today = chinaDateFromIso(todayInChina()).getTime();
  return Math.floor((today - start) / 86_400_000) + 1;
}

function formatToday() {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function countdownDays(targetIso) {
  return Math.max(0, Math.ceil((new Date(targetIso).getTime() - Date.now()) / 86_400_000));
}

function taskKey(day, taskId) {
  return day > 0 ? `day-${day}:${taskId}` : `prep:${taskId}`;
}

function taskIsComplete(day, taskId) {
  return Boolean(state.completedTasks[taskKey(day, taskId)]);
}

function taskCompletionSummary(day, tasks) {
  const completed = tasks.filter((item) => taskIsComplete(day, item.id));
  return {
    completed: completed.length,
    total: tasks.length,
    minutes: completed.reduce((total, item) => total + item.minutes, 0),
    totalMinutes: tasks.reduce((total, item) => total + item.minutes, 0),
    percent: tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0,
  };
}

function selectedDailyMode() {
  const mode = Number(state.profile?.dailyMode);
  return DAILY_MODE_OPTIONS.includes(mode) ? mode : 130;
}

function dailyTaskPriority(item) {
  return DAILY_TASK_PRIORITIES[item.module] ?? 20;
}

function sortedDailyTasks(tasks) {
  return tasks
    .map((item, index) => ({ item, index }))
    .sort((left, right) => dailyTaskPriority(left.item) - dailyTaskPriority(right.item) || left.index - right.index)
    .map(({ item }) => item);
}

function recommendedTasksForMode(context, mode = selectedDailyMode()) {
  if (!context.tasks.length) return [];
  const sorted = sortedDailyTasks(context.tasks);
  if (mode >= 130) return sorted;
  const fixedExam = sorted.find((item) => item.module === "exam" && item.minutes >= 90);
  if (fixedExam) return [fixedExam];

  let best = [];
  let bestScore = -1;
  let bestMinutes = 0;
  const combinations = 2 ** sorted.length;
  for (let mask = 1; mask < combinations; mask += 1) {
    const candidate = [];
    let minutes = 0;
    let score = 0;
    for (let index = 0; index < sorted.length; index += 1) {
      if (!(mask & (1 << index))) continue;
      const item = sorted[index];
      candidate.push(item);
      minutes += item.minutes;
      score += DAILY_TASK_WEIGHTS[item.module] ?? 50;
    }
    if (minutes > mode) continue;
    score += minutes * 3;
    if (score > bestScore || (score === bestScore && minutes > bestMinutes)) {
      best = candidate;
      bestScore = score;
      bestMinutes = minutes;
    }
  }
  return best.length ? best : [sorted[0]];
}

function completionTiersForTasks(tasks) {
  const sorted = sortedDailyTasks(tasks);
  if (!sorted.length) return { basic: [], standard: [], complete: [] };
  const fixedExam = sorted.find((item) => item.module === "exam" && item.minutes >= 90);
  if (fixedExam) {
    return {
      basic: [fixedExam],
      standard: sorted,
      complete: sorted,
    };
  }

  const basic = [];
  const append = (item) => {
    if (item && !basic.includes(item)) basic.push(item);
  };
  append(sorted.find((item) => item.module === "vocabulary"));
  append(sorted.find((item) => ["listening", "reading"].includes(item.module)));
  append(sorted.find((item) => item.module === "review"));
  for (const item of sorted) {
    if (basic.length >= Math.min(3, sorted.length)) break;
    append(item);
  }

  const standard = [...basic];
  for (const item of sorted) {
    if (standard.length >= Math.min(5, sorted.length)) break;
    if (!standard.includes(item)) standard.push(item);
  }
  return { basic, standard, complete: sorted };
}

function tierIsComplete(day, tasks) {
  return tasks.length > 0 && tasks.every((item) => taskIsComplete(day, item.id));
}

function primaryDailyTarget(context) {
  const recommended = recommendedTasksForMode(context);
  const recommendedTask = recommended.find((item) => !taskIsComplete(context.day, item.id));
  if (recommendedTask) return { task: recommendedTask, stage: "recommended", recommended };
  const challengeTask = sortedDailyTasks(context.tasks).find((item) => !taskIsComplete(context.day, item.id));
  if (challengeTask) return { task: challengeTask, stage: "challenge", recommended };
  return { task: null, stage: "complete", recommended };
}

function recalculateDay(day) {
  if (day < 1 || day > 90) return;
  const standardTasks = completionTiersForTasks(PLAN[day - 1].tasks).standard;
  const complete = tierIsComplete(day, standardTasks);
  if (complete) state.completedDays[day] ||= new Date().toISOString();
  else delete state.completedDays[day];
}

function reconcileCompletedDays() {
  const before = JSON.stringify(state.completedDays || {});
  PLAN.forEach((planDay) => recalculateDay(planDay.day));
  return JSON.stringify(state.completedDays || {}) !== before;
}

function toggleTask(day, taskData, checked) {
  const key = taskKey(day, taskData.id);
  if (checked && !state.completedTasks[key]) {
    state.completedTasks[key] = {
      module: taskData.module,
      minutes: taskData.minutes,
      completedAt: new Date().toISOString(),
    };
    state.studyMinutes += taskData.minutes;
    state.lastStudyDate = todayInChina();
  } else if (!checked && state.completedTasks[key]) {
    state.studyMinutes = Math.max(0, state.studyMinutes - (state.completedTasks[key].minutes || taskData.minutes));
    delete state.completedTasks[key];
  }
  recalculateDay(day);
  persist();
  renderGlobalProgress();
  renderDashboard();
  if (currentRoute === "plan") renderPlan();
}

function completedDayCount() {
  return Object.keys(state.completedDays).length;
}

function calculateStreak() {
  const dates = new Set(
    Object.values(state.completedTasks)
      .map((item) => item.completedAt?.slice(0, 10))
      .filter(Boolean),
  );
  if (!dates.size) return 0;
  let cursor = chinaDateFromIso(todayInChina());
  if (!dates.has(todayInChina())) cursor = new Date(cursor.getTime() - 86_400_000);
  let streak = 0;
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return streak;
}

function completedThisWeekCount() {
  const today = chinaDateFromIso(todayInChina());
  const weekday = today.getUTCDay() || 7;
  const weekStart = new Date(today.getTime() - (weekday - 1) * 86_400_000);
  const weekEnd = new Date(weekStart.getTime() + 6 * 86_400_000);
  return PLAN.filter((item) => {
    const date = chinaDateFromIso(item.date);
    return date >= weekStart && date <= weekEnd && state.completedDays[item.day];
  }).length;
}

function renderGlobalProgress() {
  const completed = completedDayCount();
  const percent = Math.round((completed / 90) * 100);
  $("#sidebar-progress-label").textContent = `${percent}%`;
  $("#sidebar-progress-bar").style.width = `${percent}%`;
  $("#sidebar-progress-detail").textContent = `标准达标 ${completed} / 90 天`;
}

function refreshProgressViews() {
  renderGlobalProgress();
  renderDashboard();
  if (currentRoute === "plan") renderPlan();
}

function moduleRouteForTask(item) {
  if (!item) return "plan";
  if (["vocabulary", "sentences", "eartraining", "notes"].includes(item.module)) return item.module;
  if (["listening", "reading", "writing", "translation", "speaking"].includes(item.module)) return "practice";
  if (item.module === "review") return "review";
  if (["notice", "exam"].includes(item.module)) return item.id === "mock" ? "tests" : "notices";
  if (item.module === "data") return "data";
  return "plan";
}

function taskContextForDay(day) {
  if (day === 0) return { day: 0, title: "考前准备期", tasks: PREP_TASKS };
  if (day >= 1 && day <= 90) return { day, title: PLAN[day - 1].title, tasks: PLAN[day - 1].tasks };
  return currentTaskContext();
}

function openTask(item, day) {
  if (!item) return;
  activeTaskDay = Number.isInteger(day) && day >= 0 && day <= 90 ? day : null;
  const route = moduleRouteForTask(item);
  if (route === "data") {
    renderAccountChrome();
    $("#data-dialog").showModal();
    return;
  }
  if (route === "practice") {
    activePracticeModule = ["listening", "reading", "writing", "translation", "speaking"].includes(item.module) ? item.module : "listening";
    activePracticeIndex = 0;
  }
  if (route === "plan" && day >= 1 && day <= 90) {
    activePhase = PLAN[day - 1].phase;
    navigate("plan", { focusDay: day });
    return;
  }
  navigate(route);
}

function renderContinueLearning(context) {
  const container = $("#continue-learning");
  const primaryButton = $("#today-primary-action");
  if (!container) return;
  const target = primaryDailyTarget(context);
  if (!context.tasks.length) {
    container.hidden = true;
    container.innerHTML = "";
    primaryButton.textContent = "查看学习数据";
    return;
  }
  const mode = selectedDailyMode();
  if (!target.task) {
    container.hidden = false;
    container.innerHTML = `<span class="continue-kicker">TODAY COMPLETE</span><strong>今天的全部任务已经完成</strong><small>可以查看完成层级、学习数据和本周薄弱点。</small><span class="continue-estimate">已完成</span>`;
    primaryButton.textContent = "查看今日成果";
    return;
  }
  const activity = state.lastActivity;
  const route = moduleRouteForTask(target.task);
  const sameActivity = activity?.route === route
    && (route !== "practice" || !activity.practiceModule || activity.practiceModule === target.task.module);
  const label = target.stage === "challenge" ? "当前方案已完成 · 完整挑战" : sameActivity ? "继续当前任务" : "推荐下一项";
  const detail = sameActivity ? `${target.task.detail} · 可从上次位置继续` : target.task.detail;
  container.hidden = false;
  container.innerHTML = `<span class="continue-kicker">${escapeHtml(label)}</span><strong>${escapeHtml(target.task.title)}</strong><small>${escapeHtml(detail)}</small><span class="continue-estimate">${target.task.minutes}分钟</span>`;
  primaryButton.textContent = target.stage === "challenge" ? "继续完整挑战" : sameActivity ? "继续今天的学习" : `开始${DAILY_MODE_LABELS[mode]}`;
}

function renderBackupReminder() {
  const container = $("#backup-reminder");
  if (!container) return;
  const hasLearningData = Object.keys(state.completedTasks || {}).length
    || Object.keys(state.vocabulary || {}).length
    || (state.savedVocabulary || []).length
    || Object.keys(state.sentenceProgress || {}).length
    || Object.keys(state.earTraining || {}).length
    || (state.practiceAttempts || []).length
    || state.mockSession
    || (state.mockResults || []).length
    || state.notes?.html;
  const lastExportAt = state.lastExportAt ? new Date(state.lastExportAt).getTime() : 0;
  const reminderBaseline = lastExportAt || new Date(state.createdAt).getTime();
  const hasChanges = !lastExportAt || (state.updatedAt && new Date(state.updatedAt).getTime() > lastExportAt);
  const ageDays = Math.floor((Date.now() - reminderBaseline) / 86_400_000);
  if (!hasLearningData || !hasChanges || ageDays < 7) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }
  const lastText = lastExportAt ? `${ageDays}天前` : "尚未导出过";
  container.hidden = false;
  container.innerHTML = `<div><p class="eyebrow">LOCAL DATA</p><strong>建议备份学习记录</strong><p>进度、笔记和错题只保存在当前浏览器；上次备份：${lastText}。</p></div><button class="outline-button" id="backup-reminder-action">立即导出</button>`;
  $("#backup-reminder-action").addEventListener("click", () => {
    exportState(state);
    renderBackupReminder();
  });
}

function navigate(route, options = {}) {
  hideSelectionTranslator(false);
  if (mediaRecorder?.state === "recording") stopRecording(recordingContext?.startId, recordingContext?.stopId);
  stopWorkspaceTimer();
  if (!ROUTE_TITLES[route]) route = "dashboard";
  currentRoute = route;
  $$("[data-view]").forEach((view) => view.classList.toggle("is-active", view.dataset.view === route));
  $$("[data-route]").forEach((item) => item.classList.toggle("is-active", item.dataset.route === route));
  $("#page-title").textContent = ROUTE_TITLES[route];
  document.title = `${ROUTE_TITLES[route]} · 大学英语六级90天训练营`;
  document.body.classList.remove("menu-open");
  if (location.hash !== `#${route}`) history.replaceState(null, "", `#${route}`);
  window.scrollTo({ top: 0, behavior: options.instant ? "auto" : "smooth" });

  if (route === "dashboard") renderDashboard();
  if (route === "plan") renderPlan(options.focusDay ?? (options.focusToday ? getCurrentPlanDay() : null));
  if (route === "vocabulary") renderVocabulary();
  if (route === "review") renderReviewCenter();
  if (route === "sentences") renderSentences();
  if (route === "eartraining") renderEarTraining();
  if (route === "practice") renderPracticeWorkspace();
  if (route === "tests") renderMockExam();
  if (route === "lessons") renderLessons();
  if (route === "notes") loadNoteEditor();
  if (route === "resources") renderResourceCatalog();
}

function currentTaskContext() {
  const day = getCurrentPlanDay();
  if (day < 1) return { day: 0, title: "考前准备期", tasks: PREP_TASKS };
  if (day > 90) return { day: 91, title: "本周期训练已结束", tasks: [] };
  return { day, title: PLAN[day - 1].title, tasks: PLAN[day - 1].tasks };
}

function renderDailyModeSelector(context) {
  const panel = $("#daily-mode-panel");
  const summary = $("#daily-mode-summary");
  if (!panel || !summary) return;
  const mode = selectedDailyMode();
  $$('[data-daily-mode]', panel).forEach((button) => {
    const active = Number(button.dataset.dailyMode) === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (!context.tasks.length) {
    summary.textContent = "本周期已结束，时长模式将在下一轮计划中继续使用。";
    return;
  }
  const recommended = recommendedTasksForMode(context, mode);
  const minutes = recommended.reduce((total, item) => total + item.minutes, 0);
  const fixedExam = recommended.length === 1 && recommended[0].module === "exam" && recommended[0].minutes >= 90 && mode < 130;
  summary.textContent = fixedExam
    ? `今天是完整测试日，试卷需要连续${recommended[0].minutes}分钟；系统不会把完整测试拆成无效的小片段。`
    : `${DAILY_MODE_LABELS[mode]}推荐${recommended.length}项，共${minutes}分钟；完成后仍可继续完整挑战。`;
}

function taskCardMarkup(item, context, currentTaskId, recommended) {
  const checked = taskIsComplete(context.day, item.id);
  const current = item.id === currentTaskId;
  return `<article class="task-card ${checked ? "is-complete" : ""} ${current ? "is-current-task" : ""}">
    <label class="task-toggle" title="${checked ? "取消完成" : "标记完成"}">
      <input type="checkbox" data-dashboard-task="${escapeHtml(item.id)}" aria-label="${checked ? "取消完成" : "标记完成"}：${escapeHtml(item.title)}" ${checked ? "checked" : ""} />
      <span class="task-check">✓</span>
    </label>
    <button type="button" class="task-open-button" data-dashboard-open-task="${escapeHtml(item.id)}">
      <span class="task-content">
        <small>${current ? '<b class="task-current-chip">当前</b> · ' : ""}${recommended ? "今日推荐 · " : "完整挑战 · "}${escapeHtml(SKILL_LABELS[item.module] || item.module)} · ${item.minutes}分钟</small>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.detail)}</span>
      </span>
      <span class="task-enter">${checked ? "查看记录" : "进入训练"} →</span>
    </button>
  </article>`;
}

function renderTodayTasks(context) {
  const container = $("#today-tasks");
  if (!context.tasks.length) {
    container.innerHTML = `<article class="empty-state"><strong>本周期已结束</strong><p>请查看官方通知确认下一次考试安排，并导出本周期学习数据。</p></article>`;
    return;
  }
  const mode = selectedDailyMode();
  const recommended = recommendedTasksForMode(context, mode);
  const recommendedIds = new Set(recommended.map((item) => item.id));
  const target = primaryDailyTarget(context);
  const orderForDisplay = (tasks) => [...tasks].sort((left, right) => Number(taskIsComplete(context.day, left.id)) - Number(taskIsComplete(context.day, right.id)) || dailyTaskPriority(left) - dailyTaskPriority(right));
  const recommendedDisplay = orderForDisplay(recommended);
  const remainingDisplay = orderForDisplay(context.tasks.filter((item) => !recommendedIds.has(item.id)));
  const recommendedSummary = taskCompletionSummary(context.day, recommended);
  const recommendedMinutes = recommended.reduce((total, item) => total + item.minutes, 0);
  const recommendationTitle = mode >= 130 ? "今日完整挑战" : `${DAILY_MODE_LABELS[mode]}推荐顺序`;
  container.innerHTML = `<section class="today-task-section">
    <div class="recommended-task-heading">
      <div><p class="eyebrow">NEXT ACTIONS</p><h3>${escapeHtml(recommendationTitle)}</h3><span>按顺序完成即可，不需要重新决定学什么。</span></div>
      <strong>${recommendedSummary.completed}/${recommendedSummary.total}项 · ${recommendedSummary.minutes}/${recommendedMinutes}分钟</strong>
    </div>
    <div class="task-grid">${recommendedDisplay.map((item) => taskCardMarkup(item, context, target.task?.id, true)).join("")}</div>
  </section>${remainingDisplay.length ? `<details class="optional-task-list" ${target.stage === "challenge" ? "open" : ""}>
    <summary><span>查看其余${remainingDisplay.length}项完整挑战</span><small>当前时长方案完成后再继续，不影响今日达标记录。</small></summary>
    <div class="task-grid">${remainingDisplay.map((item) => taskCardMarkup(item, context, target.task?.id, false)).join("")}</div>
  </details>` : ""}`;

  $$('[data-dashboard-task]', container).forEach((input) => {
    input.addEventListener("change", () => {
      const taskData = context.tasks.find((item) => item.id === input.dataset.dashboardTask);
      toggleTask(context.day, taskData, input.checked);
    });
  });
  $$('[data-dashboard-open-task]', container).forEach((button) => button.addEventListener("click", () => {
    openTask(context.tasks.find((item) => item.id === button.dataset.dashboardOpenTask), context.day);
  }));
}

function skillScores() {
  const modules = ["vocabulary", "sentences", "eartraining", "listening", "reading", "writing", "translation", "speaking"];
  const taskCounts = Object.values(state.completedTasks).reduce((counts, item) => {
    counts[item.module] = (counts[item.module] || 0) + 1;
    return counts;
  }, {});
  const attemptScores = state.practiceAttempts.reduce((scores, attempt) => {
    scores[attempt.module] ||= [];
    scores[attempt.module].push(attempt.score);
    return scores;
  }, {});
  const sentenceRecords = Object.values(state.sentenceProgress || {});
  const earRecords = Object.values(state.earTraining || {});
  const progressScores = {
    sentences: sentenceRecords.length
      ? sentenceRecords.reduce((total, record) => total + (record.read ? 30 : 0) + (record.recall ? 40 : 0) + (record.apply ? 30 : 0), 0) / sentenceRecords.length
      : 0,
    eartraining: earRecords.length
      ? earRecords.reduce((total, record) => total + ((record.blind ? 1 : 0) + (record.gist ? 1 : 0) + Math.min(1, (record.dictation || 0) / 2) + (record.shadow ? 1 : 0) + (record.retell ? 1 : 0)) * 20, 0) / earRecords.length
      : 0,
  };
  return modules.map((module) => {
    const scores = attemptScores[module] || [];
    const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const activityScore = Math.min(45, (taskCounts[module] || 0) * 5) + average * 0.55;
    return { module, score: Math.round(clamp(Math.max(activityScore, progressScores[module] || 0), 0, 100)) };
  });
}

function renderSkillBars() {
  $("#skill-bars").innerHTML = skillScores()
    .map(({ module, score }) => `<div class="skill-row"><span>${SKILL_LABELS[module]}</span><div class="skill-track"><i style="width:${score}%"></i></div><strong>${score}%</strong></div>`)
    .join("");
}

function renderDashboard() {
  const context = currentTaskContext();
  const mode = selectedDailyMode();
  const recommended = recommendedTasksForMode(context, mode);
  const recommendedMinutes = recommended.reduce((total, item) => total + item.minutes, 0);
  $("#exam-countdown").textContent = countdownDays(EXAM_CONFIG.writtenExam);
  $("#today-date").textContent = formatToday();
  if (context.day === 0) {
    $("#cycle-status").textContent = "准备期";
    $("#today-hero-title").textContent = "准备好目标、设备和学习数据";
    $("#today-guidance").textContent = `${DAILY_MODE_LABELS[mode]}推荐${recommended.length}项，共${recommendedMinutes}分钟；先完成最重要的一项即可开始。`;
  } else if (context.day <= 90) {
    $("#cycle-status").textContent = `DAY ${context.day}`;
    $("#today-hero-title").textContent = `DAY ${context.day} · ${context.title}`;
    $("#today-guidance").textContent = `${PLAN[context.day - 1].phaseLabel} · ${DAILY_MODE_LABELS[mode]}推荐${recommended.length}项，共${recommendedMinutes}分钟。`;
  } else {
    $("#cycle-status").textContent = "已结束";
    $("#today-hero-title").textContent = "本周期训练已经完成";
    $("#today-guidance").textContent = "本周期90天计划已经结束，请导出数据并查看最新官方通知。";
  }
  renderDailyModeSelector(context);
  renderTodayTasks(context);
  renderContinueLearning(context);
  renderTodayStandard(context);
  renderCatchUpPanel();
  renderBackupReminder();
  renderSkillBars();
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  const weeklyMinutes = Object.values(state.completedTasks)
    .filter((item) => new Date(item.completedAt).getTime() >= sevenDaysAgo)
    .reduce((sum, item) => sum + (item.minutes || 0), 0);
  $("#weekly-duration").textContent = `${weeklyMinutes} 分钟`;
  renderWeaknessReport();
}

function overduePlanDays() {
  const currentDay = getCurrentPlanDay();
  if (currentDay <= 1) return [];
  return PLAN
    .filter((planDay) => planDay.day < Math.min(currentDay, 91))
    .map((planDay) => ({ planDay, progress: planDayProgress(planDay) }))
    .filter(({ planDay }) => !state.completedDays[planDay.day]);
}

function renderCatchUpPanel() {
  const container = $("#catch-up-panel");
  if (!container) return;
  const overdue = overduePlanDays();
  if (!overdue.length) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }
  const currentDay = getCurrentPlanDay();
  container.hidden = false;
  container.innerHTML = `<div class="catch-up-heading"><div><p class="eyebrow">CATCH-UP · 保留记录</p><h3>有${overdue.length}天尚未达到标准完成</h3><p>不需要重置90天计划，也不建议把两天内容压缩成一晚。今天继续DAY ${currentDay}，之后每天补回一项核心任务。</p></div><span class="catch-up-count">${overdue.length}天</span></div><div class="catch-up-list">${overdue.slice(0, 3).map(({ planDay, progress }) => `<div class="catch-up-row"><div><strong>DAY ${planDay.day} · ${escapeHtml(planDay.title)}</strong><small>${escapeHtml(planDay.dateLabel)} · 已完成 ${progress.completed}/${progress.total} 项 · 标准要求 ${progress.standardTotal} 项</small></div><button class="outline-button" data-catch-up-day="${planDay.day}">补做这一天 →</button></div>`).join("")}</div>${overdue.length > 3 ? `<small class="catch-up-more">还有${overdue.length - 3}天未达标，进入完整计划查看。</small>` : ""}<div class="catch-up-actions"><button class="primary-button" data-catch-up-today>先做今天 DAY ${currentDay}</button><button class="text-button" data-route="plan">查看全部补做计划 →</button></div>`;
  $$('[data-catch-up-day]', container).forEach((button) => button.addEventListener("click", () => {
    const day = Number(button.dataset.catchUpDay);
    activeTaskDay = day;
    activePhase = PLAN[day - 1].phase;
    navigate("plan", { focusDay: day });
  }));
  $("[data-catch-up-today]", container)?.addEventListener("click", () => {
    activeTaskDay = null;
    activePhase = currentDay >= 1 && currentDay <= 90 ? PLAN[currentDay - 1].phase : "all";
    navigate("plan", { focusToday: true });
  });
  $("[data-route='plan']", container)?.addEventListener("click", () => {
    activeTaskDay = null;
    navigate("plan");
  });
}

function renderTodayStandard(context) {
  const container = $("#today-standard");
  if (!container) return;
  if (!context.tasks.length) {
    container.innerHTML = `<div class="card-heading"><div><p class="eyebrow">TODAY'S STANDARD</p><h3>本周期任务已结束</h3></div></div><p class="muted">请以最新官方通知为准，导出本周期数据并等待下一轮计划。</p>`;
    return;
  }
  const mode = selectedDailyMode();
  const recommended = recommendedTasksForMode(context, mode);
  const summary = taskCompletionSummary(context.day, recommended);
  const recommendedMinutes = recommended.reduce((total, item) => total + item.minutes, 0);
  const phase = context.day > 0 && context.day <= 90 ? PLAN[context.day - 1].phaseLabel : "准备期";
  const tiers = completionTiersForTasks(context.tasks);
  const tierRows = [
    ["basic", "基础达标", "先保住学习连续性", tiers.basic],
    ["standard", "标准达标", "计入90天完成进度", tiers.standard],
    ["complete", "完整挑战", "完成当天全部训练", tiers.complete],
  ];
  container.innerHTML = `<div class="card-heading"><div><p class="eyebrow">TODAY'S PROGRESS · ${context.day > 0 ? `DAY ${context.day}` : "PREP"}</p><h3>${escapeHtml(DAILY_MODE_LABELS[mode])}</h3></div><strong class="standard-percent">${summary.percent}%</strong></div><div class="standard-progress"><i style="width:${summary.percent}%"></i></div><p class="standard-summary">当前方案已完成 <b>${summary.completed}/${summary.total}</b> 项 · ${summary.minutes}/${recommendedMinutes} 分钟 · 阶段：${phase}</p><div class="completion-tier-grid">${tierRows.map(([id, label, description, tasks]) => {
    const tierSummary = taskCompletionSummary(context.day, tasks);
    const complete = tierIsComplete(context.day, tasks);
    return `<div class="completion-tier ${complete ? "is-complete" : ""} ${id === "standard" ? "is-primary" : ""}"><div><span>${escapeHtml(label)}</span><strong>${complete ? "已达标" : `${tierSummary.completed}/${tierSummary.total}项`}</strong></div><p>${escapeHtml(description)}</p><small>${escapeHtml(tasks.map((item) => item.title).join(" · "))}</small></div>`;
  }).join("")}</div><p class="standard-note">基础达标适合时间紧张的日子；标准达标会计入90天进度；完整挑战用于有充足时间时完成全部任务。任何已完成项目都会保留。</p>`;
}

function renderWeaknessReport() {
  const container = $("#weakness-report");
  if (!container) return;
  const attempts = state.practiceAttempts || [];
  if (!attempts.length) {
    container.innerHTML = `<div class="card-heading"><div><p class="eyebrow">GAP ANALYSIS</p><h3>查缺补漏</h3></div><span class="muted">等待数据</span></div><p class="muted">完成一次专项题或磨耳朵主旨题后，这里会按模块平均表现、任务完成度和错误记录列出前三个补漏重点。当前不伪造分数。</p>`;
    return;
  }
  const grouped = attempts.reduce((result, attempt) => {
    result[attempt.module] ||= [];
    result[attempt.module].push(attempt.score);
    return result;
  }, {});
  const rows = Object.entries(grouped).map(([module, scores]) => {
    const average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    const analysis = MODULE_ANALYSIS[module] || { title: SKILL_LABELS[module] || module, threshold: 60, action: "重新完成一组训练并记录错误原因。" };
    return { module, average, analysis };
  }).sort((left, right) => left.average - right.average).slice(0, 3);
  container.innerHTML = `<div class="card-heading"><div><p class="eyebrow">GAP ANALYSIS</p><h3>查缺补漏</h3></div><div class="card-heading-actions"><span class="muted">前三项</span><button class="text-button" data-route="review">打开错题中心 →</button></div></div><div class="weakness-list">${rows.map(({ module, average, analysis }) => `<div class="weakness-row"><div><strong>${escapeHtml(analysis.title)}</strong><small>最近${(grouped[module] || []).length}次平均 ${average}% · 参考线 ${analysis.threshold}%</small><p>${escapeHtml(analysis.action)}</p></div><button class="text-button" data-open-module="${module === "eartraining" ? "eartraining" : module === "sentences" ? "sentences" : "practice"}">去补漏 →</button></div>`).join("")}</div><p class="standard-note">这是本站训练数据的趋势提示，不等同于正式考试成绩；每周至少复盘一次错因。</p>`;
  $$('[data-open-module]', container).forEach((button) => button.addEventListener("click", () => navigate(button.dataset.openModule)));
  $(`[data-route="review"]`, container)?.addEventListener("click", () => navigate("review"));
}

function reviewVocabularyItems() {
  return Object.entries(state.vocabulary || [])
    .map(([word, record]) => {
      const history = Array.isArray(record.history) ? record.history : [];
      const lastError = [...history].reverse().find((item) => item.result !== "known");
      const latestReview = history.at(-1);
      if (latestReview?.result === "known" || (!lastError && !["forgot", "unsure"].includes(record.status))) return null;
      const entry = vocabularyLibraryEntries().find((item) => item.word === word);
      if (!entry) return null;
      return {
        kind: "vocabulary",
        id: word,
        title: word,
        detail: `${entry.meaning} · ${lastError?.result === "forgot" ? "最近标记为忘记" : "最近标记为模糊"}`,
        date: lastError?.reviewedAt || record.lastReviewedAt || "",
        score: lastError?.result === "forgot" ? 0 : 50,
        entry,
      };
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.date || 0) - new Date(left.date || 0));
}

function reviewPracticeItems() {
  const attempts = (state.practiceAttempts || []).filter((attempt) => Number(attempt.score) < 80);
  return attempts
    .map((attempt) => {
      const content = PRACTICE_CONTENT[attempt.module] || [];
      const item = content.find((candidate) => candidate.id === attempt.id);
      const title = item?.title || (attempt.module === "mock" ? `完整测试 ${attempt.id}` : `${SKILL_LABELS[attempt.module] || attempt.module}训练`);
      return {
        kind: "practice",
        id: attempt.id,
        module: attempt.module,
        title,
        detail: `${attempt.questionType || (attempt.module === "mock" ? "完整测试" : "专项训练")} · 得分 ${attempt.score}%`,
        date: attempt.completedAt || "",
        score: Number(attempt.score),
      };
    })
    .sort((left, right) => new Date(right.date || 0) - new Date(left.date || 0));
}

function renderReviewCenter() {
  const container = $("#review-center");
  if (!container) return;
  const vocabularyErrors = reviewVocabularyItems();
  const practiceErrors = reviewPracticeItems();
  const allItems = [...vocabularyErrors, ...practiceErrors].sort((left, right) => new Date(right.date || 0) - new Date(left.date || 0));
  const items = activeReviewFilter === "all"
    ? allItems
    : activeReviewFilter === "vocabulary"
      ? vocabularyErrors
      : practiceErrors.filter((item) => item.module === activeReviewFilter);
  const counts = {
    all: allItems.length,
    vocabulary: vocabularyErrors.length,
    listening: practiceErrors.filter((item) => item.module === "listening").length,
    reading: practiceErrors.filter((item) => item.module === "reading").length,
    writing: practiceErrors.filter((item) => item.module === "writing").length,
    translation: practiceErrors.filter((item) => item.module === "translation").length,
    speaking: practiceErrors.filter((item) => item.module === "speaking").length,
    mock: practiceErrors.filter((item) => item.module === "mock").length,
  };
  const filters = [
    ["all", "全部"],
    ["vocabulary", "错词"],
    ["listening", "听力"],
    ["reading", "阅读"],
    ["writing", "写作"],
    ["translation", "翻译"],
    ["speaking", "口语"],
    ["mock", "完整测试"],
  ];
  container.innerHTML = `<div class="review-summary"><div><span>待复盘项目</span><strong>${allItems.length}</strong></div><div><span>错词</span><strong>${vocabularyErrors.length}</strong></div><div><span>低于80分训练</span><strong>${practiceErrors.length}</strong></div></div><div class="review-filters">${filters.map(([id, label]) => `<button class="review-filter ${activeReviewFilter === id ? "is-active" : ""}" data-review-filter="${id}">${label}<b>${counts[id]}</b></button>`).join("")}</div>${items.length ? `<div class="review-item-list">${items.slice(0, 60).map((item) => `<article class="review-item"><div><span class="review-item-type">${item.kind === "vocabulary" ? "词汇" : escapeHtml(SKILL_LABELS[item.module] || item.module)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.detail)}</p><small>${item.date ? new Date(item.date).toLocaleString("zh-CN") : "最近训练"}</small></div><button class="outline-button" data-review-kind="${item.kind}" data-review-id="${escapeHtml(item.id)}" data-review-module="${escapeHtml(item.module || "")}">${item.kind === "vocabulary" ? "复习此词" : "再次训练"} →</button></article>`).join("")}</div><p class="standard-note">按最近错误优先复盘；完成后再做一次同类训练，才能确认是否真正改善。</p>` : `<div class="review-empty"><strong>当前没有待复盘项目</strong><p>继续完成今天的训练。低于80分的专项结果和忘记/模糊的词会自动出现在这里。</p><button class="primary-button" data-route="today">开始今日任务</button></div>`}`;
  $$('[data-review-filter]', container).forEach((button) => button.addEventListener("click", () => {
    activeReviewFilter = button.dataset.reviewFilter;
    renderReviewCenter();
  }));
  $(`[data-route="today"]`, container)?.addEventListener("click", () => navigate("dashboard"));
  $$('[data-review-kind]', container).forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.reviewKind === "vocabulary") {
      forcedVocabularyWord = button.dataset.reviewId;
      vocabularyCardRevealed = false;
      vocabularySpellingResult = null;
      navigate("vocabulary");
      return;
    }
    const module = button.dataset.reviewModule;
    if (module === "mock") {
      activeMockExamId = button.dataset.reviewId;
      navigate("tests");
      return;
    }
    if (module === "eartraining") {
      activeEarIndex = Math.max(0, EAR_TRAINING_UNITS.findIndex((unit) => unit.id === button.dataset.reviewId));
      navigate("eartraining");
      return;
    }
    activePracticeModule = module;
    activePracticeIndex = Math.max(0, (PRACTICE_CONTENT[module] || []).findIndex((item) => item.id === button.dataset.reviewId));
    navigate("practice");
  }));
}

function renderPhaseTabs() {
  const tabs = [{ id: "all", label: "全部90天", start: 1, end: 90 }, ...PHASES];
  $("#phase-tabs").innerHTML = tabs
    .map((phase) => `<button class="phase-tab ${activePhase === phase.id ? "is-active" : ""}" data-phase="${phase.id}">${phase.label}<small>DAY ${phase.start}—${phase.end}</small></button>`)
    .join("");
  $$('[data-phase]').forEach((button) => {
    button.addEventListener("click", () => {
      activePhase = button.dataset.phase;
      renderPlan();
    });
  });
}

function planDayProgress(planDay) {
  const completed = planDay.tasks.filter((item) => taskIsComplete(planDay.day, item.id)).length;
  const standardTasks = completionTiersForTasks(planDay.tasks).standard;
  const standardCompleted = standardTasks.filter((item) => taskIsComplete(planDay.day, item.id)).length;
  return {
    completed,
    total: planDay.tasks.length,
    standardCompleted,
    standardTotal: standardTasks.length,
    standardComplete: tierIsComplete(planDay.day, standardTasks),
  };
}

function renderPlan(focusDay = null) {
  $("#plan-completed").textContent = completedDayCount();
  $("#plan-streak").textContent = calculateStreak();
  $("#plan-weekly").textContent = completedThisWeekCount();
  renderPhaseTabs();
  const currentDay = getCurrentPlanDay();
  const filtered = activePhase === "all" ? PLAN : PLAN.filter((item) => item.phase === activePhase);
  $("#plan-list").innerHTML = filtered
    .map((planDay) => {
      const progress = planDayProgress(planDay);
      const complete = progress.completed === progress.total;
      const standardComplete = progress.standardComplete;
      const current = planDay.day === currentDay;
      const focused = planDay.day === focusDay;
      return `<details class="plan-day ${current ? "is-current" : ""} ${standardComplete ? "is-complete" : ""}" id="day-${planDay.day}" ${current || focused ? "open" : ""}>
        <summary>
          <span class="day-number" style="--phase-color:${planDay.phaseColor}">DAY ${planDay.day}</span>
          <span class="day-summary"><small>${planDay.dateLabel} · ${planDay.phaseLabel}</small><strong>${planDay.title}</strong></span>
          <span class="day-time">${planDay.estimatedMinutes}分钟</span>
          <span class="day-progress">${complete ? "完整完成" : standardComplete ? "标准达标" : `${progress.standardCompleted}/${progress.standardTotal}标准`}</span>
        </summary>
        <div class="plan-day-body">
          <p>${planDay.objective}</p>
          <div class="plan-task-list">${planDay.tasks
            .map((item) => `<div class="plan-task ${taskIsComplete(planDay.day, item.id) ? "is-complete" : ""}">
              <label class="plan-task-toggle" title="${taskIsComplete(planDay.day, item.id) ? "取消完成" : "标记完成"}"><input type="checkbox" data-plan-day="${planDay.day}" data-plan-task="${escapeHtml(item.id)}" aria-label="${taskIsComplete(planDay.day, item.id) ? "取消完成" : "标记完成"}：DAY ${planDay.day} ${escapeHtml(item.title)}" ${taskIsComplete(planDay.day, item.id) ? "checked" : ""} /><span>✓</span></label>
              <button type="button" class="plan-task-open" data-plan-open-day="${planDay.day}" data-plan-open-task="${escapeHtml(item.id)}"><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(SKILL_LABELS[item.module])} · ${item.minutes}分钟 · ${escapeHtml(item.detail)}</small></span><b>进入 →</b></button>
            </div>`)
            .join("")}</div>
          <div class="assessment-line"><strong>当日验收</strong><span>${planDay.assessment} · 完成标准任务即可计入90天进度，其余任务可继续挑战。</span></div>
        </div>
      </details>`;
    })
    .join("");

  $$('[data-plan-task]').forEach((input) => {
    input.addEventListener("change", () => {
      const day = Number(input.dataset.planDay);
      const taskData = PLAN[day - 1].tasks.find((item) => item.id === input.dataset.planTask);
      toggleTask(day, taskData, input.checked);
    });
  });
  $$('[data-plan-open-task]').forEach((button) => button.addEventListener("click", () => {
    const day = Number(button.dataset.planOpenDay);
    openTask(PLAN[day - 1].tasks.find((item) => item.id === button.dataset.planOpenTask), day);
  }));

  if (focusDay >= 1 && focusDay <= 90) {
    requestAnimationFrame(() => $("#day-" + focusDay)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }
}

function vocabularyRecord(word) {
  return state.vocabulary[word] || { level: 0, status: "new", lapses: 0, reviews: 0, gradedReviews: 0, correctReviews: 0, correctStreak: 0, history: [], nextReviewAt: null };
}

function inferVocabularyPartOfSpeech(word, meaning) {
  if (/地(?:；|、|$)/.test(meaning) || word.endsWith("ly")) return "adv.";
  if (/的(?:；|、|$)/.test(meaning) || /(able|ible|al|ful|ic|ive|less|ous|ent|ant|ary|ory)$/.test(word)) return "adj.";
  if (/(tion|sion|ment|ness|ity|ance|ence|ship|ism|ist|er|or)$/.test(word)) return "n.";
  if (/(ize|ise|ify|ate)$/.test(word)) return "v.";
  return "v./n.";
}

function vocabularySettings() {
  state.vocabularySettings ||= { book: "cet6", mode: "smart", dailyNew: 30 };
  return state.vocabularySettings;
}

function vocabularyBookEntries() {
  const { book } = vocabularySettings();
  if (book === "phrases") return PHRASE_VOCABULARY_BANK;
  if (book === "all") return VOCABULARY_LIBRARY;
  if (book === "high-frequency") return VOCABULARY_BANK.filter((entry) => entry.frequency >= 40);
  return VOCABULARY_BANK
    .filter((entry) => entry.cet6)
    .sort((left, right) => Number(right.enriched) - Number(left.enriched) || left.frequencyRank - right.frequencyRank);
}

function vocabularyLibraryEntries() {
  return VOCABULARY_LIBRARY;
}

function vocabularyTodaySummary(entries = vocabularyBookEntries()) {
  const today = todayInChina();
  const reviewedEntries = entries.filter((entry) => vocabularyRecord(entry.word).lastReviewedAt?.startsWith(today));
  const newToday = reviewedEntries.filter((entry) => vocabularyRecord(entry.word).firstReviewAt?.startsWith(today)).length;
  return {
    reviewedToday: reviewedEntries.length - newToday,
    newToday,
    completedToday: reviewedEntries.length,
  };
}

function vocabularyQueue(entries = vocabularyBookEntries()) {
  const now = Date.now();
  const summary = vocabularyTodaySummary(entries);
  const newRemaining = Math.max(0, Number(vocabularySettings().dailyNew) - summary.newToday);
  const due = entries
    .filter((entry) => {
      const record = vocabularyRecord(entry.word);
      return record.status !== "new" && (!record.nextReviewAt || new Date(record.nextReviewAt).getTime() <= now);
    })
    .sort((left, right) => (vocabularyRecord(left.word).nextReviewAt || "").localeCompare(vocabularyRecord(right.word).nextReviewAt || ""));
  const fresh = entries.filter((entry) => vocabularyRecord(entry.word).status === "new").slice(0, newRemaining);
  return [...due, ...fresh];
}

function currentVocabularyEntry() {
  if (forcedVocabularyWord) {
    const forced = vocabularyLibraryEntries().find((entry) => entry.word === forcedVocabularyWord);
    if (forced) return forced;
    forcedVocabularyWord = null;
  }
  const queue = vocabularyQueue();
  if (!queue.length) return null;
  currentWordIndex = clamp(currentWordIndex, 0, queue.length - 1);
  return queue[currentWordIndex];
}

function vocabularyModeForEntry(entry) {
  const selected = vocabularySettings().mode;
  if (selected !== "smart") return selected;
  const record = vocabularyRecord(entry.word);
  if (record.status === "new") return "meaning";
  return ["context", "listening", "chinese"][record.reviews % 3];
}

function vocabularyModeLabel(mode) {
  return ({ meaning: "看词回忆", context: "例句填空", listening: "听音拼写", chinese: "看义想词" })[mode] || "智能混合";
}

function vocabularyIpa(entry) {
  return entry.ipa || LOCAL_IPA[entry.word.toLocaleLowerCase()] || "";
}

function vocabularyExamPoint(entry) {
  if (entry.examFocus) return entry.examFocus;
  const frequencyPoint = entry.frequency >= 40
    ? `高频层：相关考试文本统计出现 ${entry.frequency} 次，优先掌握语境义。`
    : entry.cet6
      ? "六级重点标记词：重点掌握词义、词形和同义替换。"
      : "大纲基础词：避免熟词生义和听音辨词失分。";
  const skillPoint = entry.pos.startsWith("adj")
    ? "阅读注意态度与性质替换，写作用于升级描述。"
    : entry.pos.startsWith("adv")
      ? "听力和阅读注意逻辑、程度与态度变化。"
      : entry.pos.startsWith("n")
        ? "阅读定位主题概念，翻译注意单复数和冠词。"
        : "阅读注意动作替换，翻译和写作注意谓语搭配。";
  return `${frequencyPoint}${skillPoint}`;
}

function vocabularyCloze(entry) {
  const escapedWord = entry.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const replaced = entry.example.replace(new RegExp(`\\b${escapedWord}\\b`, "i"), "______");
  return replaced === entry.example ? `In this passage, “______” expresses the idea of “${entry.meaning}”.` : replaced;
}

function vocabularyEnrichmentMarkup(entry) {
  const rows = [
    entry.root ? ["词根联想", entry.root] : null,
    entry.family ? ["词族", entry.family] : null,
    entry.synonyms ? ["同义替换", entry.synonyms] : null,
    entry.collocations ? ["高频搭配", entry.collocations] : null,
    entry.writing ? ["写作可用", entry.writing] : null,
    entry.translation ? ["翻译可用", entry.translation] : null,
    entry.listening ? ["听力语境", entry.listening] : null,
  ].filter(Boolean);
  if (!rows.length) return "";
  return `<details class="word-enrichment"><summary>展开词根、词族与产出用法</summary><div class="word-enrichment-grid">${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><p>${escapeHtml(value)}</p></div>`).join("")}</div><small class="word-source-note">${escapeHtml(entry.sourceLabel || "本站词汇学习字段")}</small></details>`;
}

function vocabularyAccuracy(entries = vocabularyBookEntries()) {
  const totals = entries.reduce((summary, entry) => {
    const record = vocabularyRecord(entry.word);
    const history = (record.history || []).filter((item) => ["known", "forgot", "unsure"].includes(item.result));
    summary.graded += Number.isFinite(record.gradedReviews) ? record.gradedReviews : history.length;
    summary.correct += Number.isFinite(record.correctReviews) ? record.correctReviews : history.filter((item) => item.result === "known").length;
    return summary;
  }, { graded: 0, correct: 0 });
  return Math.round((totals.correct / Math.max(1, totals.graded)) * 100);
}

function vocabularyReviewStreak() {
  const dates = new Set(Object.values(state.vocabulary || {}).flatMap((record) => (record.history || []).map((item) => item.reviewedAt?.slice(0, 10)).filter(Boolean)));
  let streak = 0;
  const cursor = new Date(`${todayInChina()}T12:00:00+08:00`);
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderVocabularyStats() {
  const entries = vocabularyBookEntries();
  const records = entries.map((entry) => vocabularyRecord(entry.word));
  const known = records.filter((record) => record.status === "known").length;
  const unsure = records.filter((record) => ["unsure", "forgot"].includes(record.status)).length;
  const fresh = entries.length - known - unsure;
  const rate = Math.round((known / Math.max(1, entries.length)) * 100);
  const summary = vocabularyTodaySummary(entries);
  const queue = vocabularyQueue(entries);
  const due = queue.filter((entry) => vocabularyRecord(entry.word).status !== "new").length;
  const newRemaining = queue.length - due;
  const target = summary.completedToday + due + newRemaining;
  const accuracy = vocabularyAccuracy(entries);
  $("#vocab-today-count").textContent = summary.completedToday;
  $("#vocab-today-target").textContent = `/ ${target}`;
  $("#vocab-today-bar").style.width = `${Math.min(100, (summary.completedToday / Math.max(1, target)) * 100)}%`;
  $("#vocab-reviewed-today").textContent = summary.reviewedToday;
  $("#vocab-new-today").textContent = summary.newToday;
  $("#vocab-review-due").textContent = due;
  $("#vocab-new-remaining").textContent = newRemaining;
  $("#vocab-book-total").textContent = entries.length;
  $("#vocab-accuracy").textContent = `${accuracy}%`;
  $("#vocab-streak").textContent = `${vocabularyReviewStreak()}天`;
  $("#vocab-master-rate").textContent = `${rate}%`;
  $("#known-count").textContent = known;
  $("#unsure-count").textContent = unsure;
  $("#new-count").textContent = fresh;
  $("#vocab-donut").style.setProperty("--progress", `${rate * 3.6}deg`);
}

function renderVocabulary() {
  const entry = currentVocabularyEntry();
  const card = $("#word-card");
  const settings = vocabularySettings();
  card.classList.remove("swipe-left", "swipe-right", "swipe-forward");
  card.style.transform = "";
  $("#vocab-book-select").value = settings.book;
  $("#vocab-daily-new").value = String(settings.dailyNew);
  $$('[data-vocab-mode]').forEach((button) => button.classList.toggle("is-selected", button.dataset.vocabMode === settings.mode));
  renderVocabularyStats();
  if (!entry) {
    card.dataset.status = "complete";
    card.innerHTML = `<div class="vocab-session-complete"><span>✓</span><h3>今日词汇计划已完成</h3><p>待复习词已经清空，新词额度也已完成。可以调整“每日新词”，或浏览词表查缺补漏。</p><button type="button" class="primary-button" data-vocab-browse>浏览海量词表</button></div>`;
    renderMemoryProfile(null);
    renderSavedVocabulary();
    renderVocabularyBrowser();
    return;
  }
  const queue = vocabularyQueue();
  const queuePosition = queue.findIndex((item) => item.word === entry.word);
  const isForcedEntry = forcedVocabularyWord === entry.word && queuePosition < 0;
  const record = vocabularyRecord(entry.word);
  const mode = vocabularyModeForEntry(entry);
  const prompt = mode === "context"
    ? `<p class="word-label">根据例句回忆单词</p><h3 class="word-context-prompt">${escapeHtml(vocabularyCloze(entry))}</h3><p class="word-pos">提示：${escapeHtml(entry.meaning)}</p>`
    : mode === "listening"
      ? `<p class="word-label">听音拼写</p><button type="button" class="vocab-listen-button" data-vocab-speak>🔊</button><form class="vocab-spelling-form" id="vocab-spelling-form"><input id="vocab-spelling-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="输入听到的单词" /><button class="outline-button" type="submit">检查拼写</button></form>${vocabularySpellingResult ? `<p class="spelling-result ${vocabularySpellingResult.correct ? "is-correct" : "is-wrong"}">${vocabularySpellingResult.correct ? "拼写正确" : `正确拼写：${escapeHtml(entry.word)}`}</p>` : ""}`
      : mode === "chinese"
        ? `<p class="word-label">看中文回忆英文</p><h3 class="word-meaning-prompt">${escapeHtml(entry.meaning)}</h3><p class="word-pos">${escapeHtml(entry.pos)} · ${escapeHtml(entry.category)}</p>`
        : `<p class="word-label">看词回忆</p><h3>${escapeHtml(entry.word)}</h3><p class="word-pos">${escapeHtml(entry.pos)}</p>`;
  const revealedWord = mode === "meaning" ? "" : `<h4>${escapeHtml(entry.word)}</h4>`;
  card.dataset.status = record.status;
  card.classList.toggle("is-revealed", vocabularyCardRevealed);
  card.innerHTML = `<div class="word-card-top"><span>${isForcedEntry ? "词表浏览" : `${queuePosition + 1} / ${queue.length}`} · ${record.status === "new" ? "新词" : "复习"}</span><div><span class="vocab-mode-badge">${settings.mode === "smart" ? `智能 · ${vocabularyModeLabel(mode)}` : vocabularyModeLabel(mode)}</span><button class="icon-button" type="button" data-vocab-speak aria-label="朗读单词">🔊</button></div></div><div class="word-main">${prompt}${!vocabularyCardRevealed ? `<button class="reveal-button" type="button" data-vocab-reveal>${mode === "listening" ? "显示答案" : "点击翻面"}</button>` : `<div class="word-answer">${revealedWord}<strong>${escapeHtml(entry.meaning)}</strong>${vocabularyIpa(entry) ? `<span class="word-ipa">${escapeHtml(vocabularyIpa(entry))}</span>` : ""}<p>${escapeHtml(entry.example)}</p><small>${entry.collocations ? `搭配：${escapeHtml(entry.collocations)} · ` : ""}${entry.enriched ? "本站原创学习字段" : "开放词表语境"}</small><div class="exam-point-box"><span>${entry.isPhrase ? "六级产出能力点" : "真题能力点"}</span><strong>${entry.cet6 ? "六级重点" : "大纲词"} · ${escapeHtml(entry.topic || "综合语境")}</strong><p>${escapeHtml(vocabularyExamPoint(entry))}</p></div>${vocabularyEnrichmentMarkup(entry)}<button class="tap-next-hint" type="button" data-vocab-next-default>再点一次进入下一个 →</button></div>`}</div><div class="word-actions"><button class="memory-button forgot" type="button" data-memory="forgot">← 忘记 / 左滑</button><button class="memory-button unsure" type="button" data-memory="unsure">模糊 / 点击继续</button><button class="memory-button known" type="button" data-memory="known">掌握 / 右滑 →</button></div><div class="word-swipe-hint">点击翻面，再次点击继续 · 左滑忘记 · 右滑掌握</div>`;
  renderMemoryProfile(entry);
  renderSavedVocabulary();
  renderVocabularyBrowser();
}

function renderVocabularyBrowser() {
  const container = $("#vocab-browser-results");
  const count = $("#vocab-search-count");
  const more = $("#vocab-load-more");
  if (!container || !count || !more) return;
  const query = normalizeSelectionText($("#vocab-search")?.value || "").toLocaleLowerCase();
  const scope = $("#vocab-browser-scope")?.value || "current";
  const status = $("#vocab-browser-status")?.value || "all";
  const topicSelect = $("#vocab-browser-topic");
  const selectedTopic = topicSelect?.value || "all";
  const sourceEntries = scope === "all" ? vocabularyLibraryEntries() : vocabularyBookEntries();
  const topics = [...new Set(sourceEntries.map((entry) => entry.topic || entry.category || "综合语境"))].sort((left, right) => left.localeCompare(right, "zh-CN"));
  if (topicSelect) {
    const currentTopic = topicSelect.value;
    topicSelect.innerHTML = `<option value="all">全部主题</option>${topics.map((topic) => `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`).join("")}`;
    topicSelect.value = topics.includes(currentTopic) ? currentTopic : "all";
  }
  const effectiveTopic = topicSelect?.value || "all";
  const now = Date.now();
  const matchesStatus = (entry) => {
    const record = vocabularyRecord(entry.word);
    if (status === "due") return record.status !== "new" && (!record.nextReviewAt || new Date(record.nextReviewAt).getTime() <= now);
    if (status === "reviewed") return (record.reviews || 0) > 0;
    return status === "all" || record.status === status;
  };
  const entries = sourceEntries.filter((entry) => {
    const searchFields = [entry.word, entry.meaning, entry.category, entry.subcategory, entry.alternate, entry.root, entry.family, entry.synonyms, entry.collocations, entry.writing, entry.translation, entry.listening, entry.topic];
    return (!query || searchFields.some((value) => String(value || "").toLocaleLowerCase().includes(query)))
      && (effectiveTopic === "all" || (entry.topic || entry.category || "综合语境") === effectiveTopic)
      && matchesStatus(entry);
  });
  const visible = entries.slice(0, (vocabularyBrowserPage + 1) * 50);
  count.textContent = `${entries.length} 个结果`;
  more.hidden = visible.length >= entries.length;
  container.innerHTML = visible.map((entry) => {
    const record = vocabularyRecord(entry.word);
    const statusLabel = record.status === "new" ? "未学习" : record.status === "known" ? "已掌握" : record.status === "forgot" ? "易忘" : "待巩固";
    return `<button type="button" class="vocab-browser-item" data-vocab-open-word="${escapeHtml(entry.word)}"><span><strong>${escapeHtml(entry.word)}</strong><small>${entry.isPhrase ? "搭配" : escapeHtml(entry.pos)} · ${escapeHtml(entry.topic || entry.category || "综合语境")}${entry.cet6 ? " · 六级重点" : ""}</small></span><span><b>${escapeHtml(entry.meaning)}</b><small>${entry.frequencyRank ? `词频序位 #${entry.frequencyRank} · ` : ""}${statusLabel}${entry.enriched ? " · 有扩展讲解" : ""}</small></span></button>`;
  }).join("") || `<div class="saved-vocabulary-empty"><strong>没有匹配词条</strong><span>尝试搜索词根、搭配，或切换“搜索全部词库”。</span></div>`;
}

function renderMemoryProfile(entry = currentVocabularyEntry()) {
  const container = $("#memory-profile");
  const stage = $("#memory-stage");
  if (!container || !stage) return;
  if (!entry) {
    stage.textContent = "已完成";
    container.innerHTML = `<p class="muted">今日队列已清空。新的复习会根据记忆间隔自动出现。</p>`;
    return;
  }
  const record = vocabularyRecord(entry.word);
  const level = record.level || 0;
  const intervals = [1, 3, 7, 14, 30];
  const statusLabels = { new: "新词", forgot: "易忘", unsure: "模糊", known: "已掌握" };
  const retention = Math.round(clamp(35 + level * 12 + (record.correctStreak || 0) * 4 - (record.lapses || 0) * 8, 0, 95));
  const history = (record.history || []).slice(-30);
  stage.textContent = statusLabels[record.status] || "新词";
  container.innerHTML = `<div class="memory-grid"><div><span>当前词</span><strong>${escapeHtml(entry.word)}</strong></div><div><span>记忆级别</span><strong>${level}/${intervals.length}</strong></div><div><span>连续答对</span><strong>${record.correctStreak || 0} 次</strong></div><div><span>遗忘次数</span><strong>${record.lapses || 0} 次</strong></div></div><div class="memory-retention"><div><span>本站训练估算保持率</span><strong>${retention}%</strong></div><div class="progress-track"><span style="width:${retention}%"></span></div></div><div class="memory-history"><span>最近${history.length}次复习</span><div>${history.length ? history.map((item) => `<i class="${item.result === "known" ? "is-known" : item.result === "unsure" ? "is-unsure" : "is-forgot"}" title="${item.result === "known" ? "掌握" : item.result === "unsure" ? "模糊" : "忘记"} · ${new Date(item.reviewedAt).toLocaleDateString("zh-CN")}"></i>`).join("") : "尚无复习记录"}</div></div><p class="muted">上次复习：${record.lastReviewedAt ? new Date(record.lastReviewedAt).toLocaleString("zh-CN") : "尚未复习"}<br />下次复习：${record.nextReviewAt ? new Date(record.nextReviewAt).toLocaleString("zh-CN") : "完成一次复习后安排"}</p><small class="memory-disclaimer">间隔：${intervals.join(" / ")}天；保持率是本站根据复习行为的估算，不等同科学测量。</small>`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function normalizeSelectionText(value = "") {
  return String(value).replace(/[\t\r\n ]+/g, " ").trim();
}

function selectionElement(node) {
  if (!node) return null;
  return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}

function selectionIsAllowed(range) {
  const element = selectionElement(range.commonAncestorContainer);
  if (!element) return false;
  if (element.closest("#selection-translator, input, textarea, select, [contenteditable=\"true\"]")) return false;
  return Boolean(element.closest("body"));
}

function selectionRectangle(range) {
  const rect = range.getBoundingClientRect();
  if (rect.width || rect.height) return rect;
  const clientRect = range.getClientRects()[0];
  return clientRect || { top: 80, bottom: 100, left: 20, right: 20, width: 0, height: 0 };
}

function selectionWordLookup(text) {
  const candidate = normalizeSelectionText(text).replace(/^[^A-Za-z]+|[^A-Za-z'’\-]+$/g, "");
  return /^[A-Za-z]+(?:['’\-][A-Za-z]+)*$/.test(candidate) ? candidate : "";
}

function selectionIsSingleWord(text) {
  return Boolean(selectionWordLookup(text));
}

function localTranslationForSelection(text) {
  const normalized = normalizeSelectionText(text);
  const lower = normalized.toLocaleLowerCase();
  const sentence = CORE_SENTENCES.find((item) => normalizeSelectionText(item.english).toLocaleLowerCase() === lower);
  if (sentence) {
    return {
      text: normalized,
      translation: sentence.chinese,
      ipa: "",
      partOfSpeech: "核心句",
      explanation: `${sentence.note} ${sentence.writingUse}`,
      example: sentence.english,
      source: sentence.sourceLabel,
    };
  }
  const wordLookup = selectionWordLookup(normalized).toLocaleLowerCase();
  const entry = vocabularyLibraryEntries().find((item) => item.word.toLocaleLowerCase() === wordLookup);
  if (entry) {
    return {
      text: normalized,
      translation: entry.meaning,
      ipa: entry.ipa || LOCAL_IPA[entry.word.toLocaleLowerCase()] || "",
      partOfSpeech: entry.pos,
        explanation: `${entry.cet6 ? "六级重点词" : "四六级大纲词"}：结合语境掌握 ${entry.word} 的常用义${entry.collocations ? "和搭配" : "、词形与同义替换"}。`,
      example: entry.example,
        source: entry.enriched ? (entry.sourceLabel || "本站原创词汇训练库") : "开放四六级词表 · CC BY-NC-SA 4.0",
    };
  }
  const phraseEntry = VOCABULARY_LIBRARY.find((item) => item.word.toLocaleLowerCase() === lower || item.collocation?.toLocaleLowerCase() === lower || item.collocations?.toLocaleLowerCase() === lower);
  if (phraseEntry) {
    return {
      text: normalized,
      translation: phraseEntry.meaning,
      ipa: "",
      partOfSpeech: `${phraseEntry.pos} · 固定搭配`,
      explanation: `这是词汇 ${phraseEntry.word} 的高频搭配，建议连同例句一起记忆。`,
      example: phraseEntry.example,
      source: "本站原创词汇训练库",
    };
  }
  return null;
}

async function fetchJsonWithTimeout(url, timeout = 7000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

async function onlineTranslationForSelection(text) {
  const normalized = normalizeSelectionText(text);
  const translationPromise = fetchJsonWithTimeout(`https://api.mymemory.translated.net/get?${new URLSearchParams({ q: normalized, langpair: "en|zh-CN" })}`);
  const dictionaryPromise = selectionIsSingleWord(normalized)
    ? fetchJsonWithTimeout(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(selectionWordLookup(normalized))}`)
    : Promise.resolve(null);
  const [translationResponse, dictionaryResponse] = await Promise.allSettled([translationPromise, dictionaryPromise]);
  const translated = translationResponse.status === "fulfilled"
    ? translationResponse.value?.responseData?.translatedText?.trim()
    : "";
  const dictionaryEntry = dictionaryResponse.status === "fulfilled" ? dictionaryResponse.value?.[0] : null;
  const meaning = dictionaryEntry?.meanings?.find((item) => item.definitions?.length);
  const definition = meaning?.definitions?.[0];
  if (!translated && !definition?.definition) throw new Error("在线翻译服务暂时不可用");
  return {
    text: normalized,
    translation: translated || "暂未获取中文翻译",
    ipa: dictionaryEntry?.phonetic || dictionaryEntry?.phonetics?.find((item) => item.text)?.text || "",
    partOfSpeech: meaning?.partOfSpeech || (selectionIsSingleWord(normalized) ? "单词" : "短语/句子"),
    explanation: definition?.definition ? `英英释义：${definition.definition}` : "建议结合上下文理解，不要只记一个中文义项。",
    example: definition?.example || "",
    source: selectionIsSingleWord(normalized) ? "在线词典 + 在线翻译（仅发送当前选中文本）" : "在线翻译（仅发送当前选中文本）",
  };
}

function selectionPosition() {
  if (!selectionContext) return;
  const popup = $("#selection-translator");
  if (!popup) return;
  const rect = selectionRectangle(selectionContext.range);
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const popupRect = popup.getBoundingClientRect();
  const width = popupRect.width || Math.min(420, viewportWidth - 24);
  const left = clamp(rect.left + rect.width / 2 - width / 2, 12, Math.max(12, viewportWidth - width - 12));
  const topBelow = rect.bottom + 12;
  const top = topBelow + popupRect.height <= viewportHeight - 10 || rect.top < popupRect.height + 24
    ? Math.min(topBelow, viewportHeight - popupRect.height - 10)
    : rect.top - popupRect.height - 12;
  popup.style.left = `${Math.max(12, left)}px`;
  popup.style.top = `${Math.max(10, top)}px`;
}

function hideSelectionTranslator(clearSelection = true) {
  const popup = $("#selection-translator");
  if (popup) popup.hidden = true;
  selectionContext = null;
  selectionTranslationResult = null;
  selectionRequestId += 1;
  if (clearSelection) window.getSelection()?.removeAllRanges();
}

function renderSelectionToolbar(message = "") {
  const popup = $("#selection-translator");
  if (!popup || !selectionContext) return;
  popup.hidden = false;
  popup.innerHTML = `<div class="selection-translator-head"><span>选区翻译</span><button type="button" class="selection-close" data-selection-action="close" aria-label="关闭">×</button></div><div class="selection-translator-selected">${escapeHtml(selectionContext.text)}</div><div class="selection-translator-actions"><button type="button" class="primary-button" data-selection-action="translate">翻译</button><button type="button" class="outline-button" data-selection-action="speak">朗读</button></div>${message ? `<p class="selection-translator-hint">${escapeHtml(message)}</p>` : ""}`;
  selectionPosition();
}

function renderSelectionLoading() {
  const popup = $("#selection-translator");
  if (!popup || !selectionContext) return;
  popup.hidden = false;
  popup.innerHTML = `<div class="selection-translator-head"><span>正在翻译</span><button type="button" class="selection-close" data-selection-action="close" aria-label="关闭">×</button></div><div class="selection-translator-selected">${escapeHtml(selectionContext.text)}</div><div class="selection-translator-loading"><i></i><span>正在整理词义、音标和讲解……</span></div>`;
  selectionPosition();
}

function selectionResultIsSaved(result = selectionTranslationResult) {
  return Boolean(result && state.savedVocabulary?.some((item) => savedVocabularyKey(item.text) === savedVocabularyKey(result.text)));
}

function renderSelectionResult(notice = "") {
  const popup = $("#selection-translator");
  const result = selectionTranslationResult;
  if (!popup || !selectionContext || !result) return;
  const saved = selectionResultIsSaved(result);
  popup.hidden = false;
  popup.innerHTML = `<div class="selection-translator-head"><span>选区翻译结果</span><button type="button" class="selection-close" data-selection-action="close" aria-label="关闭">×</button></div><div class="selection-translator-selected">${escapeHtml(result.text)}</div><div class="selection-translator-result"><strong>${escapeHtml(result.translation)}</strong><dl><div><dt>音标</dt><dd>${escapeHtml(result.ipa || "句子/短语请使用朗读，不单独标注音标")}</dd></div><div><dt>词性</dt><dd>${escapeHtml(result.partOfSpeech || "—")}</dd></div></dl><p><b>讲解：</b>${escapeHtml(result.explanation || "结合上下文理解并复述。")}</p>${result.example ? `<p><b>例句：</b>${escapeHtml(result.example)}</p>` : ""}<small class="selection-translator-source">来源：${escapeHtml(result.source || "本站本地词库")}</small></div><div class="selection-translator-actions"><button type="button" class="outline-button" data-selection-action="speak">🔊 朗读</button><button type="button" class="${saved ? "saved-button" : "primary-button"}" data-selection-action="save-vocab">${saved ? "✓ 已在生词本" : "保存到生词本"}</button><button type="button" class="outline-button" data-selection-action="save-note">保存到学习笔记</button></div>${notice ? `<p class="selection-translator-success">${escapeHtml(notice)}</p>` : ""}<p class="selection-translator-privacy">在线兜底只发送当前选中的文字，不会自动上传整篇文章或教材。</p>`;
  selectionPosition();
}

function renderSelectionError(message) {
  const popup = $("#selection-translator");
  if (!popup || !selectionContext) return;
  popup.hidden = false;
  popup.innerHTML = `<div class="selection-translator-head"><span>翻译暂不可用</span><button type="button" class="selection-close" data-selection-action="close" aria-label="关闭">×</button></div><div class="selection-translator-selected">${escapeHtml(selectionContext.text)}</div><p class="selection-translator-error">${escapeHtml(message)}</p><div class="selection-translator-actions"><button type="button" class="primary-button" data-selection-action="translate">重试翻译</button><button type="button" class="outline-button" data-selection-action="speak">朗读</button></div>`;
  selectionPosition();
}

async function translateCurrentSelection() {
  if (!selectionContext) return;
  const requestId = ++selectionRequestId;
  const local = localTranslationForSelection(selectionContext.text);
  renderSelectionLoading();
  try {
    const result = local || await onlineTranslationForSelection(selectionContext.text);
    if (requestId !== selectionRequestId || !selectionContext) return;
    selectionTranslationResult = result;
    renderSelectionResult();
  } catch (error) {
    if (requestId !== selectionRequestId || !selectionContext) return;
    renderSelectionError(local ? "本地词库结果暂时无法展开，请稍后重试。" : `当前无可用在线翻译。${error.message || "请检查网络后重试。"}`);
  }
}

function savedVocabularyKey(text) {
  return normalizeSelectionText(text).toLocaleLowerCase();
}

function saveCurrentSelectionToVocabulary() {
  if (!selectionTranslationResult) return;
  state.savedVocabulary ||= [];
  const result = selectionTranslationResult;
  const key = savedVocabularyKey(result.text);
  const now = new Date().toISOString();
  const existing = state.savedVocabulary.find((item) => savedVocabularyKey(item.text) === key);
  if (existing) {
    Object.assign(existing, { ...result, updatedAt: now });
  } else {
    state.savedVocabulary.unshift({ id: crypto.randomUUID?.() || `saved-${Date.now()}-${Math.random().toString(16).slice(2)}`, ...result, reviewStatus: "new", createdAt: now, updatedAt: now });
  }
  recordActivity("vocabulary", `保存生词：${result.text}`, result.translation, { selection: result.text });
  persist();
  renderSavedVocabulary();
  renderSelectionResult("已保存到我的生词本");
}

function translationNoteHtml(result) {
  return `<aside class="translation-note"><p><strong>选区翻译</strong><span>${escapeHtml(new Date().toLocaleString("zh-CN"))}</span></p><p><b>英文：</b>${escapeHtml(result.text)}</p><p><b>翻译：</b>${escapeHtml(result.translation)}</p>${result.ipa ? `<p><b>音标：</b>${escapeHtml(result.ipa)}</p>` : ""}<p><b>词性：</b>${escapeHtml(result.partOfSpeech || "—")}</p><p><b>讲解：</b>${escapeHtml(result.explanation || "结合上下文理解并复述。")}</p>${result.example ? `<p><b>例句：</b>${escapeHtml(result.example)}</p>` : ""}<small>来源：${escapeHtml(result.source || "本站本地词库")}</small></aside>`;
}

function saveCurrentSelectionToNotes() {
  if (!selectionTranslationResult) return;
  const result = selectionTranslationResult;
  state.notes ||= { title: "我的六级学习笔记", html: "", updatedAt: null };
  state.notes.html = `${state.notes.html || ""}${state.notes.html ? "<p><br></p>" : ""}${translationNoteHtml(result)}`;
  state.notes.updatedAt = new Date().toISOString();
  recordActivity("notes", state.notes.title || "我的六级学习笔记", `保存选区翻译：${result.text}`);
  persist();
  if (currentRoute === "notes") loadNoteEditor();
  renderSelectionResult("已保存到学习笔记");
}

function handleSelectionAction(action) {
  if (action === "close") {
    hideSelectionTranslator();
    return;
  }
  if (action === "translate") {
    translateCurrentSelection();
    return;
  }
  if (action === "speak") {
    if (selectionTranslationResult?.text || selectionContext?.text) pronounce(selectionTranslationResult?.text || selectionContext.text, 0.86);
    return;
  }
  if (action === "save-vocab") saveCurrentSelectionToVocabulary();
  if (action === "save-note") saveCurrentSelectionToNotes();
}

function updateSelectionFromDocument() {
  const selection = window.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) {
    if (!$("#selection-translator")?.matches(":hover")) hideSelectionTranslator(false);
    return;
  }
  const text = normalizeSelectionText(selection.toString());
  const range = selection.getRangeAt(0);
  if (!text || text.length > 500 || !/[A-Za-z]/.test(text) || !selectionIsAllowed(range)) {
    hideSelectionTranslator(false);
    return;
  }
  const sameSelection = selectionContext?.text === text && !$("#selection-translator")?.hidden;
  selectionContext = { text, range: range.cloneRange() };
  if (!sameSelection) {
    selectionTranslationResult = null;
    renderSelectionToolbar(text.length >= 300 ? "选中文本较长，在线翻译可能需要几秒。" : "支持单词、短语和句子；点击翻译查看词义和讲解。" );
  } else {
    selectionPosition();
  }
}

function initializeSelectionTranslator() {
  const popup = $("#selection-translator");
  if (!popup) return;
  const schedule = () => {
    window.clearTimeout(selectionCheckTimer);
    selectionCheckTimer = window.setTimeout(updateSelectionFromDocument, 45);
  };
  document.addEventListener("selectionchange", schedule);
  document.addEventListener("pointerup", schedule);
  document.addEventListener("keyup", schedule);
  popup.addEventListener("mousedown", (event) => event.preventDefault());
  popup.addEventListener("touchstart", (event) => event.preventDefault(), { passive: false });
  popup.addEventListener("click", (event) => {
    const button = event.target.closest("[data-selection-action]");
    if (button) handleSelectionAction(button.dataset.selectionAction);
  });
  window.addEventListener("resize", () => selectionPosition());
  window.addEventListener("scroll", () => selectionPosition(), true);
}

function renderSavedVocabulary() {
  const list = $("#saved-vocabulary-list");
  const count = $("#saved-vocabulary-count");
  if (!list || !count) return;
  const items = Array.isArray(state.savedVocabulary) ? state.savedVocabulary : [];
  count.textContent = `${items.length} 条`;
  if (!items.length) {
    list.innerHTML = `<div class="saved-vocabulary-empty"><strong>还没有保存内容</strong><span>在核心句、磨耳朵或系统讲解中选中英文试试。</span></div>`;
    return;
  }
  list.innerHTML = items.map((item) => `<article class="saved-vocabulary-item"><div class="saved-vocabulary-item-main"><div class="saved-vocabulary-item-heading"><strong>${escapeHtml(item.text)}</strong><span>${escapeHtml(item.partOfSpeech || "短语/句子")}</span></div><p>${escapeHtml(item.translation || "暂无翻译")}</p>${item.ipa ? `<small>${escapeHtml(item.ipa)}</small>` : ""}<small>${escapeHtml(item.explanation || "结合上下文复习并朗读。")}</small><em>${escapeHtml(item.source || "选区翻译")}</em></div><div class="saved-vocabulary-item-actions"><button type="button" class="outline-button" data-saved-speak="${escapeHtml(item.text)}">🔊</button><button type="button" class="icon-button saved-delete" data-delete-saved="${escapeHtml(item.id)}" aria-label="删除${escapeHtml(item.text)}">×</button></div></article>`).join("");
  $$('[data-saved-speak]', list).forEach((button) => button.addEventListener("click", () => pronounce(button.dataset.savedSpeak, 0.86)));
  $$('[data-delete-saved]', list).forEach((button) => button.addEventListener("click", () => {
    state.savedVocabulary = state.savedVocabulary.filter((item) => item.id !== button.dataset.deleteSaved);
    persist();
    renderSavedVocabulary();
  }));
}

function learningDay() {
  if (activeTaskDay >= 1 && activeTaskDay <= 90) return activeTaskDay;
  const day = getCurrentPlanDay();
  return day < 1 ? 1 : Math.min(90, day);
}

function markCurrentTask(module, completed) {
  const context = activeTaskDay === null ? currentTaskContext() : taskContextForDay(activeTaskDay);
  const taskData = context.tasks.find((item) => item.module === module || item.id === module);
  if (!taskData || context.day > 90 || taskIsComplete(context.day, taskData.id) === completed) {
    refreshProgressViews();
    return;
  }
  toggleTask(context.day, taskData, completed);
}

function sentenceProgress(day, sentenceId) {
  const key = `day-${day}:${sentenceId}`;
  return state.sentenceProgress?.[key] || { read: false, recall: false, apply: false, draft: "" };
}

function saveSentenceProgress(day, sentenceId, changes) {
  const key = `day-${day}:${sentenceId}`;
  state.sentenceProgress ||= {};
  state.sentenceProgress[key] = { ...sentenceProgress(day, sentenceId), ...changes, updatedAt: new Date().toISOString() };
  recordActivity("sentences", "每日核心句", `DAY ${day} · ${sentenceId}`);
  persist();
}

function renderSentences() {
  const day = learningDay();
  const sentences = dailyCoreSentences(day);
  const progress = sentences.map((sentence) => sentenceProgress(day, sentence.id));
  const readCount = progress.filter((item) => item.read).length;
  const recallCount = progress.filter((item) => item.recall).length;
  const applyCount = progress.filter((item) => item.apply).length;
  const achieved = readCount === sentences.length && recallCount >= 2 && applyCount >= 1;
  $("#sentence-day-label").textContent = `DAY ${day} · 本日3句 · 句库${CORE_SENTENCES.length}句 · ${readCount}/3 已读 · ${recallCount}/2 汉译英 · ${applyCount}/1 改写${achieved ? " · 今日达标" : ""}`;
  $("#sentence-list").innerHTML = sentences.map((sentence) => {
    const item = sentenceProgress(day, sentence.id);
    return `<article class="sentence-card ${item.read && item.recall && item.apply ? "is-complete" : ""}">
      <div class="sentence-card-heading"><div><span class="sentence-topic">${escapeHtml(sentence.topic)}</span><span class="sentence-source">${escapeHtml(sentence.sourceLabel || "本站原创素材")}</span><h3>${escapeHtml(sentence.english)}</h3></div><button class="icon-button" data-sentence-speak="${escapeHtml(sentence.english)}" aria-label="朗读核心句">🔊</button></div>
      <details class="sentence-detail"><summary>查看中文、句型和用途</summary><p><b>中文：</b>${escapeHtml(sentence.chinese)}</p><p><b>句型：</b><code>${escapeHtml(sentence.pattern)}</code></p><p><b>关键词：</b>${sentence.keywords.map((keyword) => `<span class="keyword-chip">${escapeHtml(keyword)}</span>`).join(" ")}</p><p><b>写作用途：</b>${escapeHtml(sentence.writingUse)}</p><p><b>口语用途：</b>${escapeHtml(sentence.speakingUse)}</p><p><b>来源说明：</b>${escapeHtml(sentence.sourceDetail || "本站原创素材")}</p><small>${escapeHtml(sentence.note)}</small></details>
      <div class="sentence-actions"><button class="sentence-check ${item.read ? "is-done" : ""}" data-sentence-action="read" data-sentence-id="${sentence.id}">${item.read ? "✓ 已听读并理解" : "○ 听读并理解"}</button><button class="sentence-check ${item.recall ? "is-done" : ""}" data-sentence-action="recall" data-sentence-id="${sentence.id}">${item.recall ? "✓ 已完成汉译英" : "○ 遮住英文完成汉译英"}</button><button class="sentence-check ${item.apply ? "is-done" : ""}" data-sentence-action="apply" data-sentence-id="${sentence.id}">${item.apply ? "✓ 已完成主题改写" : "○ 用于写作或口语改写"}</button></div>
      <label class="sentence-draft"><span>我的改写（可写英文或记录口语要点）</span><textarea data-sentence-draft="${sentence.id}" placeholder="把句型迁移到自己的主题……">${escapeHtml(item.draft)}</textarea></label>
    </article>`;
  }).join("");
  $$("[data-sentence-speak]").forEach((button) => button.addEventListener("click", () => pronounce(button.dataset.sentenceSpeak, 0.88)));
  $$('[data-sentence-action]').forEach((button) => button.addEventListener("click", () => {
    const dayProgress = sentenceProgress(day, button.dataset.sentenceId);
    const field = button.dataset.sentenceAction;
    saveSentenceProgress(day, button.dataset.sentenceId, { [field]: !dayProgress[field] });
    const next = dailyCoreSentences(day).map((sentence) => sentenceProgress(day, sentence.id));
    markCurrentTask("sentences", next.every((item) => item.read) && next.filter((item) => item.recall).length >= 2 && next.filter((item) => item.apply).length >= 1);
    renderSentences();
  }));
  $$('[data-sentence-draft]').forEach((input) => input.addEventListener("input", () => saveSentenceProgress(day, input.dataset.sentenceDraft, { draft: input.value })));
  if (achieved) markCurrentTask("sentences", true);
}

let earAudioUrl = null;

function earProgress(day, unit) {
  const key = `day-${day}:${unit.id}`;
  return state.earTraining?.[key] || { blind: false, gistAnswered: false, gist: false, dictation: 0, shadow: false, retell: false, draft: "" };
}

function earTrainingIsComplete(progress, dictationTotal) {
  return progress.blind && progress.gist && progress.dictation >= Math.min(2, dictationTotal) && progress.shadow && progress.retell;
}

function syncEarTrainingTask(progress, dictationTotal) {
  markCurrentTask("eartraining", earTrainingIsComplete(progress, dictationTotal));
}

function saveEarProgress(day, unit, changes) {
  const key = `day-${day}:${unit.id}`;
  state.earTraining ||= {};
  state.earTraining[key] = { ...earProgress(day, unit), ...changes, updatedAt: new Date().toISOString() };
  recordActivity("eartraining", unit.title, `DAY ${day} · ${unit.type}`);
  persist();
}

function normalizedAnswer(value) {
  return String(value || "").toLowerCase().replace(/[’'.,!?;:"“”()\-]/g, "").replace(/\s+/g, " ").trim();
}

function earChunkMatches(input, answer) {
  const typed = normalizedAnswer(input);
  const expected = normalizedAnswer(answer);
  if (!typed || !expected) return false;
  return typed === expected || typed.includes(expected) || expected.includes(typed) && typed.length >= Math.max(4, expected.length * 0.72);
}

function recommendedEarRate(day) {
  return Math.min(1.2, 0.8 + Math.floor(Math.max(0, day - 1) / 7) * 0.1).toFixed(1);
}

function renderEarTranscript(unit) {
  return unit.segments.map((segment, index) => `<article class="ear-transcript-segment"><div><span>${String(index + 1).padStart(2, "0")}</span><p><b>${escapeHtml(segment.speaker)}：</b>${escapeHtml(segment.text)}</p></div><button type="button" class="icon-button" data-ear-segment-speak="${index}" aria-label="播放第${index + 1}句">▶</button></article>`).join("");
}

function earTranscriptText(unit) {
  return unit.segments.map((segment) => `${segment.speaker}: ${segment.text}`).join("\n");
}

async function copyPlainText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function speakEarTraining(unit, rate = 0.8) {
  if (!("speechSynthesis" in window)) {
    alert("当前浏览器不支持语音朗读；可以导入自己的授权音频训练。" );
    return;
  }
  speechSynthesis.cancel();
  const voices = speechSynthesis.getVoices().filter((voice) => /^en(-|_)/i.test(voice.lang));
  let segmentIndex = 0;
  const speakerVoices = new Map();
  const next = () => {
    if (segmentIndex >= unit.segments.length) return;
    const segment = unit.segments[segmentIndex];
    if (!speakerVoices.has(segment.speaker) && voices.length) speakerVoices.set(segment.speaker, voices[speakerVoices.size % voices.length]);
    const utterance = new SpeechSynthesisUtterance(segment.text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    if (speakerVoices.has(segment.speaker)) utterance.voice = speakerVoices.get(segment.speaker);
    utterance.onend = () => {
      segmentIndex += 1;
      next();
    };
    speechSynthesis.speak(utterance);
  };
  next();
}

function renderEarTraining() {
  if (mediaRecorder?.state === "recording" && recordingContext?.kind === "ear-shadow") {
    stopRecording(recordingContext.startId, recordingContext.stopId);
  }
  const day = learningDay();
  const unit = EAR_TRAINING_UNITS[(day - 1 + activeEarIndex) % EAR_TRAINING_UNITS.length];
  const progress = earProgress(day, unit);
  const dictationTotal = unit.focusChunks.length;
  const dictationPassed = progress.dictation >= Math.min(2, dictationTotal);
  const completedStages = [progress.blind, progress.gist, dictationPassed, progress.shadow, progress.retell].filter(Boolean).length;
  const recommendedRate = recommendedEarRate(day);
  const transcriptPanel = `<details class="ear-transcript ear-transcript-panel" ${progress.gistAnswered ? "open" : ""}><summary><span><strong>完整英文原文与逐句精听</strong><small>${progress.gistAnswered ? "主旨题已作答，可以对照错因并跟读" : "答题前也可以展开；建议先完成一次盲听"}</small></span><b>共${unit.segments.length}段 · 展开 →</b></summary><div class="ear-transcript-toolbar"><button type="button" class="outline-button" id="play-ear-transcript">▶ 全文朗读</button><button type="button" class="outline-button" id="copy-ear-transcript">复制原文</button><span id="copy-ear-transcript-status"></span></div><div class="ear-transcript-list">${renderEarTranscript(unit)}</div><div class="ear-signal-list"><b>本段信号词：</b>${unit.signals.map((signal) => `<span class="keyword-chip">${escapeHtml(signal)}</span>`).join(" ")}</div></details>`;
  $("#ear-day-label").textContent = `DAY ${day} · ${completedStages}/5 步 · 共${EAR_TRAINING_UNITS.length}段${completedStages === 5 ? " · 今日达标" : ""}`;
  $("#ear-workspace").innerHTML = `<div class="workspace-heading"><div><p class="eyebrow">${escapeHtml(unit.type)} · ${escapeHtml(unit.sourceLabel || "本站原创素材")}</p><h3>${escapeHtml(unit.title)}</h3><p class="muted">${escapeHtml(unit.context)}</p><small class="ear-source-note">${escapeHtml(unit.sourceDetail || "本站原创素材")}</small></div><button class="outline-button" id="next-ear-unit">换一段</button></div>
    <div class="ear-meta"><span>训练目标：${escapeHtml(unit.target)}</span><strong>${completedStages}/5 步</strong></div>
    <div class="ear-progress"><i style="width:${(completedStages / 5) * 100}%"></i></div>
    <div class="audio-training ear-audio-card"><div class="audio-visual" aria-hidden="true">${Array.from({ length: 44 }, (_, index) => `<i style="height:${18 + ((index * 17) % 46)}%"></i>`).join("")}</div><div class="audio-controls"><button class="primary-button" id="play-ear">▶ ${progress.blind ? "再次盲听" : "开始盲听"}</button><button class="ghost-button" id="stop-ear">停止</button><label>速度<select id="ear-rate"><option value="0.8" ${recommendedRate === "0.8" ? "selected" : ""}>0.8×</option><option value="0.9" ${recommendedRate === "0.9" ? "selected" : ""}>0.9×</option><option value="1" ${recommendedRate === "1.0" ? "selected" : ""}>1.0×</option><option value="1.1" ${recommendedRate === "1.1" ? "selected" : ""}>1.1×</option><option value="1.2" ${recommendedRate === "1.2" ? "selected" : ""}>1.2×</option></select></label></div><small class="ear-speed-tip">阶段建议 ${recommendedRate}×：从0.8×起步，每7天提高0.1×；若主旨正确率低于70%，先保持当前速度。</small></div>
    <div class="local-audio-row"><label class="file-button outline-button">导入本人授权音频<input type="file" id="ear-audio-file" accept="audio/*" hidden /></label><small>浏览器朗读仅用于流程训练；正式备考请使用官网或个人授权音频。</small><audio id="ear-local-audio" controls ${earAudioUrl ? "" : "hidden"} src="${earAudioUrl || ""}"></audio></div>
    ${transcriptPanel}
    <div class="ear-stage"><div class="stage-heading"><span>01</span><div><strong>盲听与场景预测</strong><small>不看文本，先判断材料类型、人物/主题和信息目的。</small></div><button class="sentence-check ${progress.blind ? "is-done" : ""}" data-ear-stage="blind">${progress.blind ? "✓ 已完成" : "标记完成"}</button></div></div>
    <div class="ear-stage"><div class="stage-heading"><span>02</span><div><strong>主旨与结构题</strong><small>盲听后先作答，再查看文本；不要因漏听一个词停住。</small></div></div><div class="question-block"><strong>${escapeHtml(unit.gist.question)}</strong><div class="practice-options">${unit.gist.options.map((option, index) => `<label><input type="radio" name="ear-gist" value="${index}" ${progress.gistAnswered && progress.gistAnswer === index ? "checked" : ""} ${progress.gistAnswered ? "disabled" : ""} /><span>${String.fromCharCode(65 + index)}. ${escapeHtml(option)}</span></label>`).join("")}</div>${progress.gistAnswered ? `<div class="inline-feedback ${progress.gist ? "success" : "error"}"><strong>${progress.gist ? "主旨判断正确" : `正确答案：${String.fromCharCode(65 + unit.gist.answer)}`}</strong><p>${escapeHtml(unit.gist.explanation)}</p>${progress.gist ? "" : '<button id="retry-ear-gist">重新作答</button>'}</div>` : `<button class="primary-button" id="submit-ear-gist" ${progress.blind ? "" : "disabled"}>提交主旨判断</button>`}</div></div>
    <div class="ear-stage ${progress.gistAnswered ? "" : "is-locked"}"><div class="stage-heading"><span>03</span><div><strong>关键语块听写</strong><small>只听写3个承载意义的语块，区分词不认识和连读弱读。</small></div></div><div class="chunk-grid">${unit.focusChunks.map((chunk, index) => `<label><span>语块${index + 1}</span><input data-ear-chunk="${index}" value="${escapeHtml(progress[`chunk${index}`] || "")}" placeholder="听到后填写" ${progress.gistAnswered ? "" : "disabled"} /><small>${progress[`chunk${index}Correct`] ? "✓ 匹配" : ""}</small></label>`).join("")}</div><button class="outline-button" id="check-ear-chunks" ${progress.gistAnswered ? "" : "disabled"}>检查语块并对照文本</button><span class="save-inline" id="ear-chunk-result">${progress.dictation ? `已对${progress.dictation}/${dictationTotal}个` : ""}</span></div>
    <div class="ear-stage ${progress.gistAnswered ? "" : "is-locked"}"><div class="stage-heading"><span>04</span><div><strong>影子跟读</strong><small>使用上方完整原文逐句跟读；先0.8倍，再逐周提高0.1倍。</small></div><button class="sentence-check ${progress.shadow ? "is-done" : ""}" data-ear-stage="shadow" ${progress.gistAnswered ? "" : "disabled"}>${progress.shadow ? "✓ 已完成" : "跟读2轮并标记"}</button></div>${progress.gistAnswered ? `<div class="ear-recording-panel"><div class="recording-status"><i id="ear-recording-dot"></i><span id="ear-recording-status">录下自己的跟读，再和原音对比</span><strong id="ear-recording-duration">00:00</strong></div><div class="recording-actions"><button class="primary-button" id="start-ear-recording">开始跟读录音</button><button class="outline-button" id="stop-ear-recording" disabled>停止并保存</button></div><div id="latest-ear-recording"></div></div>` : '<p class="ear-locked-tip">先完成盲听和主旨题，再进入跟读打卡；上方原文仍可随时展开查看。</p>'}</div>
    <div class="ear-stage ${progress.gistAnswered ? "" : "is-locked"}"><div class="stage-heading"><span>05</span><div><strong>复述检验</strong><small>不看原文，用2—3句英文回答下面提示。</small></div><button class="sentence-check ${progress.retell ? "is-done" : ""}" data-ear-stage="retell" ${progress.gistAnswered ? "" : "disabled"}>${progress.retell ? "✓ 已复述" : "完成复述并标记"}</button></div><p class="muted">${escapeHtml(unit.summaryPrompt)}</p><textarea class="ear-retell" data-ear-retell placeholder="记录你的英文复述或关键词……" ${progress.gistAnswered ? "" : "disabled"}>${escapeHtml(progress.draft)}</textarea></div>`;

  $("#next-ear-unit").addEventListener("click", () => {
    activeEarIndex = (activeEarIndex + 1) % EAR_TRAINING_UNITS.length;
    renderEarTraining();
  });
  $("#play-ear").addEventListener("click", () => speakEarTraining(unit, Number($("#ear-rate").value)));
  $("#play-ear-transcript").addEventListener("click", () => speakEarTraining(unit, Number($("#ear-rate").value)));
  $$('[data-ear-segment-speak]').forEach((button) => button.addEventListener("click", () => pronounce(unit.segments[Number(button.dataset.earSegmentSpeak)].text, Number($("#ear-rate").value))));
  $("#copy-ear-transcript").addEventListener("click", async () => {
    const status = $("#copy-ear-transcript-status");
    try {
      await copyPlainText(earTranscriptText(unit));
      status.textContent = "已复制";
    } catch {
      status.textContent = "复制失败，请手动选择原文";
    }
  });
  $("#stop-ear").addEventListener("click", () => window.speechSynthesis?.cancel());
  $("#start-ear-recording")?.addEventListener("click", () => startRecording({ id: `${unit.id}-shadow` }, {
    kind: "ear-shadow",
    module: "eartraining",
    recordAttempt: false,
    startId: "start-ear-recording",
    stopId: "stop-ear-recording",
    dotId: "ear-recording-dot",
    statusId: "ear-recording-status",
    durationId: "ear-recording-duration",
    latestId: "latest-ear-recording",
  }));
  $("#stop-ear-recording")?.addEventListener("click", () => stopRecording("start-ear-recording", "stop-ear-recording"));
  renderLatestRecording("latest-ear-recording", "ear-shadow");
  $("#ear-audio-file").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (earAudioUrl) URL.revokeObjectURL(earAudioUrl);
    earAudioUrl = URL.createObjectURL(file);
    const player = $("#ear-local-audio");
    player.src = earAudioUrl;
    player.hidden = false;
  });
  $$('[data-ear-stage]').forEach((button) => button.addEventListener("click", () => {
    const stage = button.dataset.earStage;
    saveEarProgress(day, unit, { [stage]: !progress[stage] });
    const next = earProgress(day, unit);
    syncEarTrainingTask(next, dictationTotal);
    renderEarTraining();
  }));
  $("#submit-ear-gist")?.addEventListener("click", () => {
    const selected = $("input[name='ear-gist']:checked");
    if (!selected) {
      alert("请先选择主旨答案。" );
      return;
    }
    const answer = Number(selected.value);
    saveEarProgress(day, unit, { gistAnswered: true, gistAnswer: answer, gist: answer === unit.gist.answer });
    savePracticeAttempt("eartraining", unit.id, answer === unit.gist.answer ? 100 : 0);
    syncEarTrainingTask(earProgress(day, unit), dictationTotal);
    renderEarTraining();
  });
  $("#retry-ear-gist")?.addEventListener("click", () => {
    saveEarProgress(day, unit, { gistAnswered: false, gistAnswer: null, gist: false });
    syncEarTrainingTask(earProgress(day, unit), dictationTotal);
    renderEarTraining();
  });
  $$('[data-ear-chunk]').forEach((input) => input.addEventListener("input", () => saveEarProgress(day, unit, { [`chunk${input.dataset.earChunk}`]: input.value })));
  $("#check-ear-chunks")?.addEventListener("click", () => {
    const matches = unit.focusChunks.map((chunk, index) => earChunkMatches($("[data-ear-chunk='" + index + "']").value, chunk));
    const changes = { dictation: matches.filter(Boolean).length };
    matches.forEach((matched, index) => { changes[`chunk${index}Correct`] = matched; });
    saveEarProgress(day, unit, changes);
    const next = earProgress(day, unit);
    syncEarTrainingTask(next, dictationTotal);
    $("#ear-chunk-result").textContent = `已对${changes.dictation}/${dictationTotal}个`;
    renderEarTraining();
  });
  $(".ear-retell")?.addEventListener("input", (event) => saveEarProgress(day, unit, { draft: event.target.value }));
  if (earTrainingIsComplete(progress, dictationTotal)) syncEarTrainingTask(progress, dictationTotal);
}

function pronounce(text, rate = 0.85) {
  if (!("speechSynthesis" in window)) {
    alert("当前浏览器不支持语音朗读。" );
    return;
  }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  speechSynthesis.speak(utterance);
}

function updateVocabularyRecord(entry, result, source = "card") {
  const record = vocabularyRecord(entry.word);
  const intervals = [1, 3, 7, 14, 30];
  const reviewedAt = new Date();
  let level = record.level || 0;
  let nextDays = 1;
  if (result === "forgot") {
    level = Math.max(0, level - 1);
    nextDays = null;
    record.lapses = (record.lapses || 0) + 1;
  } else if (result === "unsure") {
    level = Math.max(1, level);
    nextDays = 1;
  } else {
    level = Math.min(intervals.length, level + 1);
    nextDays = intervals[level - 1];
  }
  const nextReview = new Date();
  if (nextDays === null) nextReview.setMinutes(nextReview.getMinutes() + 10);
  else nextReview.setDate(nextReview.getDate() + nextDays);
  const nextRecord = {
    ...record,
    level,
    status: result === "known" ? "known" : result,
    reviews: (record.reviews || 0) + 1,
    gradedReviews: (record.gradedReviews || 0) + 1,
    correctReviews: (record.correctReviews || 0) + (result === "known" ? 1 : 0),
    correctStreak: result === "known" ? (record.correctStreak || 0) + 1 : 0,
    firstReviewAt: record.firstReviewAt || (record.status === "new" ? reviewedAt.toISOString() : record.lastReviewedAt || reviewedAt.toISOString()),
    lastReviewedAt: reviewedAt.toISOString(),
    nextReviewAt: nextReview.toISOString(),
    history: [...(record.history || []), { reviewedAt: reviewedAt.toISOString(), result, source, mode: vocabularyModeForEntry(entry), nextReviewAt: nextReview.toISOString() }].slice(-30),
  };
  state.vocabulary[entry.word] = nextRecord;
  return nextRecord;
}

function reviewWord(result, source = "memory-card") {
  const entry = currentVocabularyEntry();
  if (!entry) return;
  updateVocabularyRecord(entry, result, source);
  recordActivity("vocabulary", `单词：${entry.word}`, entry.meaning);
  state.lastStudyDate = todayInChina();
  persist();
  if (!vocabularyQueue().length) markCurrentTask("vocabulary", true);
  forcedVocabularyWord = null;
  currentWordIndex = 0;
  vocabularyCardRevealed = false;
  vocabularySpellingResult = null;
  renderVocabulary();
}

function revealVocabularyCard() {
  vocabularyCardRevealed = true;
  renderVocabulary();
}

function animateVocabularyReview(result, source) {
  const card = $("#word-card");
  if (!card || !currentVocabularyEntry()) return;
  card.classList.add(result === "known" ? "swipe-right" : result === "forgot" ? "swipe-left" : "swipe-forward");
  window.setTimeout(() => reviewWord(result, source), 150);
}

function shuffled(items) {
  return [...items]
    .map((item) => ({ item, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item);
}

function startVocabularyTest() {
  vocabularyTest = { words: shuffled(vocabularyBookEntries()).slice(0, 10), index: 0, score: 0, answered: false };
  renderVocabularyTest();
  $("#vocab-test-dialog").showModal();
}

function renderVocabularyTest() {
  const container = $("#vocab-test-content");
  if (vocabularyTest.index >= vocabularyTest.words.length) {
    const percent = vocabularyTest.score * 10;
    container.innerHTML = `<div class="test-result"><span>${percent}</span><strong>本次词汇考核</strong><p>答对 ${vocabularyTest.score} / 10，错词已经回到复习队列。</p><button class="primary-button" id="finish-vocab-test">完成</button></div>`;
    $("#finish-vocab-test").addEventListener("click", () => {
      savePracticeAttempt("vocabulary", `vocab-test-${Date.now()}`, percent);
      $("#vocab-test-dialog").close();
      renderVocabulary();
    });
    return;
  }
  const word = vocabularyTest.words[vocabularyTest.index];
  const distractors = shuffled(vocabularyBookEntries().filter((item) => item.word !== word.word && item.meaning !== word.meaning)).slice(0, 3).map((item) => item.meaning);
  const options = shuffled([word.meaning, ...distractors]);
  container.innerHTML = `<div class="test-progress"><span style="width:${(vocabularyTest.index / 10) * 100}%"></span></div>
    <p class="eyebrow">第 ${vocabularyTest.index + 1} / 10 题</p><h3 class="test-word">${word.word}</h3><p class="muted">请选择最准确的中文含义</p>
    <div class="test-options">${options.map((option) => `<button data-correct="${option === word.meaning}">${option}</button>`).join("")}</div><div id="test-feedback"></div>`;
  $$('[data-correct]', container).forEach((button) => button.addEventListener("click", () => answerVocabularyTest(button, word)));
}

function answerVocabularyTest(button, word) {
  if (vocabularyTest.answered) return;
  vocabularyTest.answered = true;
  const correct = button.dataset.correct === "true";
  if (correct) vocabularyTest.score += 1;
  $$('[data-correct]', $("#vocab-test-content")).forEach((option) => {
    option.disabled = true;
    if (option.dataset.correct === "true") option.classList.add("is-correct");
  });
  if (!correct) {
    button.classList.add("is-wrong");
  }
  updateVocabularyRecord(word, correct ? "known" : "forgot", "vocabulary-test");
  persist();
  $("#test-feedback").innerHTML = `<div class="inline-feedback ${correct ? "success" : "error"}"><strong>${correct ? "回答正确" : `正确答案：${word.meaning}`}</strong><p>${word.example}</p><button id="next-test-word">下一题 →</button></div>`;
  $("#next-test-word").addEventListener("click", () => {
    vocabularyTest.index += 1;
    vocabularyTest.answered = false;
    renderVocabularyTest();
  });
}

function savePracticeAttempt(module, id, score, metadata = {}) {
  state.practiceAttempts ||= [];
  state.practiceAttempts.push({ module, id, score, ...metadata, completedAt: new Date().toISOString() });
  const route = module === "eartraining" ? "eartraining" : module === "vocabulary" ? "vocabulary" : module === "mock" ? "tests" : "practice";
  recordActivity(route, `${SKILL_LABELS[module] || module}训练`, id, { practiceModule: route === "practice" ? module : "" });
  state.lastStudyDate = todayInChina();
  persist();
  if (module === "mock") {
    markCurrentTask("exam", true);
  } else if (score >= (module === "speaking" ? 60 : 60)) {
    markCurrentTask(module, true);
  }
  renderSkillBars();
}

function stopWorkspaceTimer() {
  if (workspaceTimer) clearInterval(workspaceTimer);
  workspaceTimer = null;
}

function createCountdown(display, seconds, onComplete) {
  stopWorkspaceTimer();
  let remaining = seconds;
  const update = () => {
    const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
    const secondsPart = (remaining % 60).toString().padStart(2, "0");
    display.textContent = `${minutes}:${secondsPart}`;
  };
  update();
  workspaceTimer = setInterval(() => {
    remaining -= 1;
    update();
    if (remaining <= 0) {
      stopWorkspaceTimer();
      onComplete?.();
    }
  }, 1000);
}

function practiceItem(module) {
  const items = PRACTICE_CONTENT[module] || [];
  if (!items.length) return null;
  const dayIndex = Math.max(0, learningDay() - 1);
  return items[(dayIndex + activePracticeIndex) % items.length];
}

function practiceHeader(item, label) {
  return `<div class="workspace-heading"><div><p class="eyebrow">${escapeHtml(label)}</p><h3>${escapeHtml(item.title)}</h3><div class="practice-meta"><span>来源：${escapeHtml(item.sourceLabel || "本站原创练习")}</span><span>题型：${escapeHtml(item.type || "专项训练")}</span><span>主题：${escapeHtml(item.theme || "综合能力")}</span><span>难度：${escapeHtml(item.difficulty || "未标注")}</span></div><div class="knowledge-tags">${(item.knowledgePoints || []).map((point) => `<span>${escapeHtml(point)}</span>`).join("")}</div><small class="source-disclaimer">${escapeHtml(item.sourceDetail || "本站内容仅用于学习训练，不等同官方真题。")}</small></div><button class="outline-button" id="next-practice-item">换一题</button></div>`;
}

function bindNextPractice() {
  $("#next-practice-item")?.addEventListener("click", () => {
    activePracticeIndex += 1;
    renderPracticeWorkspace();
  });
}

function renderListening() {
  const item = practiceItem("listening");
  if (!item) return;
  $("#practice-workspace").innerHTML = `${practiceHeader(item, "LISTENING")}
    <div class="audio-training">
      <div class="audio-visual" aria-hidden="true">${Array.from({ length: 44 }, (_, index) => `<i style="height:${18 + ((index * 17) % 46)}%"></i>`).join("")}</div>
      <div class="audio-controls">
        <button class="primary-button" id="play-listening">▶ 首听全文</button>
        <button class="ghost-button" id="stop-listening">停止</button>
        <label>速度<select id="listening-rate"><option value="0.75">0.75×</option><option value="0.9" selected>0.9×</option><option value="1">1.0×</option><option value="1.15">1.15×</option></select></label>
      </div>
    </div>
    <div class="question-block">
      <strong>${item.question}</strong>
      <div class="practice-options">${item.options.map((option, index) => `<label><input type="radio" name="listening-answer" value="${index}" /><span>${String.fromCharCode(65 + index)}. ${option}</span></label>`).join("")}</div>
      <button class="primary-button" id="submit-listening">提交答案</button>
      <div id="listening-feedback"></div>
    </div>`;
  $("#play-listening").addEventListener("click", () => pronounce(item.script, Number($("#listening-rate").value)));
  $("#stop-listening").addEventListener("click", () => window.speechSynthesis?.cancel());
  $("#submit-listening").addEventListener("click", () => {
    const selected = $('input[name="listening-answer"]:checked');
    if (!selected) {
      alert("请先选择答案。" );
      return;
    }
    const correct = Number(selected.value) === item.answer;
    $("#listening-feedback").innerHTML = `<div class="inline-feedback ${correct ? "success" : "error"}"><strong>${correct ? "回答正确" : `正确答案：${String.fromCharCode(65 + item.answer)}`}</strong><p>${item.explanation}</p><p><b>考查能力：</b>${item.questionType || "信息定位"}</p><p><b>证据句：</b>${item.evidence}</p><details><summary>逐项查看选项分析</summary><ol>${(item.optionAnalysis || []).map((analysis) => `<li>${analysis}</li>`).join("")}</ol></details><details><summary>查看原创听力文本</summary><p>${item.script}</p></details></div>`;
    savePracticeAttempt("listening", item.id, correct ? 100 : 0);
  });
  bindNextPractice();
}

function renderReading() {
  const item = practiceItem("reading");
  if (!item) return;
  if (item.kind === "cloze") {
    renderClozeReading(item);
    return;
  }
  if (item.kind === "matching") {
    renderMatchingReading(item);
    return;
  }
  $("#practice-workspace").innerHTML = `${practiceHeader(item, "READING · 仔细阅读")}
    <div class="reading-layout">
      <article class="reading-passage" id="reading-passage"><p>${escapeHtml(item.passage)}</p></article>
      <div class="question-block">
        <strong>${escapeHtml(item.question)}</strong>
        <div class="practice-options">${item.options.map((option, index) => `<label><input type="radio" name="reading-answer" value="${index}" /><span>${String.fromCharCode(65 + index)}. ${escapeHtml(option)}</span></label>`).join("")}</div>
        <button class="primary-button" id="submit-reading">提交并查看证据</button>
        <div id="reading-feedback"></div>
      </div>
    </div>`;
  $("#submit-reading").addEventListener("click", () => {
    const selected = $('input[name="reading-answer"]:checked');
    if (!selected) {
      alert("请先选择答案。" );
      return;
    }
    const correct = Number(selected.value) === item.answer;
    $("#reading-passage p").innerHTML = escapeHtml(item.passage).replace(escapeHtml(item.evidence), `<mark>${escapeHtml(item.evidence)}</mark>`);
    $("#reading-feedback").innerHTML = `<div class="inline-feedback ${correct ? "success" : "error"}"><strong>${correct ? "回答正确" : `正确答案：${String.fromCharCode(65 + item.answer)}`}</strong><p>${escapeHtml(item.explanation)}</p><p><b>题型：</b>${escapeHtml(item.questionType || "信息定位题")}</p><p><b>证据句：</b>${escapeHtml(item.evidence)}</p><details><summary>逐项查看选项分析</summary><ol>${(item.optionAnalysis || []).map((analysis) => `<li>${escapeHtml(analysis)}</li>`).join("")}</ol></details></div>`;
    savePracticeAttempt("reading", item.id, correct ? 100 : 0, { questionType: item.kind });
  });
  bindNextPractice();
}

function readingSourceIntro(item) {
  return `${practiceHeader(item, `READING · ${item.type}`)}`;
}

function renderClozeReading(item) {
  $("#practice-workspace").innerHTML = `${readingSourceIntro(item)}<article class="cloze-passage"><p>${item.segments.map((segment, index) => `${escapeHtml(segment)}${index < item.answers.length ? `<select data-cloze-answer="${index}" aria-label="第${index + 1}空"><option value="">第${index + 1}空</option>${item.options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("")}</select>` : ""}`).join("")}</p></article><div class="reading-training-note"><strong>解题提示</strong><span>先判断空格词性，再用搭配和上下文排除干扰项。</span></div><button class="primary-button" id="submit-reading-cloze">提交选词填空</button><div id="reading-feedback"></div>`;
  $("#submit-reading-cloze").addEventListener("click", () => {
    const selected = $$('[data-cloze-answer]').map((select) => select.value);
    if (selected.some((answer) => !answer)) {
      alert("请先完成全部空格。" );
      return;
    }
    const correctCount = selected.reduce((total, answer, index) => total + (answer === item.answers[index] ? 1 : 0), 0);
    $("#reading-feedback").innerHTML = `<div class="inline-feedback ${correctCount === item.answers.length ? "success" : "error"}"><strong>答对 ${correctCount} / ${item.answers.length} 空</strong><p>参考答案：${item.answers.map((answer) => escapeHtml(answer)).join(" · ")}</p><ol>${item.answers.map((answer, index) => `<li>第${index + 1}空：<b>${escapeHtml(answer)}</b> · ${escapeHtml(item.explanations[index])}</li>`).join("")}</ol></div>`;
    savePracticeAttempt("reading", item.id, Math.round((correctCount / item.answers.length) * 100), { questionType: item.kind, correctCount, totalCount: item.answers.length });
  });
  bindNextPractice();
}

function renderMatchingReading(item) {
  $("#practice-workspace").innerHTML = `${readingSourceIntro(item)}<div class="matching-paragraphs">${item.paragraphs.map((paragraph) => `<article><strong>${escapeHtml(paragraph.id)}</strong><p>${escapeHtml(paragraph.text)}</p></article>`).join("")}</div><div class="matching-statements">${item.statements.map((statement, index) => `<label><span>${index + 1}. ${escapeHtml(statement.text)}</span><select data-matching-answer="${index}" aria-label="第${index + 1}题段落"><option value="">选择段落</option>${item.paragraphs.map((paragraph) => `<option value="${paragraph.id}">${paragraph.id}</option>`).join("")}</select></label>`).join("")}</div><button class="primary-button" id="submit-reading-matching">提交长篇匹配</button><div id="reading-feedback"></div>`;
  $("#submit-reading-matching").addEventListener("click", () => {
    const selected = $$('[data-matching-answer]').map((select) => select.value);
    if (selected.some((answer) => !answer)) {
      alert("请先完成全部匹配题。" );
      return;
    }
    const correctCount = selected.reduce((total, answer, index) => total + (answer === item.statements[index].answer ? 1 : 0), 0);
    $("#reading-feedback").innerHTML = `<div class="inline-feedback ${correctCount === item.statements.length ? "success" : "error"}"><strong>答对 ${correctCount} / ${item.statements.length} 题</strong><ol>${item.statements.map((statement, index) => `<li>第${index + 1}题：正确段落 <b>${escapeHtml(statement.answer)}</b> · ${escapeHtml(statement.explanation)}</li>`).join("")}</ol></div>`;
    savePracticeAttempt("reading", item.id, Math.round((correctCount / item.statements.length) * 100), { questionType: item.kind, correctCount, totalCount: item.statements.length });
  });
  bindNextPractice();
}

function renderWriting() {
  const item = practiceItem("writing");
  const draft = state.drafts?.[item.id] || "";
  $("#practice-workspace").innerHTML = `${practiceHeader(item, "WRITING · 30 MIN")}
    <div class="writing-prompt"><strong>题目</strong><p>${item.prompt}</p></div>
    <div class="writing-controls"><button class="primary-button" id="start-writing-timer">开始30分钟计时</button><strong class="timer-display" id="writing-timer">30:00</strong><span id="writing-word-count">0 words</span></div>
    <textarea class="answer-editor" id="writing-answer" placeholder="Write your essay here...">${draft}</textarea>
    <div class="rubric-box"><strong>完成后检查</strong><ul>${item.hints.map((hint) => `<li><label><input type="checkbox" /> ${hint}</label></li>`).join("")}</ul></div>
    <button class="primary-button" id="save-writing">保存本次写作</button><span class="save-inline" id="writing-save-status"></span>`;
  const editor = $("#writing-answer");
  const updateCount = () => {
    const words = editor.value.trim() ? editor.value.trim().split(/\s+/).length : 0;
    $("#writing-word-count").textContent = `${words} words`;
  };
  updateCount();
  editor.addEventListener("input", () => {
    updateCount();
    state.drafts ||= {};
    state.drafts[item.id] = editor.value;
    persist();
  });
  $("#start-writing-timer").addEventListener("click", () => createCountdown($("#writing-timer"), 1800, () => alert("30分钟写作时间结束，请开始检查。")));
  $("#save-writing").addEventListener("click", () => {
    const words = editor.value.trim() ? editor.value.trim().split(/\s+/).length : 0;
    savePracticeAttempt("writing", item.id, words >= 120 ? 85 : words >= 80 ? 65 : 40);
    $("#writing-save-status").textContent = "已保存到当前浏览器";
  });
  bindNextPractice();
}

function renderTranslation() {
  const item = practiceItem("translation");
  const draft = state.drafts?.[item.id] || "";
  $("#practice-workspace").innerHTML = `${practiceHeader(item, "TRANSLATION · 30 MIN")}
    <div class="writing-prompt"><strong>请翻译下面的段落</strong><p>${item.source}</p></div>
    <div class="writing-controls"><button class="primary-button" id="start-translation-timer">开始30分钟计时</button><strong class="timer-display" id="translation-timer">30:00</strong></div>
    <textarea class="answer-editor" id="translation-answer" placeholder="Write your translation here...">${draft}</textarea>
    <button class="outline-button" id="reveal-translation-points">完成后查看表达要点</button>
    <div class="rubric-box" id="translation-points" hidden><strong>自查要点</strong><ul>${item.keyPoints.map((point) => `<li><label><input type="checkbox" /> ${point}</label></li>`).join("")}</ul></div>
    <button class="primary-button" id="save-translation">保存本次翻译</button><span class="save-inline" id="translation-save-status"></span>`;
  const editor = $("#translation-answer");
  editor.addEventListener("input", () => {
    state.drafts ||= {};
    state.drafts[item.id] = editor.value;
    persist();
  });
  $("#start-translation-timer").addEventListener("click", () => createCountdown($("#translation-timer"), 1800, () => alert("30分钟翻译时间结束，请开始检查。")));
  $("#reveal-translation-points").addEventListener("click", () => {
    $("#translation-points").hidden = false;
  });
  $("#save-translation").addEventListener("click", () => {
    const words = editor.value.trim().split(/\s+/).filter(Boolean).length;
    savePracticeAttempt("translation", item.id, words >= 80 ? 85 : words >= 50 ? 65 : 40);
    $("#translation-save-status").textContent = "已保存到当前浏览器";
  });
  bindNextPractice();
}

async function renderLatestRecording(holderId = "latest-recording", kind = "speaking") {
  const holder = $("#" + holderId);
  if (!holder) return;
  try {
    const recording = await getLatestRecording(kind, getActiveAccountId());
    if (!recording) {
      holder.innerHTML = '<p class="muted">还没有本地录音。</p>';
      return;
    }
    const url = URL.createObjectURL(recording.blob);
    holder.innerHTML = `<small>最近录音 · ${new Date(recording.createdAt).toLocaleString("zh-CN")}</small><audio controls src="${url}"></audio>`;
  } catch (error) {
    holder.innerHTML = `<p class="muted">${error.message}</p>`;
  }
}

function renderSpeaking() {
  const item = practiceItem("speaking");
  $("#practice-workspace").innerHTML = `${practiceHeader(item, "SPEAKING")}
    <div class="speaking-grid">
      <div class="speaking-prompt"><span>个人陈述</span><h3>${item.prompt}</h3><p><b>追问：</b>${item.followUp}</p></div>
      <div class="speaking-timer-card"><small>训练计时</small><strong id="speaking-timer">01:00</strong><div><button class="ghost-button" data-speaking-seconds="60">准备60秒</button><button class="ghost-button" data-speaking-seconds="90">陈述90秒</button><button class="ghost-button" data-speaking-seconds="45">问答45秒</button></div></div>
    </div>
    <div class="recording-panel">
      <div class="recording-status"><i id="recording-dot"></i><span id="recording-status">麦克风尚未启动</span><strong id="recording-duration">00:00</strong></div>
      <div class="recording-actions"><button class="primary-button" id="start-recording">开始录音</button><button class="outline-button" id="stop-recording" disabled>停止并保存</button></div>
      <div id="latest-recording"></div>
    </div>
    <div class="rubric-box"><strong>回听自评</strong><div class="self-rating">${["流利度", "可理解度", "内容", "词汇", "语法", "互动"].map((label) => `<label>${label}<select><option>待评</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label>`).join("")}</div></div>`;
  $$('[data-speaking-seconds]').forEach((button) => button.addEventListener("click", () => createCountdown($("#speaking-timer"), Number(button.dataset.speakingSeconds), () => pronounce("Time is up", 1))));
  $("#start-recording").addEventListener("click", () => startRecording(item, {
    kind: "speaking",
    module: "speaking",
    startId: "start-recording",
    stopId: "stop-recording",
    dotId: "recording-dot",
    statusId: "recording-status",
    durationId: "recording-duration",
    latestId: "latest-recording",
  }));
  $("#stop-recording").addEventListener("click", () => stopRecording("start-recording", "stop-recording"));
  bindNextPractice();
  renderLatestRecording();
}

function mockExamItem(section, itemId) {
  return (PRACTICE_CONTENT[section.module] || []).find((item) => item.id === itemId);
}

function mockExamById(id) {
  return MOCK_EXAMS.find((exam) => exam.id === id) || MOCK_EXAMS[0];
}

function mockTimeLabel(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safeSeconds / 60).toString().padStart(2, "0")}:${(safeSeconds % 60).toString().padStart(2, "0")}`;
}

function mockResponseScore(value, module) {
  const text = String(value || "").trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const sentences = (text.match(/[.!?。！？]/g) || []).length;
  const target = module === "writing" ? 150 : 80;
  const wordScore = Math.min(65, Math.round((words / target) * 65));
  const structureScore = Math.min(25, sentences >= 3 ? 25 : sentences * 8);
  const effortScore = text ? 10 : 0;
  return { score: clamp(wordScore + structureScore + effortScore, 0, 100), words, sentences };
}

function mockItemResult(item, answer) {
  if (item.kind === "cloze") {
    const submitted = Array.isArray(answer) ? answer : [];
    const correctCount = item.answers.reduce((total, expected, index) => total + (submitted[index] === expected ? 1 : 0), 0);
    return { score: Math.round((correctCount / item.answers.length) * 100), correctCount, totalCount: item.answers.length, answered: submitted.some(Boolean) };
  }
  if (item.kind === "matching") {
    const submitted = Array.isArray(answer) ? answer : [];
    const correctCount = item.statements.reduce((total, statement, index) => total + (submitted[index] === statement.answer ? 1 : 0), 0);
    return { score: Math.round((correctCount / item.statements.length) * 100), correctCount, totalCount: item.statements.length, answered: submitted.some(Boolean) };
  }
  if (item.module === "writing" || item.module === "translation") return { ...mockResponseScore(answer, item.module), answered: Boolean(String(answer || "").trim()) };
  const correct = Number(answer) === Number(item.answer);
  return { score: correct ? 100 : 0, correctCount: correct ? 1 : 0, totalCount: 1, answered: answer !== undefined && answer !== null && answer !== "" };
}

function mockSectionResult(exam, section, session) {
  const items = section.itemIds.map((itemId) => mockExamItem(section, itemId)).filter(Boolean);
  const itemResults = items.map((item) => ({ id: item.id, ...mockItemResult(item, session.answers?.[item.id]) }));
  const points = itemResults.reduce((total, result) => total + result.score, 0);
  const score = itemResults.length ? Math.round(points / itemResults.length) : 0;
  return {
    id: section.id,
    title: section.title,
    score,
    itemCount: items.length,
    completedCount: itemResults.filter((result) => result.answered).length,
    itemResults,
  };
}

function buildMockResult(exam, session, reason = "submitted") {
  const sections = exam.sections.map((section) => mockSectionResult(exam, section, session));
  const weights = { writing: 15, listening: 35, reading: 35, translation: 15 };
  const totalWeight = exam.sections.reduce((total, section) => total + (weights[section.id] || 1), 0);
  const totalScore = Math.round(exam.sections.reduce((total, section, index) => total + sections[index].score * (weights[section.id] || 1), 0) / totalWeight);
  return {
    id: `${exam.id}-${Date.now()}`,
    examId: exam.id,
    examTitle: exam.title,
    sourceLabel: exam.sourceLabel,
    reason,
    totalScore,
    sections,
    completedAt: new Date().toISOString(),
  };
}

function renderMockResult(result, exam) {
  return `<div class="mock-result-card"><div class="mock-result-score"><span>${result.totalScore}</span><div><strong>本站训练参考分</strong><small>${result.reason === "timeout" ? "时间到，系统已自动交卷" : "已完成交卷"}</small></div></div><p class="source-disclaimer">${escapeHtml(exam.sourceDetail)} 写作与翻译分数按完成度和结构做本站估算，不是官方评分。</p><div class="mock-result-grid">${result.sections.map((section) => `<article><span>${escapeHtml(section.title)}</span><strong>${section.score}%</strong><small>${section.completedCount}/${section.itemCount} 个训练单元完成</small></article>`).join("")}</div><details class="mock-result-details"><summary>查看分项结果</summary><div>${result.sections.map((section) => `<p><b>${escapeHtml(section.title)}</b>：${section.itemResults.map((item) => `${item.score}%`).join(" · ")}</p>`).join("")}</div></details><div class="mock-result-actions"><button class="primary-button" data-restart-mock="${escapeHtml(exam.id)}">再次开始本卷</button><button class="outline-button" data-route="practice">回到专项训练</button></div></div>`;
}

function startMockExam(exam, { force = false } = {}) {
  if (state.mockSession && !force) {
    renderMockExam();
    return;
  }
  stopWorkspaceTimer();
  const now = Date.now();
  activeMockExamId = exam.id;
  state.mockSession = { examId: exam.id, sectionIndex: 0, answers: {}, startedAt: new Date(now).toISOString(), endsAt: new Date(now + exam.durationMinutes * 60 * 1000).toISOString(), updatedAt: new Date().toISOString() };
  recordActivity("tests", exam.title, "开始完整测试");
  persist();
  renderMockExam();
}

function renderMockHistory(exam) {
  const results = (state.mockResults || []).filter((result) => result.examId === exam.id).slice(0, 5);
  if (!results.length) return `<p class="muted">还没有完整测试记录。开始一次后，这里会保存交卷时间、分项成绩和错题数量。</p>`;
  return `<div class="mock-history"><strong>最近测试记录</strong>${results.map((result) => `<div><span>${new Date(result.completedAt).toLocaleString("zh-CN")}</span><b>${result.totalScore}分</b><small>${result.reason === "timeout" ? "超时交卷" : "主动交卷"}</small></div>`).join("")}</div>`;
}

function mockExamCatalogMarkup() {
  const years = [...new Set(MOCK_EXAMS.map((exam) => exam.year))];
  const types = [...new Set(MOCK_EXAMS.map((exam) => exam.examType))];
  const filtered = MOCK_EXAMS.filter((exam) => (activeMockYear === "all" || exam.year === activeMockYear) && (activeMockType === "all" || exam.examType === activeMockType));
  const exams = filtered.length ? filtered : MOCK_EXAMS;
  return `<section class="mock-catalog-panel"><div class="card-heading"><div><p class="eyebrow">PAPER SELECTOR</p><h3>选择站内完整训练卷</h3></div><span class="source-chip">固定题序 · 不随机</span></div><p class="muted">先按年份和类型筛选，再选择一套开始。当前站内是原创模拟卷；历年官方真题请看下方“真题入口索引”。</p><div class="mock-filter-row"><label>年份<select id="mock-year-filter"><option value="all" ${activeMockYear === "all" ? "selected" : ""}>全部</option>${years.map((year) => `<option value="${escapeHtml(year)}" ${activeMockYear === year ? "selected" : ""}>${escapeHtml(year)}</option>`).join("")}</select></label><label>类型<select id="mock-type-filter"><option value="all" ${activeMockType === "all" ? "selected" : ""}>全部</option>${types.map((type) => `<option value="${escapeHtml(type)}" ${activeMockType === type ? "selected" : ""}>${escapeHtml(type)}</option>`).join("")}</select></label></div><div class="mock-exam-card-grid">${exams.map((item) => `<button class="mock-exam-card ${item.id === activeMockExamId ? "is-selected" : ""}" type="button" data-select-mock="${escapeHtml(item.id)}"><span>${escapeHtml(item.year)} · ${escapeHtml(item.examType)}</span><strong>${escapeHtml(item.title)}</strong><small>${item.durationMinutes}分钟 · ${item.sections.reduce((total, section) => total + section.itemIds.length, 0)}个训练单元</small></button>`).join("")}</div></section>`;
}

function realExamIndexMarkup() {
  const years = [...new Set(REAL_EXAM_INDEX.map((item) => item.year))];
  const types = [...new Map(REAL_EXAM_INDEX.map((item) => [item.type, item.typeLabel])).entries()];
  const filtered = REAL_EXAM_INDEX.filter((item) => (activeRealExamYear === "all" || item.year === activeRealExamYear) && (activeRealExamType === "all" || item.type === activeRealExamType));
  const items = filtered;
  return `<section class="real-exam-index"><div class="card-heading"><div><p class="eyebrow">REAL EXAM INDEX</p><h3>历年真题入口索引</h3></div><span class="source-chip">官方/外部资料</span></div><p class="muted">这里可以按年份和题型查看入口。本站不上传完整真题、音频或付费解析；请在官方入口、外部平台或你本人合法保存的材料中完成整套训练。</p><div class="mock-filter-row"><label>年份<select id="real-exam-year-filter"><option value="all" ${activeRealExamYear === "all" ? "selected" : ""}>全部年份</option>${years.map((year) => `<option value="${escapeHtml(year)}" ${activeRealExamYear === year ? "selected" : ""}>${escapeHtml(year)}</option>`).join("")}</select></label><label>类型<select id="real-exam-type-filter"><option value="all" ${activeRealExamType === "all" ? "selected" : ""}>全部题型</option>${types.map(([type, label]) => `<option value="${escapeHtml(type)}" ${activeRealExamType === type ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label></div><div class="real-exam-list">${items.length ? items.map((item) => `<article class="real-exam-item"><div><span>${escapeHtml(item.year)} · ${escapeHtml(item.typeLabel)}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.sourceDetail)}</small></div><div class="real-exam-links">${item.links.map((link) => `<a class="text-link" href="${link.url}" target="_blank" rel="noreferrer">${escapeHtml(link.name)} →</a>`).join("")}</div></article>`).join("") : `<p class="muted">没有符合筛选条件的入口。</p>`}</div></section>`;
}

function renderMockStart(exam, container) {
  const questionCount = exam.sections.reduce((total, section) => total + section.itemIds.length, 0);
  container.innerHTML = `${mockExamCatalogMarkup()}<div class="mock-overview"><div class="card-heading"><div><p class="eyebrow">FULL MOCK TEST · ORIGINAL</p><h3>${escapeHtml(exam.title)}</h3></div><span class="source-chip">${escapeHtml(exam.sourceLabel)}</span></div><p>${escapeHtml(exam.description)}</p><div class="mock-warning"><strong>先说明题源</strong><span>这是本站原创训练卷，按考试能力组织流程；不等同官方真题。官方真题只可使用你本人合法取得、并在本地保存的材料。</span></div><div class="mock-section-grid">${exam.sections.map((section) => `<article><span>${escapeHtml(section.title)}</span><strong>${section.itemIds.length}个训练单元</strong><small>${section.minutes}分钟 · ${escapeHtml(section.instruction)}</small></article>`).join("")}</div><div class="mock-start-row"><div><strong>总计 ${questionCount} 个训练单元 · ${exam.durationMinutes} 分钟</strong><small>题序固定，不随机；保存退出后重新进入会继续剩余时间；点击“重开本卷”才会重新计时。</small></div><div class="mock-start-actions"><button class="outline-button" id="exit-mock-selection">暂不开始，返回首页</button><button class="primary-button" data-start-mock="${escapeHtml(exam.id)}">开始完整测试</button></div></div></div><div class="mock-history-panel"><div class="card-heading"><h3>测试留存</h3><span class="muted">当前账户 · ${escapeHtml(exam.title)}</span></div>${renderMockHistory(exam)}</div>${realExamIndexMarkup()}`;
  $("#mock-year-filter").addEventListener("change", (event) => {
    activeMockYear = event.target.value;
    renderMockExam();
  });
  $("#mock-type-filter").addEventListener("change", (event) => {
    activeMockType = event.target.value;
    renderMockExam();
  });
  $("#real-exam-year-filter").addEventListener("change", (event) => {
    activeRealExamYear = event.target.value;
    renderMockExam();
  });
  $("#real-exam-type-filter").addEventListener("change", (event) => {
    activeRealExamType = event.target.value;
    renderMockExam();
  });
  $$('[data-select-mock]').forEach((button) => button.addEventListener("click", () => {
    activeMockExamId = button.dataset.selectMock;
    renderMockExam();
  }));
  $$('[data-start-mock]').forEach((button) => button.addEventListener("click", () => startMockExam(mockExamById(button.dataset.startMock))));
  $("#exit-mock-selection").addEventListener("click", () => navigate("dashboard"));
}

function mockRadioMarkup(item, session) {
  const answer = session.answers?.[item.id];
  return `<div class="mock-options">${item.options.map((option, index) => `<label><input type="radio" name="mock-${item.id}" data-mock-radio="${item.id}" value="${index}" ${Number(answer) === index ? "checked" : ""} /><span>${String.fromCharCode(65 + index)}. ${escapeHtml(option)}</span></label>`).join("")}</div>`;
}

function mockItemMarkup(item, section, session, index) {
  const number = index + 1;
  if (item.module === "writing" || item.module === "translation") {
    const value = session.answers?.[item.id] || "";
    const prompt = item.module === "writing" ? item.prompt : item.source;
    return `<article class="mock-question response-question"><div class="mock-question-heading"><span>第${number}题</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.type)}</small></div><div class="writing-prompt"><strong>${item.module === "writing" ? "作文题目" : "翻译材料"}</strong><p>${escapeHtml(prompt)}</p></div><textarea class="answer-editor" data-mock-response="${item.id}" placeholder="${item.module === "writing" ? "Write your essay here..." : "Write your translation here..."}">${escapeHtml(value)}</textarea><small class="mock-response-tip">${item.module === "writing" ? "建议不少于150词，完成后检查结构、衔接、语法和拼写。" : "完成后检查关键信息、时态、主谓、搭配和文化表达。"}</small></article>`;
  }
  if (item.kind === "cloze") {
    const answers = Array.isArray(session.answers?.[item.id]) ? session.answers[item.id] : [];
    const text = item.segments.map((segment, segmentIndex) => `${escapeHtml(segment)}${segmentIndex < item.answers.length ? `<select data-mock-cloze="${item.id}:${segmentIndex}" aria-label="${escapeHtml(item.title)}第${segmentIndex + 1}空"><option value="">第${segmentIndex + 1}空</option>${item.options.map((option) => `<option value="${escapeHtml(option)}" ${answers[segmentIndex] === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select>` : ""}`).join("");
    return `<article class="mock-question"><div class="mock-question-heading"><span>第${number}题 · 选词填空</span><strong>${escapeHtml(item.title)}</strong></div><p class="cloze-text">${text}</p></article>`;
  }
  if (item.kind === "matching") {
    const answers = Array.isArray(session.answers?.[item.id]) ? session.answers[item.id] : [];
    return `<article class="mock-question"><div class="mock-question-heading"><span>第${number}题 · 长篇匹配</span><strong>${escapeHtml(item.title)}</strong></div><div class="matching-paragraphs">${item.paragraphs.map((paragraph) => `<article><strong>${escapeHtml(paragraph.id)}</strong><p>${escapeHtml(paragraph.text)}</p></article>`).join("")}</div><div class="matching-statements">${item.statements.map((statement, statementIndex) => `<label><span>${statementIndex + 1}. ${escapeHtml(statement.text)}</span><select data-mock-matching="${item.id}:${statementIndex}" aria-label="${escapeHtml(item.title)}第${statementIndex + 1}题"><option value="">选择段落</option>${item.paragraphs.map((paragraph) => `<option value="${paragraph.id}" ${answers[statementIndex] === paragraph.id ? "selected" : ""}>${paragraph.id}</option>`).join("")}</select></label>`).join("")}</div></article>`;
  }
  const speechButton = item.module === "listening" ? `<button class="ghost-button" data-mock-speak="${escapeHtml(item.script)}">▶ 播放材料</button><details><summary>交卷后查看原文</summary><p>${escapeHtml(item.script)}</p></details>` : `<article class="reading-passage"><p>${escapeHtml(item.passage)}</p></article>`;
  return `<article class="mock-question"><div class="mock-question-heading"><span>第${number}题 · ${escapeHtml(item.type)}</span><strong>${escapeHtml(item.question)}</strong></div>${speechButton}${mockRadioMarkup(item, session)}</article>`;
}

function startMockTimer(exam, session) {
  stopWorkspaceTimer();
  const display = $("#mock-timer");
  if (!display) return;
  const update = () => {
    const remaining = Math.max(0, (new Date(session.endsAt).getTime() - Date.now()) / 1000);
    display.textContent = mockTimeLabel(remaining);
    display.classList.toggle("is-warning", remaining <= 300);
    if (remaining <= 0) {
      stopWorkspaceTimer();
      finishMockExam("timeout");
    }
  };
  update();
  workspaceTimer = setInterval(update, 1000);
}

function updateMockAnswer(key, value) {
  if (!state.mockSession) return;
  state.mockSession.answers ||= {};
  state.mockSession.answers[key] = value;
  state.mockSession.updatedAt = new Date().toISOString();
  persist();
}

function bindMockInputs(exam, section, session) {
  $$('[data-mock-radio]').forEach((input) => input.addEventListener("change", () => updateMockAnswer(input.dataset.mockRadio, Number(input.value))));
  $$('[data-mock-cloze]').forEach((select) => select.addEventListener("change", () => {
    const [itemId, index] = select.dataset.mockCloze.split(":");
    const answers = Array.isArray(state.mockSession?.answers?.[itemId]) ? [...state.mockSession.answers[itemId]] : [];
    answers[Number(index)] = select.value;
    updateMockAnswer(itemId, answers);
  }));
  $$('[data-mock-matching]').forEach((select) => select.addEventListener("change", () => {
    const [itemId, index] = select.dataset.mockMatching.split(":");
    const answers = Array.isArray(state.mockSession?.answers?.[itemId]) ? [...state.mockSession.answers[itemId]] : [];
    answers[Number(index)] = select.value;
    updateMockAnswer(itemId, answers);
  }));
  $$('[data-mock-response]').forEach((editor) => editor.addEventListener("input", () => updateMockAnswer(editor.dataset.mockResponse, editor.value)));
  $$('[data-mock-speak]').forEach((button) => button.addEventListener("click", () => pronounce(button.dataset.mockSpeak, 0.9)));
  $("#mock-prev-section")?.addEventListener("click", () => {
    state.mockSession.sectionIndex = Math.max(0, state.mockSession.sectionIndex - 1);
    persist();
    renderMockExam();
  });
  $("#mock-next-section")?.addEventListener("click", () => {
    state.mockSession.sectionIndex = Math.min(exam.sections.length - 1, state.mockSession.sectionIndex + 1);
    persist();
    renderMockExam();
  });
  $("#submit-mock-exam")?.addEventListener("click", () => {
    if (confirm("确定现在交卷吗？未填写的题目会按未作答计入复盘。")) finishMockExam("submitted");
  });
  $("#restart-active-mock")?.addEventListener("click", () => {
    if (confirm(`重新开始会清空本卷当前答案，并从完整的${exam.durationMinutes}分钟重新计时。确定重开吗？`)) startMockExam(exam, { force: true });
  });
  $("#cancel-active-mock")?.addEventListener("click", () => {
    if (!confirm("退出本次测试将删除当前未交卷答案，但不会删除历史测试记录。确定退出吗？")) return;
    stopWorkspaceTimer();
    state.mockSession = null;
    recordActivity("tests", exam.title, "退出未交卷的完整测试");
    persist();
    renderMockExam();
  });
  $("#save-mock-exit")?.addEventListener("click", () => {
    recordActivity("tests", exam.title, "完整测试已保存，可继续作答");
    persist();
    navigate("dashboard");
  });
}

function finishMockExam(reason = "submitted") {
  const session = state.mockSession;
  if (!session) return;
  const exam = mockExamById(session.examId);
  stopWorkspaceTimer();
  const result = buildMockResult(exam, session, reason);
  state.mockResults ||= [];
  state.mockResults.unshift(result);
  state.mockResults = state.mockResults.slice(0, 20);
  state.mockSession = null;
  savePracticeAttempt("mock", exam.id, result.totalScore, { resultId: result.id, reason, sections: result.sections.map((section) => ({ id: section.id, score: section.score })) });
  renderMockExam();
}

function renderMockExam() {
  const container = $("#mock-exam-workspace");
  if (!container) return;
  const exam = mockExamById(state.mockSession?.examId || activeMockExamId);
  if (!state.mockSession) {
    const latest = (state.mockResults || []).find((result) => result.examId === exam.id);
    renderMockStart(exam, container);
    if (latest) container.insertAdjacentHTML("afterbegin", renderMockResult(latest, exam));
    $$('[data-route="practice"]', container).forEach((button) => button.addEventListener("click", () => navigate("practice")));
    $$('[data-restart-mock]', container).forEach((button) => button.addEventListener("click", () => startMockExam(mockExamById(button.dataset.restartMock), { force: true })));
    return;
  }
  const session = state.mockSession;
  const section = exam.sections[Math.min(exam.sections.length - 1, session.sectionIndex)] || exam.sections[0];
  const sectionIndex = exam.sections.indexOf(section);
  container.innerHTML = `<div class="mock-test-top"><div><p class="eyebrow">FULL MOCK TEST · ${sectionIndex + 1}/${exam.sections.length}</p><h3>${escapeHtml(exam.title)}</h3><small>${escapeHtml(exam.sourceLabel)} · 题序固定 · 自动保存</small></div><div class="mock-test-top-actions"><button class="ghost-button" id="restart-active-mock">重开本卷</button><button class="ghost-button" id="cancel-active-mock">退出测试</button><div class="mock-timer-box"><small>剩余时间</small><strong id="mock-timer">--:--</strong></div></div></div><div class="mock-section-tabs">${exam.sections.map((item, index) => `<span class="${index === sectionIndex ? "is-active" : ""} ${index < sectionIndex ? "is-done" : ""}">${index + 1}. ${escapeHtml(item.title)}<small>${item.minutes}分钟</small></span>`).join("")}</div><div class="mock-section-heading"><div><p class="eyebrow">SECTION ${sectionIndex + 1}</p><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.instruction)}</p></div><span>${section.itemIds.length}个训练单元</span></div><div class="mock-question-list">${section.itemIds.map((itemId, index) => { const item = mockExamItem(section, itemId); return item ? mockItemMarkup(item, section, session, index) : `<p class="muted">题目 ${escapeHtml(itemId)} 暂不可用。</p>`; }).join("")}</div><div class="mock-navigation"><button class="outline-button" id="save-mock-exit">保存并退出</button><button class="outline-button" id="cancel-active-mock-bottom">退出本次测试</button><div><button class="outline-button" id="mock-prev-section" ${sectionIndex === 0 ? "disabled" : ""}>上一部分</button>${sectionIndex === exam.sections.length - 1 ? `<button class="primary-button" id="submit-mock-exam">交卷并查看结果</button>` : `<button class="primary-button" id="mock-next-section">下一部分 →</button>`}</div></div><p class="source-disclaimer">${escapeHtml(exam.sourceDetail)} 页面离开后答案仍保留在当前账户；录音和外部材料不会上传到云端。</p>`;
  bindMockInputs(exam, section, session);
  $("#cancel-active-mock-bottom")?.addEventListener("click", () => $("#cancel-active-mock")?.click());
  startMockTimer(exam, session);
}

async function startRecording(item, options = {}) {
  const context = {
    kind: options.kind || "speaking",
    module: options.module || "speaking",
    startId: options.startId || "start-recording",
    stopId: options.stopId || "stop-recording",
    dotId: options.dotId || "recording-dot",
    statusId: options.statusId || "recording-status",
    durationId: options.durationId || "recording-duration",
    latestId: options.latestId || "latest-recording",
    recordAttempt: options.recordAttempt !== false,
  };
  if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
    alert("当前浏览器不支持网页录音，请改用系统录音工具并手动自评。" );
    return;
  }
  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingStream = stream;
    const chunks = [];
    const recorder = new MediaRecorder(stream);
    mediaRecorder = recorder;
    recordingContext = context;
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener("stop", async () => {
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const accountId = getActiveAccountId();
        await saveRecording({ id: `${accountId}-recording-${Date.now()}`, accountId, kind: context.kind, promptId: item.id, blob, createdAt: new Date().toISOString() });
        if (context.recordAttempt) savePracticeAttempt(context.module, item.id, 70);
        else {
          recordActivity("eartraining", "影子跟读录音", item.id);
          persist();
          refreshProgressViews();
        }
        await renderLatestRecording(context.latestId, context.kind);
        $("#" + context.statusId)?.replaceChildren(document.createTextNode("录音已保存在当前设备"));
      } catch (error) {
        const status = $("#" + context.statusId);
        if (status) status.textContent = "录音保存失败，请检查浏览器存储空间";
        console.error(error);
      } finally {
        stream.getTracks().forEach((track) => track.stop());
        if (recordingStream === stream) recordingStream = null;
        $("#" + context.dotId)?.classList.remove("is-live");
        recordingContext = null;
        if (mediaRecorder === recorder) mediaRecorder = null;
      }
    });
    recorder.start(250);
    $("#" + context.startId).disabled = true;
    $("#" + context.stopId).disabled = false;
    $("#" + context.dotId).classList.add("is-live");
    $("#" + context.statusId).textContent = "正在录音";
    const startedAt = Date.now();
    stopWorkspaceTimer();
    workspaceTimer = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      const duration = $("#" + context.durationId);
      if (duration) duration.textContent = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
    }, 500);
  } catch {
    stream?.getTracks().forEach((track) => track.stop());
    if (recordingStream === stream) recordingStream = null;
    recordingContext = null;
    alert("无法使用麦克风。请检查浏览器权限，或使用系统录音工具完成训练。" );
  }
}

function stopRecording(startId = "start-recording", stopId = "stop-recording") {
  if (mediaRecorder?.state === "recording") mediaRecorder.stop();
  stopWorkspaceTimer();
  $("#" + startId)?.removeAttribute("disabled");
  $("#" + stopId)?.setAttribute("disabled", "");
}

function renderPracticeWorkspace() {
  stopWorkspaceTimer();
  window.speechSynthesis?.cancel();
  if (mediaRecorder?.state === "recording") stopRecording(recordingContext?.startId, recordingContext?.stopId);
  $$('[data-module]').forEach((item) => item.classList.toggle("is-selected", item.dataset.module === activePracticeModule));
  if (activePracticeModule === "listening") renderListening();
  if (activePracticeModule === "reading") renderReading();
  if (activePracticeModule === "writing") renderWriting();
  if (activePracticeModule === "translation") renderTranslation();
  if (activePracticeModule === "speaking") renderSpeaking();
}

function renderLessons() {
  const index = $("#lesson-index");
  const reader = $("#lesson-reader");
  if (!index || !reader) return;
  if (!LESSON_LIBRARY[activeLessonId]) activeLessonId = LESSONS[0]?.id;
  index.innerHTML = LESSONS.map((lesson) => `<button class="lesson-index-item ${lesson.id === activeLessonId ? "is-active" : ""}" data-lesson-id="${lesson.id}"><strong>${escapeHtml(lesson.title)}</strong><small>${escapeHtml(lesson.subtitle)}</small></button>`).join("");
  const lesson = LESSON_LIBRARY[activeLessonId];
  reader.innerHTML = `<div class="lesson-reader-heading"><p class="eyebrow">${escapeHtml(lesson.dayRange)}</p><h3>${escapeHtml(lesson.title)}</h3><p class="muted">${escapeHtml(lesson.subtitle)}</p></div>${lesson.sections.map((section) => `<section class="lesson-section"><h4>${escapeHtml(section.title)}</h4>${(section.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}${section.steps ? `<ol>${section.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>` : ""}${section.example ? `<div class="lesson-example"><strong>例题/问题</strong><p>${escapeHtml(section.example.prompt)}</p><p><b>分析：</b>${escapeHtml(section.example.analysis)}</p><p><b>结论：</b>${escapeHtml(section.example.answer)}</p></div>` : ""}${section.errors ? `<div class="lesson-errors"><strong>常见错误</strong><ul>${section.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul></div>` : ""}${section.checklist ? `<div class="lesson-checklist"><strong>达标清单</strong>${section.checklist.map((item) => `<label><input type="checkbox" /> ${escapeHtml(item)}</label>`).join("")}</div>` : ""}</section>`).join("")}`;
  $$('[data-lesson-id]', index).forEach((button) => button.addEventListener("click", () => {
    activeLessonId = button.dataset.lessonId;
    renderLessons();
  }));
}

function renderResourceCatalog() {
  const container = $("#resource-catalog");
  if (!container) return;
  container.innerHTML = `<div class="catalog-heading"><p class="eyebrow">SOURCE CATALOG</p><h3>按用途分类的资料目录</h3><p class="muted">本站原创内容与外部资料分开标注；外链内容的版权和可用性以原网站为准。</p></div>${RESOURCE_CATALOG.map((group) => `<article class="catalog-group"><div class="catalog-group-heading"><span class="resource-type ${group.tone}">${escapeHtml(group.type)}</span><div><h4>${escapeHtml(group.title)}</h4><p>${escapeHtml(group.description)}</p></div></div><div class="catalog-items">${group.items.map((item) => `<div class="catalog-item"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.modules)} · ${escapeHtml(item.access)}</small><p>${escapeHtml(item.detail)}</p></div>${item.url ? `<a class="text-link" href="${item.url}" target="_blank" rel="noreferrer">打开 →</a>` : ""}</div>`).join("")}</div></article>`).join("")}`;
}

function loadNoteEditor() {
  $("#note-title").value = state.notes.title;
  $("#note-editor").innerHTML = state.notes.html;
  updateNoteCount();
}

function updateNoteCount() {
  const count = $("#note-editor").innerText.replace(/\s/g, "").length;
  $("#note-count").textContent = `${count} 字`;
}

function scheduleNoteSave() {
  $("#note-save-status").textContent = "保存中…";
  clearTimeout(noteSaveTimer);
  noteSaveTimer = setTimeout(() => {
    state.notes = {
      title: $("#note-title").value.trim() || "未命名笔记",
      html: $("#note-editor").innerHTML,
      updatedAt: new Date().toISOString(),
    };
    recordActivity("notes", state.notes.title, "继续整理学习笔记");
    persist();
    $("#note-save-status").textContent = "已保存";
  }, 350);
  updateNoteCount();
}

function runEditorCommand(command, value = null) {
  $("#note-editor").focus();
  document.execCommand(command, false, value);
  scheduleNoteSave();
}

function insertTextAtCursor(text) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function handleNoteImage(file) {
  if (!file || !file.type.startsWith("image/")) return;
  if (file.size > 500 * 1024) {
    alert("首版单张笔记图片不能超过500KB，请压缩后再插入。" );
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    $("#note-editor").focus();
    document.execCommand("insertImage", false, reader.result);
    scheduleNoteSave();
  });
  reader.readAsDataURL(file);
}

function initializeNotes() {
  $("#note-title").addEventListener("input", scheduleNoteSave);
  $("#note-editor").addEventListener("input", scheduleNoteSave);
  $("#note-editor").addEventListener("paste", (event) => {
    const image = [...event.clipboardData.items].find((item) => item.type.startsWith("image/"));
    event.preventDefault();
    if (image) handleNoteImage(image.getAsFile());
    else {
      insertTextAtCursor(event.clipboardData.getData("text/plain"));
      scheduleNoteSave();
    }
  });
  $$('[data-command]').forEach((button) => button.addEventListener("click", () => runEditorCommand(button.dataset.command)));
  $("#note-font").addEventListener("change", (event) => runEditorCommand("fontName", event.target.value));
  $("#note-size").addEventListener("change", (event) => runEditorCommand("fontSize", event.target.value));
  $("#note-color").addEventListener("input", (event) => runEditorCommand("foreColor", event.target.value));
  $("#note-image").addEventListener("change", (event) => handleNoteImage(event.target.files[0]));
  $("#insert-sticker").addEventListener("click", () => {
    $("#note-editor").focus();
    insertTextAtCursor(" ⭐重点 ");
    scheduleNoteSave();
  });
  $("#clear-note").addEventListener("click", () => {
    if (!confirm("确定清空当前笔记吗？建议先导出备份。")) return;
    $("#note-editor").innerHTML = "";
    scheduleNoteSave();
  });
  loadNoteEditor();
}

function hasMeaningfulStudyData(snapshot = state) {
  return Boolean(
    Object.keys(snapshot.completedTasks || {}).length
      || Object.keys(snapshot.vocabulary || {}).length
      || Object.keys(snapshot.sentenceProgress || {}).length
      || Object.keys(snapshot.earTraining || {}).length
      || (snapshot.savedVocabulary || []).length
      || (snapshot.practiceAttempts || []).length
      || snapshot.notes?.html
      || snapshot.studyMinutes,
  );
}

function accountInitials(displayName) {
  return Array.from(displayName || "访客").slice(0, 2).join("");
}

function renderCloudIndicator(status = getCloudStatus()) {
  const indicator = $("#cloud-sync-indicator");
  if (!indicator) return;
  const isCloudAccount = getCurrentAccount().type === "cloud";
  indicator.hidden = !isCloudAccount;
  indicator.dataset.status = status.state;
  indicator.querySelector("span").textContent = status.label;
  indicator.title = status.detail;
}

function renderAccountChrome() {
  const account = getCurrentAccount();
  const accountType = account.type === "cloud" ? "云账户" : account.type === "local" ? "本机账户" : "访客模式";
  const button = $("#data-button");
  button.textContent = accountInitials(account.displayName);
  button.title = `${account.displayName} · 账户与数据`;
  button.setAttribute("aria-label", `打开${account.displayName}的账户与数据管理`);
  const summary = $("#account-summary");
  if (summary) {
    const identity = account.type === "guest" ? "无需登录" : account.type === "cloud" ? escapeHtml(account.email) : `@${escapeHtml(account.username)}`;
    summary.innerHTML = `<span class="account-summary-avatar">${escapeHtml(accountInitials(account.displayName))}</span><div><strong>${escapeHtml(account.displayName)}</strong><small>${accountType} · ${identity}</small></div><span class="account-mode-badge ${account.type}">${account.type === "cloud" ? "云端" : account.type === "local" ? "本机" : "访客"}</span>`;
  }
  const note = $("#data-storage-note");
  if (note) {
    note.textContent = account.type === "cloud"
      ? "学习进度先保存到本机，再自动同步至云端；录音仍只保存在当前设备。"
      : account.type === "local"
        ? "该账户的进度、笔记和录音与其他本机账户隔离，当前仅保存在此浏览器。"
        : "访客进度单独保存在当前浏览器；登录云账户时可以迁移现有进度。";
  }
  renderCloudIndicator();
}

function setAccountMessage(message, isError = false) {
  const holder = $("#account-message");
  if (!holder) return;
  holder.textContent = message;
  holder.classList.toggle("is-error", isError);
  holder.hidden = !message;
}

function renderAccountManager() {
  const current = getCurrentAccount();
  const switchableAccounts = listLocalAccounts().filter((account) => account.id !== current.id);
  const canCopyCurrentProgress = current.type !== "cloud" && hasMeaningfulStudyData();
  const cloudStatus = getCloudStatus();
  const currentIdentity = current.type === "cloud"
    ? `${escapeHtml(current.email)} · 云账户`
    : current.type === "local"
      ? `@${escapeHtml(current.username)} · 本机账户`
      : "访客模式 · 无需登录";
  const holder = $("#account-dialog-content");
  holder.innerHTML = `
    <div class="account-security-note"><strong>本地优先 + 云端同步</strong><p>所有操作先保存在当前设备；登录云账户后自动同步任务、词汇、句子、练习、草稿和笔记。录音暂不上传云端。</p></div>
    <div class="account-current-card">
      <span class="account-summary-avatar">${escapeHtml(accountInitials(current.displayName))}</span>
      <div><small>当前身份</small><strong>${escapeHtml(current.displayName)}</strong><p>${currentIdentity}</p></div>
    </div>
    <p class="account-message" id="account-message" role="status" hidden></p>
    ${current.type !== "cloud" ? `<section class="account-form-section"><h4>跨设备云账户</h4><p class="account-form-hint">使用邮箱和密码登录，可在电脑与手机恢复同一份学习记录。</p><form id="cloud-account-form" class="account-form account-cloud-grid"><label>邮箱<input id="cloud-account-email" type="email" maxlength="160" autocomplete="email" placeholder="name@example.com" required /></label><label>密码<input id="cloud-account-password" type="password" minlength="6" maxlength="72" autocomplete="current-password" required /></label><label>注册显示名称<input id="cloud-account-name" maxlength="20" autocomplete="nickname" placeholder="仅注册时填写" /></label>${canCopyCurrentProgress ? '<label class="account-copy-option"><input id="copy-current-to-cloud" type="checkbox" checked /> 首次登录或注册后迁移当前进度</label>' : ""}<div class="cloud-auth-actions"><button class="primary-button" type="submit">登录云账户</button><button class="outline-button" type="button" id="register-cloud-account">注册云账户</button></div></form><p class="cloud-mail-note">当前 Supabase 默认邮件服务通常只向项目团队邮箱发送确认邮件；面向所有用户开放注册前，需要在 Supabase 配置自定义 SMTP。</p></section>` : `<section class="account-form-section"><h4>云同步管理</h4><div class="cloud-account-status" data-status="${escapeHtml(cloudStatus.state)}"><i></i><div><strong>${escapeHtml(cloudStatus.label)}</strong><p>${escapeHtml(cloudStatus.detail)}</p></div></div><div class="cloud-account-actions"><button type="button" class="primary-button" id="sync-cloud-now">立即上传本机记录</button><button type="button" class="outline-button" id="download-cloud-state">从云端恢复</button><button type="button" class="outline-button" id="logout-cloud-account">退出云账户</button></div></section>`}
    ${switchableAccounts.length ? `<section class="account-form-section"><h4>登录其他账户</h4><form id="switch-account-form" class="account-form"><label>账户<select id="switch-account-id" required>${switchableAccounts.map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.displayName)} · @${escapeHtml(account.username)}</option>`).join("")}</select></label><label>登录口令<input id="switch-account-password" type="password" minlength="6" maxlength="64" autocomplete="current-password" required /></label><button class="outline-button" type="submit">登录并切换</button></form></section>` : ""}
    <section class="account-form-section"><h4>创建本机账户</h4><form id="create-account-form" class="account-form account-create-grid"><label>显示名称<input id="new-account-name" maxlength="20" autocomplete="nickname" placeholder="例如：小李" required /></label><label>用户名<input id="new-account-username" minlength="2" maxlength="24" autocomplete="username" placeholder="文字、字母或数字" required /></label><label>登录口令<input id="new-account-password" type="password" minlength="6" maxlength="64" autocomplete="new-password" required /></label><label>确认口令<input id="new-account-password-confirm" type="password" minlength="6" maxlength="64" autocomplete="new-password" required /></label>${hasMeaningfulStudyData() ? '<label class="account-copy-option"><input id="copy-current-progress" type="checkbox" /> 将当前进度复制到新本机账户</label>' : ""}<button class="primary-button" type="submit">创建并登录</button></form></section>
    ${current.type === "local" ? `<section class="account-form-section account-session-actions"><h4>当前账户操作</h4><button type="button" class="outline-button" id="logout-account">退出到访客模式</button><form id="delete-account-form" class="account-delete-form"><input id="delete-account-password" type="password" minlength="6" maxlength="64" autocomplete="current-password" placeholder="输入口令确认删除" required /><button type="submit" class="danger-button">删除此账户及本机数据</button></form></section>` : ""}
    <div class="cloud-sync-status"><span>隐私</span><div><strong>云端仅同步轻量学习状态</strong><p>不会上传本机账户口令和录音；Publishable key 只能按 RLS 访问当前登录用户自己的记录。</p><a class="text-link cloud-schema-link" href="./supabase/schema.sql" target="_blank" rel="noreferrer">打开数据库初始化脚本 →</a></div></div>`;

  if (cloudInitializationError) setAccountMessage(cloudInitializationError, true);

  $("#cloud-account-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setAccountMessage("正在登录云账户……");
    try {
      const email = $("#cloud-account-email").value;
      const data = await signInCloud(email, $("#cloud-account-password").value);
      if ($("#copy-current-to-cloud")?.checked) stageCloudMigration(email, state);
      setCloudAccount(data.user);
      location.reload();
    } catch (error) {
      setAccountMessage(error.message, true);
      submitButton.disabled = false;
    }
  });

  $("#register-cloud-account")?.addEventListener("click", async (event) => {
    const registerButton = event.currentTarget;
    const form = $("#cloud-account-form");
    if (!form.reportValidity()) return;
    const displayName = $("#cloud-account-name").value.trim();
    if (!displayName) {
      setAccountMessage("注册云账户时请填写显示名称。", true);
      $("#cloud-account-name").focus();
      return;
    }
    registerButton.disabled = true;
    setAccountMessage("正在注册云账户……");
    try {
      const email = $("#cloud-account-email").value;
      const data = await signUpCloud(email, $("#cloud-account-password").value, displayName);
      if ($("#copy-current-to-cloud")?.checked) stageCloudMigration(email, state);
      if (data.session?.user) {
        setCloudAccount(data.session.user);
        location.reload();
        return;
      }
      setAccountMessage("注册申请已提交，请打开邮箱确认后返回网站登录。若未收到邮件，请先配置 Supabase 自定义 SMTP。");
    } catch (error) {
      setAccountMessage(error.message, true);
    } finally {
      registerButton.disabled = false;
    }
  });

  $("#sync-cloud-now")?.addEventListener("click", async (event) => {
    const syncButton = event.currentTarget;
    syncButton.disabled = true;
    setAccountMessage("正在上传本机学习记录……");
    try {
      await forceUploadCloudState(state);
      setAccountMessage("云同步完成。");
      renderCloudIndicator();
    } catch (error) {
      setAccountMessage(error.message, true);
    } finally {
      syncButton.disabled = false;
    }
  });

  $("#download-cloud-state")?.addEventListener("click", async (event) => {
    if (!confirm("确定用云端记录覆盖当前设备上的学习记录吗？建议先导出本机备份。")) return;
    const downloadButton = event.currentTarget;
    downloadButton.disabled = true;
    setAccountMessage("正在下载云端学习记录……");
    try {
      state = await forceDownloadCloudState();
      saveState(state, false, current.id);
      location.reload();
    } catch (error) {
      setAccountMessage(error.message, true);
    } finally {
      downloadButton.disabled = false;
    }
  });

  $("#logout-cloud-account")?.addEventListener("click", async () => {
    try {
      await signOutCloud();
    } catch {}
    clearCloudAccount();
    useGuestAccount();
    location.reload();
  });

  $("#switch-account-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setAccountMessage("正在验证账户……");
    try {
      const accountId = $("#switch-account-id").value;
      await authenticateLocalAccount(accountId, $("#switch-account-password").value);
      if (current.type === "cloud") {
        await signOutCloud();
        clearCloudAccount();
      }
      setActiveAccount(accountId);
      location.reload();
    } catch (error) {
      setAccountMessage(error.message, true);
      submitButton.disabled = false;
    }
  });

  $("#create-account-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    const password = $("#new-account-password").value;
    if (password !== $("#new-account-password-confirm").value) {
      setAccountMessage("两次输入的登录口令不一致。", true);
      return;
    }
    submitButton.disabled = true;
    setAccountMessage("正在创建本机账户……");
    try {
      const account = await createLocalAccount({
        displayName: $("#new-account-name").value,
        username: $("#new-account-username").value,
        password,
      });
      if ($("#copy-current-progress")?.checked) saveStateForAccount(state, account.id, false);
      if (current.type === "cloud") {
        await signOutCloud();
        clearCloudAccount();
      }
      setActiveAccount(account.id);
      location.reload();
    } catch (error) {
      setAccountMessage(error.message, true);
      submitButton.disabled = false;
    }
  });

  $("#logout-account")?.addEventListener("click", () => {
    useGuestAccount();
    location.reload();
  });

  $("#delete-account-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!confirm(`确定删除账户“${current.displayName}”及其本机学习数据吗？此操作无法撤销。`)) return;
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setAccountMessage("正在删除账户数据……");
    try {
      await deleteLocalAccount(current.id, $("#delete-account-password").value);
      deleteStateForAccount(current.id);
      await deleteRecordingsForAccount(current.id).catch(() => {});
      useGuestAccount();
      location.reload();
    } catch (error) {
      setAccountMessage(error.message, true);
      submitButton.disabled = false;
    }
  });
}

async function initializeCloudSession() {
  try {
    const session = await initializeCloudAuth();
    if (!session?.user) {
      if (getCurrentAccount().type === "cloud") {
        clearCloudAccount();
        useGuestAccount();
        state = loadState();
      }
      return;
    }
    const account = setCloudAccount(session.user);
    state = loadState(account.id);
    const result = await reconcileCloudState(
      state,
      (remote) => confirm(`云端已有版本 ${remote.revision} 的学习记录。确定用登录前保存的本机进度覆盖云端吗？\n\n选择“取消”将使用云端记录。`),
    );
    state = result.state;
    saveState(state, false, account.id);
  } catch (error) {
    cloudInitializationError = error.message;
  }
}

function initializeDataManager() {
  renderAccountChrome();
  $("#data-button").addEventListener("click", () => {
    renderAccountChrome();
    $("#data-dialog").showModal();
  });
  $("#cloud-sync-indicator").addEventListener("click", () => {
    renderAccountChrome();
    $("#data-dialog").showModal();
  });
  $("#manage-account").addEventListener("click", () => {
    $("#data-dialog").close();
    renderAccountManager();
    $("#account-dialog").showModal();
  });
  $("#close-account-dialog").addEventListener("click", () => $("#account-dialog").close());
  $("#export-data").addEventListener("click", () => {
    exportState(state, getCurrentAccount());
    renderBackupReminder();
  });
  $("#import-data").addEventListener("change", async (event) => {
    try {
      state = await importState(event.target.files[0]);
      if (getCurrentAccount().type === "cloud") await forceUploadCloudState(state);
      alert("备份导入成功，页面将刷新。" );
      location.reload();
    } catch (error) {
      alert(error.message);
    }
  });
  $("#reset-data").addEventListener("click", async () => {
    const account = getCurrentAccount();
    if (!confirm(`确定清空“${account.displayName}”的学习记录、笔记和本机录音吗？账户本身会保留，此操作无法撤销。`)) return;
    const accountId = getActiveAccountId();
    state = resetState(accountId);
    await deleteRecordingsForAccount(accountId).catch(() => {});
    if (account.type === "cloud") {
      saveState(state, false, accountId);
      try {
        await forceUploadCloudState(state);
      } catch (error) {
        queueCloudSync(state, { immediate: true });
        alert(`本机数据已清空，但云端清空失败：${error.message}`);
      }
    }
    location.reload();
  });
}

function initializePwa() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    $("#install-button").hidden = false;
  });
  $("#install-button").addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    $("#install-button").hidden = true;
  });
  if ("serviceWorker" in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`);
        await registration.update();
      } catch {}
    });
  }
}

function initializeNavigation() {
  $$("[data-route]").forEach((item) => item.addEventListener("click", (event) => {
    event.preventDefault();
    activeTaskDay = null;
    navigate(item.dataset.route);
  }));
  $$('[data-jump="today"]').forEach((item) => item.addEventListener("click", () => {
    activeTaskDay = null;
    const day = getCurrentPlanDay();
    activePhase = day >= 1 && day <= 90 ? PLAN[day - 1].phase : "all";
    navigate("plan", { focusToday: true });
  }));
  $$('[data-open-lesson]').forEach((item) => item.addEventListener("click", () => {
    activeTaskDay = null;
    activeLessonId = item.dataset.openLesson;
    navigate("lessons");
  }));
  $("#practice-lesson-button").addEventListener("click", () => {
    activeLessonId = activePracticeModule === "eartraining" ? "ear-training-method" : activePracticeModule === "sentences" ? "writing-method" : `${activePracticeModule}-method`;
    navigate("lessons");
  });
  $("#mobile-menu").addEventListener("click", () => document.body.classList.toggle("menu-open"));
  window.addEventListener("hashchange", () => navigate(location.hash.slice(1), { instant: true }));
}

function initializeDailyPlanning() {
  $("#daily-mode-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-daily-mode]");
    if (!button) return;
    const mode = Number(button.dataset.dailyMode);
    if (!DAILY_MODE_OPTIONS.includes(mode) || mode === selectedDailyMode()) return;
    state.profile.dailyMode = mode;
    persist();
    renderDashboard();
  });
  $("#today-primary-action").addEventListener("click", () => {
    const context = currentTaskContext();
    const target = primaryDailyTarget(context);
    if (target.task) {
      openTask(target.task, context.day);
      return;
    }
    (context.tasks.length ? $("#today-standard") : $("#weakness-report"))?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function initializeVocabulary() {
  currentWordIndex = 0;
  $("#vocab-book-select").addEventListener("change", (event) => {
    vocabularySettings().book = event.target.value;
    currentWordIndex = 0;
    forcedVocabularyWord = null;
    vocabularyCardRevealed = false;
    vocabularyBrowserPage = 0;
    persist();
    renderVocabulary();
  });
  $("#vocab-daily-new").addEventListener("change", (event) => {
    vocabularySettings().dailyNew = Number(event.target.value);
    currentWordIndex = 0;
    vocabularyCardRevealed = false;
    persist();
    renderVocabulary();
  });
  $("#vocab-mode-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-vocab-mode]");
    if (!button) return;
    vocabularySettings().mode = button.dataset.vocabMode;
    vocabularyCardRevealed = false;
    vocabularySpellingResult = null;
    persist();
    renderVocabulary();
  });
  $("#word-card").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button?.matches("[data-vocab-speak]")) {
      const entry = currentVocabularyEntry();
      if (entry) pronounce(entry.word, 0.78);
      return;
    }
    if (button?.matches("[data-vocab-reveal]")) {
      revealVocabularyCard();
      return;
    }
    if (button?.matches("[data-memory]")) {
      animateVocabularyReview(button.dataset.memory, "memory-button");
      return;
    }
    if (button?.matches("[data-vocab-next-default]")) {
      const result = vocabularySpellingResult ? (vocabularySpellingResult.correct ? "known" : "forgot") : "unsure";
      animateVocabularyReview(result, "card-tap");
      return;
    }
    if (button?.matches("[data-vocab-browse]")) {
      $(".vocab-browser-panel").open = true;
      $(".vocab-browser-panel").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (event.target.closest("input, form")) return;
    if (Date.now() - vocabularySwipeAt < 300) return;
    if (vocabularyCardRevealed) {
      const result = vocabularySpellingResult ? (vocabularySpellingResult.correct ? "known" : "forgot") : "unsure";
      animateVocabularyReview(result, "card-tap");
    }
    else revealVocabularyCard();
  });
  $("#word-card").addEventListener("submit", (event) => {
    if (event.target.id !== "vocab-spelling-form") return;
    event.preventDefault();
    const entry = currentVocabularyEntry();
    if (!entry) return;
    const answer = normalizeSelectionText($("#vocab-spelling-input").value).toLocaleLowerCase();
    vocabularySpellingResult = { correct: answer === entry.word.toLocaleLowerCase() };
    vocabularyCardRevealed = true;
    renderVocabulary();
  });
  $("#word-card").addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, input, form")) return;
    vocabularyPointerStart = { x: event.clientX, y: event.clientY };
    $("#word-card").classList.add("is-dragging");
  });
  $("#word-card").addEventListener("pointermove", (event) => {
    if (!vocabularyPointerStart) return;
    const distance = event.clientX - vocabularyPointerStart.x;
    if (Math.abs(distance) < 8) return;
    $("#word-card").style.transform = `translateX(${clamp(distance, -110, 110)}px) rotate(${clamp(distance / 30, -3, 3)}deg)`;
  });
  $("#word-card").addEventListener("pointerup", (event) => {
    if (!vocabularyPointerStart) return;
    const distanceX = event.clientX - vocabularyPointerStart.x;
    const distanceY = event.clientY - vocabularyPointerStart.y;
    vocabularyPointerStart = null;
    $("#word-card").classList.remove("is-dragging");
    $("#word-card").style.transform = "";
    if (Math.abs(distanceX) < 70 || Math.abs(distanceX) < Math.abs(distanceY) * 1.4) return;
    vocabularySwipeAt = Date.now();
    animateVocabularyReview(distanceX > 0 ? "known" : "forgot", distanceX > 0 ? "swipe-right" : "swipe-left");
  });
  $("#word-card").addEventListener("pointercancel", () => {
    vocabularyPointerStart = null;
    $("#word-card").classList.remove("is-dragging");
    $("#word-card").style.transform = "";
  });
  $("#vocab-search").addEventListener("input", () => {
    vocabularyBrowserPage = 0;
    renderVocabularyBrowser();
  });
  ["#vocab-browser-scope", "#vocab-browser-status", "#vocab-browser-topic"].forEach((selector) => {
    $(selector)?.addEventListener("change", () => {
      vocabularyBrowserPage = 0;
      renderVocabularyBrowser();
    });
  });
  $("#vocab-load-more").addEventListener("click", () => {
    vocabularyBrowserPage += 1;
    renderVocabularyBrowser();
  });
  $("#vocab-browser-results").addEventListener("click", (event) => {
    const button = event.target.closest("[data-vocab-open-word]");
    if (!button) return;
    forcedVocabularyWord = button.dataset.vocabOpenWord;
    vocabularyCardRevealed = false;
    vocabularySpellingResult = null;
    $("#word-card").scrollIntoView({ behavior: "smooth", block: "center" });
    renderVocabulary();
  });
  $("#start-vocab-test").addEventListener("click", startVocabularyTest);
}

function initializePractice() {
  $$('[data-module]').forEach((button) => {
    button.addEventListener("click", () => {
      activePracticeModule = button.dataset.module;
      activePracticeIndex = 0;
      $$('[data-module]').forEach((item) => item.classList.toggle("is-selected", item === button));
      renderPracticeWorkspace();
    });
  });
}

async function initialize() {
  await initializeCloudSession();
  if (reconcileCompletedDays()) persist();
  $("#release-link").dataset.version = APP_VERSION;
  subscribeCloudStatus(renderCloudIndicator);
  window.addEventListener("online", () => queueCloudSync(state, { immediate: true }));
  initializeNavigation();
  initializeDailyPlanning();
  initializeVocabulary();
  initializePractice();
  initializeNotes();
  initializeSelectionTranslator();
  initializeDataManager();
  initializePwa();
  renderGlobalProgress();
  renderDashboard();
  renderVocabulary();
  renderPracticeWorkspace();
  const initialRoute = location.hash.slice(1);
  navigate(ROUTE_TITLES[initialRoute] ? initialRoute : "dashboard", { instant: true });
}

initialize().catch((error) => {
  console.error(error);
  alert("应用初始化失败，请刷新页面重试。" );
});
