import {
  APP_VERSION,
  EXAM_CONFIG,
  PHASES,
  PRACTICE_CONTENT,
  PREP_TASKS,
  SKILL_LABELS,
  VOCABULARY,
  buildPlan,
} from "./content.js";
import { getLatestRecording, saveRecording } from "./db.js";
import { exportState, importState, loadState, resetState, saveState } from "./storage.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const ROUTE_TITLES = Object.freeze({
  dashboard: "学习首页",
  plan: "90天计划",
  vocabulary: "单词训练",
  practice: "专项训练",
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
let vocabularyTest = null;
let deferredInstallPrompt = null;
let workspaceTimer = null;
let mediaRecorder = null;
let recordingStream = null;
let recordingChunks = [];
let noteSaveTimer = null;

function persist() {
  saveState(state);
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

function renderGlobalProgress() {
  const completed = completedDayCount();
  const percent = Math.round((completed / 90) * 100);
  $("#sidebar-progress-label").textContent = `${percent}%`;
  $("#sidebar-progress-bar").style.width = `${percent}%`;
  $("#sidebar-progress-detail").textContent = `已完成 ${completed} / 90 天`;
}

function navigate(route, options = {}) {
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
  if (route === "practice") renderPracticeWorkspace();
  if (route === "notes") loadNoteEditor();
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
    .slice(0, 6)
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
  const modules = ["vocabulary", "listening", "reading", "writing", "translation", "speaking"];
  const taskCounts = Object.values(state.completedTasks).reduce((counts, item) => {
    counts[item.module] = (counts[item.module] || 0) + 1;
    return counts;
  }, {});
  const attemptScores = state.practiceAttempts.reduce((scores, attempt) => {
    scores[attempt.module] ||= [];
    scores[attempt.module].push(attempt.score);
    return scores;
  }, {});
  return modules.map((module) => {
    const scores = attemptScores[module] || [];
    const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    return { module, score: Math.round(clamp(Math.min(45, (taskCounts[module] || 0) * 5) + average * 0.55, 0, 100)) };
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
  renderSkillBars();
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  const weeklyMinutes = Object.values(state.completedTasks)
    .filter((item) => new Date(item.completedAt).getTime() >= sevenDaysAgo)
    .reduce((sum, item) => sum + (item.minutes || 0), 0);
  $("#weekly-duration").textContent = `${weeklyMinutes} 分钟`;
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
  return state.vocabulary[word] || { level: 0, status: "new", lapses: 0, reviews: 0, nextReviewAt: null };
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

function reviewWord(result) {
  const entry = VOCABULARY[currentWordIndex];
  const record = vocabularyRecord(entry.word);
  const intervals = [1, 3, 7, 14, 30];
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
  state.vocabulary[entry.word] = {
    ...record,
    level,
    status: result === "known" ? "known" : result,
    reviews: (record.reviews || 0) + 1,
    lastReviewedAt: new Date().toISOString(),
    nextReviewAt: nextReview.toISOString(),
  };
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
    const record = vocabularyRecord(word.word);
    state.vocabulary[word.word] = {
      ...record,
      level: Math.max(0, (record.level || 0) - 1),
      status: "forgot",
      lapses: (record.lapses || 0) + 1,
      lastReviewedAt: new Date().toISOString(),
      nextReviewAt: new Date().toISOString(),
    };
    persist();
  }
  $("#test-feedback").innerHTML = `<div class="inline-feedback ${correct ? "success" : "error"}"><strong>${correct ? "回答正确" : `正确答案：${word.meaning}`}</strong><p>${word.example}</p><button id="next-test-word">下一题 →</button></div>`;
  $("#next-test-word").addEventListener("click", () => {
    vocabularyTest.index += 1;
    vocabularyTest.answered = false;
    renderVocabularyTest();
  });
}

function savePracticeAttempt(module, id, score) {
  state.practiceAttempts.push({ module, id, score, completedAt: new Date().toISOString() });
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
    $("#listening-feedback").innerHTML = `<div class="inline-feedback ${correct ? "success" : "error"}"><strong>${correct ? "回答正确" : `正确答案：${String.fromCharCode(65 + item.answer)}`}</strong><p>${item.explanation}</p><details><summary>查看原创听力文本</summary><p>${item.script}</p></details></div>`;
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
    $("#reading-feedback").innerHTML = `<div class="inline-feedback ${correct ? "success" : "error"}"><strong>${correct ? "回答正确" : `正确答案：${String.fromCharCode(65 + item.answer)}`}</strong><p>${item.explanation}</p><p><b>证据句：</b>${item.evidence}</p></div>`;
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

async function renderLatestRecording() {
  const holder = $("#latest-recording");
  if (!holder) return;
  try {
    const recording = await getLatestRecording();
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
  $("#start-recording").addEventListener("click", () => startRecording(item));
  $("#stop-recording").addEventListener("click", stopRecording);
  bindNextPractice();
  renderLatestRecording();
}

async function startRecording(item) {
  if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
    alert("当前浏览器不支持网页录音，请改用系统录音工具并手动自评。" );
    return;
  }
  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingChunks = [];
    mediaRecorder = new MediaRecorder(recordingStream);
    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) recordingChunks.push(event.data);
    });
    mediaRecorder.addEventListener("stop", async () => {
      const blob = new Blob(recordingChunks, { type: mediaRecorder.mimeType || "audio/webm" });
      await saveRecording({ id: `recording-${Date.now()}`, promptId: item.id, blob, createdAt: new Date().toISOString() });
      recordingStream?.getTracks().forEach((track) => track.stop());
      recordingStream = null;
      savePracticeAttempt("speaking", item.id, 70);
      await renderLatestRecording();
      $("#recording-status").textContent = "录音已保存在当前设备";
      $("#recording-dot").classList.remove("is-live");
    });
    mediaRecorder.start(250);
    $("#start-recording").disabled = true;
    $("#stop-recording").disabled = false;
    $("#recording-dot").classList.add("is-live");
    $("#recording-status").textContent = "正在录音";
    const startedAt = Date.now();
    stopWorkspaceTimer();
    workspaceTimer = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      $("#recording-duration").textContent = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
    }, 500);
  } catch {
    alert("无法使用麦克风。请检查浏览器权限，或使用系统录音工具完成训练。" );
  }
}

function stopRecording() {
  if (mediaRecorder?.state === "recording") mediaRecorder.stop();
  stopWorkspaceTimer();
  $("#start-recording").disabled = false;
  $("#stop-recording").disabled = true;
}

function renderPracticeWorkspace() {
  stopWorkspaceTimer();
  window.speechSynthesis?.cancel();
  if (mediaRecorder?.state === "recording") mediaRecorder.stop();
  if (activePracticeModule === "listening") renderListening();
  if (activePracticeModule === "reading") renderReading();
  if (activePracticeModule === "writing") renderWriting();
  if (activePracticeModule === "translation") renderTranslation();
  if (activePracticeModule === "speaking") renderSpeaking();
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

function initializeDataManager() {
  $("#data-button").addEventListener("click", () => $("#data-dialog").showModal());
  $("#export-data").addEventListener("click", () => exportState(state));
  $("#import-data").addEventListener("change", async (event) => {
    try {
      state = await importState(event.target.files[0]);
      alert("备份导入成功，页面将刷新。" );
      location.reload();
    } catch (error) {
      alert(error.message);
    }
  });
  $("#reset-data").addEventListener("click", () => {
    if (!confirm("确定清空全部学习记录和笔记吗？此操作无法撤销。")) return;
    state = resetState();
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
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
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
