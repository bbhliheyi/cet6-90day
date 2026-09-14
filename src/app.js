import {
  APP_VERSION,
  EXAM_CONFIG,
  PHASES,
  PRACTICE_CONTENT,
  PREP_TASKS,
  SKILL_LABELS,
  VOCABULARY,
  buildPlan,
  dailyCoreSentences,
} from "./content.js?v=0.4.0";
import { RESOURCE_CATALOG } from "./resources.js?v=0.4.0";
import { EAR_TRAINING_UNITS } from "./ear-training.js?v=0.4.0";
import { LESSONS, LESSON_BY_ID as LESSON_LIBRARY, MODULE_ANALYSIS, dailyTaskGuidance } from "./lessons.js?v=0.4.0";
import { deleteRecordingsForAccount, getLatestRecording, saveRecording } from "./db.js?v=0.4.0";
import {
  authenticateLocalAccount,
  createLocalAccount,
  deleteLocalAccount,
  getActiveAccountId,
  getCurrentAccount,
  listLocalAccounts,
  setActiveAccount,
  useGuestAccount,
} from "./accounts.js?v=0.4.0";
import {
  deleteStateForAccount,
  exportState,
  importState,
  loadState,
  resetState,
  saveState,
  saveStateForAccount,
} from "./storage.js?v=0.4.0";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const ROUTE_TITLES = Object.freeze({
  dashboard: "学习首页",
  plan: "90天计划",
  vocabulary: "单词训练",
  sentences: "每日核心句",
  eartraining: "每日磨耳朵",
  practice: "专项训练",
  lessons: "系统讲解",
  notices: "官方通知",
  notes: "学习笔记",
  resources: "资料中心",
});

const PLAN = buildPlan();
let state = loadState();
let currentRoute = "dashboard";
let currentWordIndex = 0;
let activePhase = "all";
let activePracticeModule = "listening";
let activePracticeIndex = 0;
let activeLessonId = "vocabulary-method";
let activeEarIndex = 0;
let vocabularyTest = null;
let deferredInstallPrompt = null;
let workspaceTimer = null;
let mediaRecorder = null;
let recordingStream = null;
let recordingContext = null;
let noteSaveTimer = null;

function persist() {
  saveState(state);
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

function recalculateDay(day) {
  if (day < 1 || day > 90) return;
  const complete = PLAN[day - 1].tasks.every((item) => taskIsComplete(day, item.id));
  if (complete) state.completedDays[day] ||= new Date().toISOString();
  else delete state.completedDays[day];
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
  $("#sidebar-progress-detail").textContent = `已完成 ${completed} / 90 天`;
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
  return "plan";
}

function renderContinueLearning(context) {
  const container = $("#continue-learning");
  if (!container) return;
  const incomplete = context.tasks.find((item) => !taskIsComplete(context.day, item.id));
  const activity = state.lastActivity;
  const target = activity || (incomplete ? { label: incomplete.title, detail: incomplete.detail, route: moduleRouteForTask(incomplete), practiceModule: incomplete.module } : null);
  if (!target) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }
  const route = ROUTE_TITLES[target.route] ? target.route : "plan";
  const label = activity ? "继续上次学习" : "下一项任务";
  const practiceModule = route === "practice" && ["listening", "reading", "writing", "translation", "speaking"].includes(target.practiceModule) ? target.practiceModule : "";
  container.hidden = false;
  container.innerHTML = `<span class="continue-kicker">${label}</span><strong>${escapeHtml(target.label)}</strong><small>${escapeHtml(target.detail || "从上次进度继续，不必重新选择。")}</small><button class="continue-button" data-continue-route="${escapeHtml(route)}" data-continue-module="${escapeHtml(practiceModule)}">${activity ? "继续" : "开始"} →</button>`;
  $("[data-continue-route]", container).addEventListener("click", (event) => {
    if (event.currentTarget.dataset.continueModule) {
      activePracticeModule = event.currentTarget.dataset.continueModule;
      activePracticeIndex = 0;
    }
    navigate(route);
  });
}

function renderBackupReminder() {
  const container = $("#backup-reminder");
  if (!container) return;
  const hasLearningData = Object.keys(state.completedTasks || {}).length
    || Object.keys(state.vocabulary || {}).length
    || Object.keys(state.sentenceProgress || {}).length
    || Object.keys(state.earTraining || {}).length
    || (state.practiceAttempts || []).length
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
  if (mediaRecorder?.state === "recording") stopRecording(recordingContext?.startId, recordingContext?.stopId);
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
  if (route === "plan") renderPlan(options.focusToday);
  if (route === "vocabulary") renderVocabulary();
  if (route === "sentences") renderSentences();
  if (route === "eartraining") renderEarTraining();
  if (route === "practice") renderPracticeWorkspace();
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

function renderTodayTasks(context) {
  const container = $("#today-tasks");
  if (!context.tasks.length) {
    container.innerHTML = `<article class="empty-state"><strong>本周期已结束</strong><p>请查看官方通知确认下一次考试安排，并导出本周期学习数据。</p></article>`;
    return;
  }
  container.innerHTML = context.tasks
    .map((item) => {
      const checked = taskIsComplete(context.day, item.id);
      return `<label class="task-card ${checked ? "is-complete" : ""}">
        <input type="checkbox" data-dashboard-task="${item.id}" ${checked ? "checked" : ""} />
        <span class="task-check">✓</span>
        <span class="task-content">
          <small>${SKILL_LABELS[item.module] || item.module} · ${item.minutes}分钟</small>
          <strong>${item.title}</strong>
          <span>${item.detail}</span>
        </span>
      </label>`;
    })
    .join("");

  $$('[data-dashboard-task]', container).forEach((input) => {
    input.addEventListener("change", () => {
      const taskData = context.tasks.find((item) => item.id === input.dataset.dashboardTask);
      toggleTask(context.day, taskData, input.checked);
    });
  });
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
  $("#exam-countdown").textContent = countdownDays(EXAM_CONFIG.writtenExam);
  $("#today-date").textContent = formatToday();
  if (context.day === 0) {
    $("#cycle-status").textContent = "准备期";
    $("#today-guidance").textContent = "先核对报名状态、目标分和设备，正式训练从9月13日开始。";
  } else if (context.day <= 90) {
    $("#cycle-status").textContent = `DAY ${context.day}`;
    $("#today-guidance").textContent = `${PLAN[context.day - 1].phaseLabel}：${context.title}，预计${PLAN[context.day - 1].estimatedMinutes}分钟。`;
  } else {
    $("#cycle-status").textContent = "已结束";
    $("#today-guidance").textContent = "本周期90天计划已经结束，请导出数据并查看最新官方通知。";
  }
  renderTodayTasks(context);
  renderContinueLearning(context);
  renderTodayStandard(context);
  renderBackupReminder();
  renderSkillBars();
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  const weeklyMinutes = Object.values(state.completedTasks)
    .filter((item) => new Date(item.completedAt).getTime() >= sevenDaysAgo)
    .reduce((sum, item) => sum + (item.minutes || 0), 0);
  $("#weekly-duration").textContent = `${weeklyMinutes} 分钟`;
  renderWeaknessReport();
}

function renderTodayStandard(context) {
  const container = $("#today-standard");
  if (!container) return;
  if (!context.tasks.length) {
    container.innerHTML = `<div class="card-heading"><div><p class="eyebrow">TODAY'S STANDARD</p><h3>本周期任务已结束</h3></div></div><p class="muted">请以最新官方通知为准，导出本周期数据并等待下一轮计划。</p>`;
    return;
  }
  const summary = taskCompletionSummary(context.day, context.tasks);
  const phase = context.day > 0 && context.day <= 90 ? PLAN[context.day - 1].phaseLabel : "准备期";
  container.innerHTML = `<div class="card-heading"><div><p class="eyebrow">TODAY'S STANDARD · ${context.day > 0 ? `DAY ${context.day}` : "PREP"}</p><h3>今日${summary.completed === summary.total ? "已达标" : "完成标准"}</h3></div><strong class="standard-percent">${summary.percent}%</strong></div><div class="standard-progress"><i style="width:${summary.percent}%"></i></div><p class="standard-summary">已完成 <b>${summary.completed}/${summary.total}</b> 项 · ${summary.minutes}/${summary.totalMinutes} 分钟 · 阶段：${phase}</p><div class="standard-task-list">${context.tasks.map((item) => {
    const guidance = dailyTaskGuidance(context.day, item, phase) || {};
    const route = ["vocabulary", "sentences"].includes(item.module) ? item.module : item.module === "eartraining" ? "eartraining" : item.module === "listening" ? "practice" : null;
    return `<div class="standard-task ${taskIsComplete(context.day, item.id) ? "is-complete" : ""}"><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(guidance.quantity || item.detail)}</small><small>达标：${escapeHtml(guidance.criterion || "完成并留下可复查记录")}</small></div>${route ? `<button class="text-button" data-open-module="${route}">开始 →</button>` : ""}</div>`;
  }).join("")}</div><p class="standard-note">判定规则：所有今日任务都完成，才算“今日达标”；只完成部分任务会保留进度，但不会计入完整天数。</p>`;
  $$('[data-open-module]', container).forEach((button) => button.addEventListener("click", () => navigate(button.dataset.openModule)));
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
  container.innerHTML = `<div class="card-heading"><div><p class="eyebrow">GAP ANALYSIS</p><h3>查缺补漏</h3></div><span class="muted">前三项</span></div><div class="weakness-list">${rows.map(({ module, average, analysis }) => `<div class="weakness-row"><div><strong>${escapeHtml(analysis.title)}</strong><small>最近${(grouped[module] || []).length}次平均 ${average}% · 参考线 ${analysis.threshold}%</small><p>${escapeHtml(analysis.action)}</p></div><button class="text-button" data-open-module="${module === "eartraining" ? "eartraining" : module === "sentences" ? "sentences" : "practice"}">去补漏 →</button></div>`).join("")}</div><p class="standard-note">这是本站训练数据的趋势提示，不等同于正式考试成绩；每周至少复盘一次错因。</p>`;
  $$('[data-open-module]', container).forEach((button) => button.addEventListener("click", () => navigate(button.dataset.openModule)));
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
  return { completed, total: planDay.tasks.length };
}

function renderPlan(focusToday = false) {
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
      const current = planDay.day === currentDay;
      return `<details class="plan-day ${current ? "is-current" : ""} ${complete ? "is-complete" : ""}" id="day-${planDay.day}" ${current ? "open" : ""}>
        <summary>
          <span class="day-number" style="--phase-color:${planDay.phaseColor}">DAY ${planDay.day}</span>
          <span class="day-summary"><small>${planDay.dateLabel} · ${planDay.phaseLabel}</small><strong>${planDay.title}</strong></span>
          <span class="day-time">${planDay.estimatedMinutes}分钟</span>
          <span class="day-progress">${complete ? "已完成" : `${progress.completed}/${progress.total}`}</span>
        </summary>
        <div class="plan-day-body">
          <p>${planDay.objective}</p>
          <div class="plan-task-list">${planDay.tasks
            .map((item) => `<label class="plan-task ${taskIsComplete(planDay.day, item.id) ? "is-complete" : ""}">
              <input type="checkbox" data-plan-day="${planDay.day}" data-plan-task="${item.id}" ${taskIsComplete(planDay.day, item.id) ? "checked" : ""} />
              <span>✓</span><div><strong>${item.title}</strong><small>${SKILL_LABELS[item.module]} · ${item.minutes}分钟 · ${item.detail}</small></div>
            </label>`)
            .join("")}</div>
          <div class="assessment-line"><strong>当日验收</strong><span>${planDay.assessment}</span></div>
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

  if (focusToday && currentDay >= 1 && currentDay <= 90) {
    requestAnimationFrame(() => $("#day-" + currentDay)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }
}

function vocabularyRecord(word) {
  return state.vocabulary[word] || { level: 0, status: "new", lapses: 0, reviews: 0, correctStreak: 0, history: [], nextReviewAt: null };
}

function dueVocabularyIndexes() {
  const now = Date.now();
  const due = VOCABULARY.map((entry, index) => ({ entry, index, record: vocabularyRecord(entry.word) }))
    .filter(({ record }) => record.status === "new" || !record.nextReviewAt || new Date(record.nextReviewAt).getTime() <= now)
    .sort((a, b) => (a.record.nextReviewAt || "").localeCompare(b.record.nextReviewAt || ""));
  return (due.length ? due : VOCABULARY.map((entry, index) => ({ entry, index }))).map((item) => item.index);
}

function renderVocabularyStats() {
  const records = VOCABULARY.map((entry) => vocabularyRecord(entry.word));
  const known = records.filter((record) => record.status === "known").length;
  const unsure = records.filter((record) => ["unsure", "forgot"].includes(record.status)).length;
  const fresh = VOCABULARY.length - known - unsure;
  const rate = Math.round((known / VOCABULARY.length) * 100);
  const today = todayInChina();
  const todayCount = records.filter((record) => record.lastReviewedAt?.startsWith(today)).length;
  $("#vocab-today-count").textContent = todayCount;
  $("#vocab-today-bar").style.width = `${Math.min(100, (todayCount / 30) * 100)}%`;
  $("#vocab-master-rate").textContent = `${rate}%`;
  $("#known-count").textContent = known;
  $("#unsure-count").textContent = unsure;
  $("#new-count").textContent = fresh;
  $("#vocab-donut").style.setProperty("--progress", `${rate * 3.6}deg`);
}

function renderVocabulary() {
  const entry = VOCABULARY[currentWordIndex];
  $("#word-progress").textContent = `${currentWordIndex + 1} / ${VOCABULARY.length}`;
  $("#word-text").textContent = entry.word;
  $("#word-pos").textContent = entry.pos;
  $("#word-meaning").textContent = entry.meaning;
  $("#word-example").textContent = entry.example;
  $("#word-collocation").textContent = `搭配：${entry.collocation}`;
  $("#word-answer").hidden = true;
  $("#reveal-word").hidden = false;
  $("#word-card").dataset.status = vocabularyRecord(entry.word).status;
  renderVocabularyStats();
  renderMemoryProfile();
}

function renderMemoryProfile() {
  const container = $("#memory-profile");
  const stage = $("#memory-stage");
  if (!container || !stage) return;
  const entry = VOCABULARY[currentWordIndex];
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

function learningDay() {
  const day = getCurrentPlanDay();
  return day < 1 ? 1 : Math.min(90, day);
}

function markCurrentTask(module, completed) {
  const context = currentTaskContext();
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
  $("#sentence-day-label").textContent = `DAY ${day} · ${readCount}/3 已读 · ${recallCount}/2 汉译英 · ${applyCount}/1 改写${achieved ? " · 今日达标" : ""}`;
  $("#sentence-list").innerHTML = sentences.map((sentence) => {
    const item = sentenceProgress(day, sentence.id);
    return `<article class="sentence-card ${item.read && item.recall && item.apply ? "is-complete" : ""}">
      <div class="sentence-card-heading"><div><span class="sentence-topic">${escapeHtml(sentence.topic)}</span><h3>${escapeHtml(sentence.english)}</h3></div><button class="icon-button" data-sentence-speak="${escapeHtml(sentence.english)}" aria-label="朗读核心句">🔊</button></div>
      <details class="sentence-detail"><summary>查看中文、句型和用途</summary><p><b>中文：</b>${escapeHtml(sentence.chinese)}</p><p><b>句型：</b><code>${escapeHtml(sentence.pattern)}</code></p><p><b>关键词：</b>${sentence.keywords.map((keyword) => `<span class="keyword-chip">${escapeHtml(keyword)}</span>`).join(" ")}</p><p><b>写作用途：</b>${escapeHtml(sentence.writingUse)}</p><p><b>口语用途：</b>${escapeHtml(sentence.speakingUse)}</p><small>${escapeHtml(sentence.note)}</small></details>
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
  return unit.segments.map((segment) => `<p><b>${escapeHtml(segment.speaker)}：</b>${escapeHtml(segment.text)}</p>`).join("");
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
  $("#ear-day-label").textContent = `DAY ${day} · ${completedStages}/5 步${completedStages === 5 ? " · 今日达标" : ""}`;
  $("#ear-workspace").innerHTML = `<div class="workspace-heading"><div><p class="eyebrow">${escapeHtml(unit.type)} · ORIGINAL MATERIAL</p><h3>${escapeHtml(unit.title)}</h3><p class="muted">${escapeHtml(unit.context)}</p></div><button class="outline-button" id="next-ear-unit">换一段</button></div>
    <div class="ear-meta"><span>训练目标：${escapeHtml(unit.target)}</span><strong>${completedStages}/5 步</strong></div>
    <div class="ear-progress"><i style="width:${(completedStages / 5) * 100}%"></i></div>
    <div class="audio-training ear-audio-card"><div class="audio-visual" aria-hidden="true">${Array.from({ length: 44 }, (_, index) => `<i style="height:${18 + ((index * 17) % 46)}%"></i>`).join("")}</div><div class="audio-controls"><button class="primary-button" id="play-ear">▶ ${progress.blind ? "再次盲听" : "开始盲听"}</button><button class="ghost-button" id="stop-ear">停止</button><label>速度<select id="ear-rate"><option value="0.8" ${recommendedRate === "0.8" ? "selected" : ""}>0.8×</option><option value="0.9" ${recommendedRate === "0.9" ? "selected" : ""}>0.9×</option><option value="1" ${recommendedRate === "1.0" ? "selected" : ""}>1.0×</option><option value="1.1" ${recommendedRate === "1.1" ? "selected" : ""}>1.1×</option><option value="1.2" ${recommendedRate === "1.2" ? "selected" : ""}>1.2×</option></select></label></div><small class="ear-speed-tip">阶段建议 ${recommendedRate}×：从0.8×起步，每7天提高0.1×；若主旨正确率低于70%，先保持当前速度。</small></div>
    <div class="local-audio-row"><label class="file-button outline-button">导入本人授权音频<input type="file" id="ear-audio-file" accept="audio/*" hidden /></label><small>浏览器朗读仅用于流程训练；正式备考请使用官网或个人授权音频。</small><audio id="ear-local-audio" controls ${earAudioUrl ? "" : "hidden"} src="${earAudioUrl || ""}"></audio></div>
    <div class="ear-stage"><div class="stage-heading"><span>01</span><div><strong>盲听与场景预测</strong><small>不看文本，先判断材料类型、人物/主题和信息目的。</small></div><button class="sentence-check ${progress.blind ? "is-done" : ""}" data-ear-stage="blind">${progress.blind ? "✓ 已完成" : "标记完成"}</button></div></div>
    <div class="ear-stage"><div class="stage-heading"><span>02</span><div><strong>主旨与结构题</strong><small>盲听后先作答，再查看文本；不要因漏听一个词停住。</small></div></div><div class="question-block"><strong>${escapeHtml(unit.gist.question)}</strong><div class="practice-options">${unit.gist.options.map((option, index) => `<label><input type="radio" name="ear-gist" value="${index}" ${progress.gistAnswered && progress.gistAnswer === index ? "checked" : ""} ${progress.gistAnswered ? "disabled" : ""} /><span>${String.fromCharCode(65 + index)}. ${escapeHtml(option)}</span></label>`).join("")}</div>${progress.gistAnswered ? `<div class="inline-feedback ${progress.gist ? "success" : "error"}"><strong>${progress.gist ? "主旨判断正确" : `正确答案：${String.fromCharCode(65 + unit.gist.answer)}`}</strong><p>${escapeHtml(unit.gist.explanation)}</p>${progress.gist ? "" : '<button id="retry-ear-gist">重新作答</button>'}</div>` : `<button class="primary-button" id="submit-ear-gist" ${progress.blind ? "" : "disabled"}>提交主旨判断</button>`}</div></div>
    <div class="ear-stage ${progress.gistAnswered ? "" : "is-locked"}"><div class="stage-heading"><span>03</span><div><strong>关键语块听写</strong><small>只听写3个承载意义的语块，区分词不认识和连读弱读。</small></div></div><div class="chunk-grid">${unit.focusChunks.map((chunk, index) => `<label><span>语块${index + 1}</span><input data-ear-chunk="${index}" value="${escapeHtml(progress[`chunk${index}`] || "")}" placeholder="听到后填写" ${progress.gistAnswered ? "" : "disabled"} /><small>${progress[`chunk${index}Correct`] ? "✓ 匹配" : ""}</small></label>`).join("")}</div><button class="outline-button" id="check-ear-chunks" ${progress.gistAnswered ? "" : "disabled"}>检查语块并对照文本</button><span class="save-inline" id="ear-chunk-result">${progress.dictation ? `已对${progress.dictation}/${dictationTotal}个` : ""}</span></div>
    <div class="ear-stage ${progress.gistAnswered ? "" : "is-locked"}"><div class="stage-heading"><span>04</span><div><strong>影子跟读</strong><small>打开文本，跟在音频后复述句群；先0.8倍，再逐周提高0.1倍。</small></div><button class="sentence-check ${progress.shadow ? "is-done" : ""}" data-ear-stage="shadow" ${progress.gistAnswered ? "" : "disabled"}>${progress.shadow ? "✓ 已完成" : "跟读2轮并标记"}</button></div>${progress.gistAnswered ? `<details class="ear-transcript"><summary>查看原文与信号词</summary><div>${renderEarTranscript(unit)}</div><p><b>本段信号：</b>${unit.signals.map((signal) => `<span class="keyword-chip">${escapeHtml(signal)}</span>`).join(" ")}</p></details><div class="ear-recording-panel"><div class="recording-status"><i id="ear-recording-dot"></i><span id="ear-recording-status">录下自己的跟读，再和原音对比</span><strong id="ear-recording-duration">00:00</strong></div><div class="recording-actions"><button class="primary-button" id="start-ear-recording">开始跟读录音</button><button class="outline-button" id="stop-ear-recording" disabled>停止并保存</button></div><div id="latest-ear-recording"></div></div>` : ""}</div>
    <div class="ear-stage ${progress.gistAnswered ? "" : "is-locked"}"><div class="stage-heading"><span>05</span><div><strong>复述检验</strong><small>不看原文，用2—3句英文回答下面提示。</small></div><button class="sentence-check ${progress.retell ? "is-done" : ""}" data-ear-stage="retell" ${progress.gistAnswered ? "" : "disabled"}>${progress.retell ? "✓ 已复述" : "完成复述并标记"}</button></div><p class="muted">${escapeHtml(unit.summaryPrompt)}</p><textarea class="ear-retell" data-ear-retell placeholder="记录你的英文复述或关键词……" ${progress.gistAnswered ? "" : "disabled"}>${escapeHtml(progress.draft)}</textarea></div>`;

  $("#next-ear-unit").addEventListener("click", () => {
    activeEarIndex = (activeEarIndex + 1) % EAR_TRAINING_UNITS.length;
    renderEarTraining();
  });
  $("#play-ear").addEventListener("click", () => speakEarTraining(unit, Number($("#ear-rate").value)));
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
    nextDays = 0;
    record.lapses = (record.lapses || 0) + 1;
  } else if (result === "unsure") {
    level = Math.max(1, level);
    nextDays = 1;
  } else {
    level = Math.min(intervals.length, level + 1);
    nextDays = intervals[level - 1];
  }
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + nextDays);
  const nextRecord = {
    ...record,
    level,
    status: result === "known" ? "known" : result,
    reviews: (record.reviews || 0) + 1,
    correctStreak: result === "known" ? (record.correctStreak || 0) + 1 : 0,
    lastReviewedAt: reviewedAt.toISOString(),
    nextReviewAt: nextReview.toISOString(),
    history: [...(record.history || []), { reviewedAt: reviewedAt.toISOString(), result, source, levelBefore: record.level || 0, levelAfter: level, nextReviewAt: nextReview.toISOString() }].slice(-60),
  };
  state.vocabulary[entry.word] = nextRecord;
  return nextRecord;
}

function reviewWord(result) {
  const entry = VOCABULARY[currentWordIndex];
  updateVocabularyRecord(entry, result, "memory-card");
  recordActivity("vocabulary", `单词：${entry.word}`, entry.meaning);
  state.lastStudyDate = todayInChina();
  persist();
  const due = dueVocabularyIndexes();
  const position = due.indexOf(currentWordIndex);
  currentWordIndex = due[(position + 1) % due.length] ?? ((currentWordIndex + 1) % VOCABULARY.length);
  renderVocabulary();
}

function shuffled(items) {
  return [...items]
    .map((item) => ({ item, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item);
}

function startVocabularyTest() {
  vocabularyTest = { words: shuffled(VOCABULARY).slice(0, 10), index: 0, score: 0, answered: false };
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
      renderVocabularyStats();
    });
    return;
  }
  const word = vocabularyTest.words[vocabularyTest.index];
  const distractors = shuffled(VOCABULARY.filter((item) => item.word !== word.word)).slice(0, 3).map((item) => item.meaning);
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

function savePracticeAttempt(module, id, score) {
  state.practiceAttempts.push({ module, id, score, completedAt: new Date().toISOString() });
  const route = module === "eartraining" ? "eartraining" : module === "vocabulary" ? "vocabulary" : "practice";
  recordActivity(route, `${SKILL_LABELS[module] || module}训练`, id, { practiceModule: route === "practice" ? module : "" });
  state.lastStudyDate = todayInChina();
  persist();
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
  const items = PRACTICE_CONTENT[module];
  return items[activePracticeIndex % items.length];
}

function practiceHeader(item, label) {
  return `<div class="workspace-heading"><div><p class="eyebrow">${label}</p><h3>${item.title}</h3></div><button class="outline-button" id="next-practice-item">换一题</button></div>`;
}

function bindNextPractice() {
  $("#next-practice-item")?.addEventListener("click", () => {
    activePracticeIndex += 1;
    renderPracticeWorkspace();
  });
}

function renderListening() {
  const item = practiceItem("listening");
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
  $("#practice-workspace").innerHTML = `${practiceHeader(item, "READING")}
    <div class="reading-layout">
      <article class="reading-passage" id="reading-passage"><p>${item.passage}</p></article>
      <div class="question-block">
        <strong>${item.question}</strong>
        <div class="practice-options">${item.options.map((option, index) => `<label><input type="radio" name="reading-answer" value="${index}" /><span>${String.fromCharCode(65 + index)}. ${option}</span></label>`).join("")}</div>
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
    $("#reading-passage p").innerHTML = item.passage.replace(item.evidence, `<mark>${item.evidence}</mark>`);
    $("#reading-feedback").innerHTML = `<div class="inline-feedback ${correct ? "success" : "error"}"><strong>${correct ? "回答正确" : `正确答案：${String.fromCharCode(65 + item.answer)}`}</strong><p>${item.explanation}</p><p><b>题型：</b>${item.questionType || "信息定位题"}</p><p><b>证据句：</b>${item.evidence}</p><details><summary>逐项查看选项分析</summary><ol>${(item.optionAnalysis || []).map((analysis) => `<li>${analysis}</li>`).join("")}</ol></details></div>`;
    savePracticeAttempt("reading", item.id, correct ? 100 : 0);
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
      || (snapshot.practiceAttempts || []).length
      || snapshot.notes?.html
      || snapshot.studyMinutes,
  );
}

function accountInitials(displayName) {
  return Array.from(displayName || "访客").slice(0, 2).join("");
}

function renderAccountChrome() {
  const account = getCurrentAccount();
  const accountType = account.type === "local" ? "本机账户" : "访客模式";
  const button = $("#data-button");
  button.textContent = accountInitials(account.displayName);
  button.title = `${account.displayName} · 账户与数据`;
  button.setAttribute("aria-label", `打开${account.displayName}的账户与数据管理`);
  const summary = $("#account-summary");
  if (summary) {
    summary.innerHTML = `<span class="account-summary-avatar">${escapeHtml(accountInitials(account.displayName))}</span><div><strong>${escapeHtml(account.displayName)}</strong><small>${accountType}${account.type === "local" ? ` · @${escapeHtml(account.username)}` : " · 无需登录"}</small></div><span class="account-mode-badge">${account.type === "local" ? "已登录" : "访客"}</span>`;
  }
  const note = $("#data-storage-note");
  if (note) {
    note.textContent = account.type === "local"
      ? "该账户的进度、笔记和录音与其他本机账户隔离，当前仅保存在此浏览器。"
      : "访客进度单独保存在当前浏览器；创建本机账户后可复制现有进度。";
  }
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
  const copyGuestProgress = current.type === "guest" && hasMeaningfulStudyData();
  const holder = $("#account-dialog-content");
  holder.innerHTML = `
    <div class="account-security-note"><strong>当前为本机账户功能</strong><p>不同账户可独立保存学习记录；口令经过哈希处理，但数据仍只在当前浏览器，清理浏览器数据后可能丢失。</p></div>
    <div class="account-current-card">
      <span class="account-summary-avatar">${escapeHtml(accountInitials(current.displayName))}</span>
      <div><small>当前身份</small><strong>${escapeHtml(current.displayName)}</strong><p>${current.type === "local" ? `@${escapeHtml(current.username)} · 本机账户` : "访客模式 · 无需登录"}</p></div>
    </div>
    <p class="account-message" id="account-message" role="status" hidden></p>
    ${switchableAccounts.length ? `<section class="account-form-section"><h4>登录其他账户</h4><form id="switch-account-form" class="account-form"><label>账户<select id="switch-account-id" required>${switchableAccounts.map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.displayName)} · @${escapeHtml(account.username)}</option>`).join("")}</select></label><label>登录口令<input id="switch-account-password" type="password" minlength="6" maxlength="64" autocomplete="current-password" required /></label><button class="outline-button" type="submit">登录并切换</button></form></section>` : ""}
    <section class="account-form-section"><h4>创建新账户</h4><form id="create-account-form" class="account-form account-create-grid"><label>显示名称<input id="new-account-name" maxlength="20" autocomplete="nickname" placeholder="例如：小李" required /></label><label>用户名<input id="new-account-username" minlength="2" maxlength="24" autocomplete="username" placeholder="文字、字母或数字" required /></label><label>登录口令<input id="new-account-password" type="password" minlength="6" maxlength="64" autocomplete="new-password" required /></label><label>确认口令<input id="new-account-password-confirm" type="password" minlength="6" maxlength="64" autocomplete="new-password" required /></label>${copyGuestProgress ? '<label class="account-copy-option"><input id="copy-guest-progress" type="checkbox" checked /> 将当前访客进度复制到新账户</label>' : ""}<button class="primary-button" type="submit">创建并登录</button></form></section>
    ${current.type === "local" ? `<section class="account-form-section account-session-actions"><h4>当前账户操作</h4><button type="button" class="outline-button" id="logout-account">退出到访客模式</button><form id="delete-account-form" class="account-delete-form"><input id="delete-account-password" type="password" minlength="6" maxlength="64" autocomplete="current-password" placeholder="输入口令确认删除" required /><button type="submit" class="danger-button">删除此账户及本机数据</button></form></section>` : ""}
    <div class="cloud-sync-status"><span>云同步</span><div><strong>尚未启用跨设备同步</strong><p>后续接入安全云端认证后，可在电脑和手机间恢复同一账户记录；当前版本不会把学习数据上传到服务器。</p></div></div>`;

  $("#switch-account-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setAccountMessage("正在验证账户……");
    try {
      const accountId = $("#switch-account-id").value;
      await authenticateLocalAccount(accountId, $("#switch-account-password").value);
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
      if ($("#copy-guest-progress")?.checked) saveStateForAccount(state, account.id, false);
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

function initializeDataManager() {
  renderAccountChrome();
  $("#data-button").addEventListener("click", () => {
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
    navigate(item.dataset.route);
  }));
  $$('[data-jump="today"]').forEach((item) => item.addEventListener("click", () => {
    const day = getCurrentPlanDay();
    activePhase = day >= 1 && day <= 90 ? PLAN[day - 1].phase : "all";
    navigate("plan", { focusToday: true });
  }));
  $$('[data-open-lesson]').forEach((item) => item.addEventListener("click", () => {
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

function initializeVocabulary() {
  currentWordIndex = dueVocabularyIndexes()[0] ?? 0;
  $("#reveal-word").addEventListener("click", () => {
    $("#word-answer").hidden = false;
    $("#reveal-word").hidden = true;
  });
  $("#speak-word").addEventListener("click", () => pronounce(VOCABULARY[currentWordIndex].word, 0.78));
  $$('[data-memory]').forEach((button) => button.addEventListener("click", () => reviewWord(button.dataset.memory)));
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

function initialize() {
  $("#release-link").dataset.version = APP_VERSION;
  initializeNavigation();
  initializeVocabulary();
  initializePractice();
  initializeNotes();
  initializeDataManager();
  initializePwa();
  renderGlobalProgress();
  renderDashboard();
  renderVocabulary();
  renderPracticeWorkspace();
  const initialRoute = location.hash.slice(1);
  navigate(ROUTE_TITLES[initialRoute] ? initialRoute : "dashboard", { instant: true });
}

initialize();
