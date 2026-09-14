import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { APP_VERSION, buildPlan, CORE_SENTENCES, PRACTICE_CONTENT, VOCABULARY } from "../src/content.js";
import { EAR_TRAINING_UNITS } from "../src/ear-training.js";
import { MOCK_EXAMS } from "../src/mock-exams.js";

const root = new URL("../", import.meta.url);
const requiredFiles = [
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "sw.js",
  "icon.svg",
  "src/app.js",
  "src/content.js",
  "src/practice-bank.js",
  "src/mock-exams.js",
  "src/ear-training.js",
  "src/lessons.js",
  "src/resources.js",
  "src/storage.js",
  "src/accounts.js",
  "src/cloud.js",
  "src/cloud-config.js",
  "src/supabase-vendor-entry.js",
  "src/db.js",
  "supabase/schema.sql",
];

for (const file of requiredFiles) await access(new URL(file, root));

const plan = buildPlan();
if (plan.length !== 90) throw new Error(`90天计划条目错误：${plan.length}`);
for (let index = 0; index < plan.length; index += 1) {
  if (plan[index].day !== index + 1) throw new Error(`DAY序号不连续：${plan[index].day}`);
  if (!plan[index].tasks.length) throw new Error(`DAY ${plan[index].day} 没有任务`);
}
if (plan[0].date !== "2026-09-13" || plan[89].date !== "2026-12-11") {
  throw new Error(`计划日期错误：${plan[0].date} 至 ${plan[89].date}`);
}
if (VOCABULARY.length < 40) throw new Error("首批原创词汇少于40条");
if (CORE_SENTENCES.length < 12) throw new Error("核心句素材少于12条");
if (EAR_TRAINING_UNITS.length < 6) throw new Error("磨耳朵素材少于6段");
if (!EAR_TRAINING_UNITS.every((unit) => unit.segments.length >= 5 && unit.focusChunks.length === 3)) {
  throw new Error("磨耳朵素材必须包含至少5个语段和3个关键语块");
}
const practiceItems = Object.values(PRACTICE_CONTENT).flat();
if (practiceItems.length < 43) throw new Error(`专项题库数量不足：${practiceItems.length}`);
if (!practiceItems.every((item) => item.sourceType === "original" && item.sourceLabel && item.sourceDetail)) {
  throw new Error("专项题库必须完整标记原创来源");
}
if (!PRACTICE_CONTENT.reading.some((item) => item.kind === "cloze") || !PRACTICE_CONTENT.reading.some((item) => item.kind === "matching")) {
  throw new Error("阅读题库缺少选词填空或长篇匹配题型");
}
const practiceIds = new Set(practiceItems.map((item) => item.id));
for (const exam of MOCK_EXAMS) {
  for (const section of exam.sections) {
    for (const itemId of section.itemIds) if (!practiceIds.has(itemId)) throw new Error(`模拟卷引用了不存在的题目：${itemId}`);
  }
}

const html = await readFile(new URL("index.html", root), "utf8");
for (const id of ["view-dashboard", "view-plan", "view-vocabulary", "view-sentences", "view-eartraining", "view-practice", "view-tests", "view-lessons", "view-notices", "view-notes", "view-resources"]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`缺少页面区域：${id}`);
}
for (const id of ["continue-learning", "backup-reminder", "plan-weekly", "ear-day-label", "account-summary", "account-dialog-content", "cloud-sync-indicator"]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`缺少状态组件：${id}`);
}

const packageData = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const serviceWorker = await readFile(new URL("sw.js", root), "utf8");
const appSource = await readFile(new URL("src/app.js", root), "utf8");
if (packageData.version !== APP_VERSION) throw new Error(`package.json版本${packageData.version}与应用版本${APP_VERSION}不一致`);
for (const marker of [`styles.css?v=${APP_VERSION}`, `src/app.js?v=${APP_VERSION}`]) {
  if (!html.includes(marker)) throw new Error(`index.html缺少版本化资源：${marker}`);
}
for (const marker of [`cet6-90day-v${APP_VERSION}`, `src/app.js?v=${APP_VERSION}`, `src/content.js?v=${APP_VERSION}`, `src/practice-bank.js?v=${APP_VERSION}`, `src/mock-exams.js?v=${APP_VERSION}`, `src/cloud.js?v=${APP_VERSION}`, `src/vendor/supabase.js?v=${APP_VERSION}`]) {
  if (!serviceWorker.includes(marker)) throw new Error(`sw.js缺少版本标记：${marker}`);
}
for (const moduleFile of ["content", "resources", "mock-exams", "ear-training", "lessons", "db", "accounts", "storage", "cloud"]) {
  if (!appSource.includes(`./${moduleFile}.js?v=${APP_VERSION}`)) throw new Error(`src/app.js未版本化加载${moduleFile}.js`);
}
if (/event\.currentTarget\.disabled\s*=/.test(appSource)) {
  throw new Error("异步按钮处理不得直接修改event.currentTarget，请先缓存元素引用");
}
for (const marker of ["function openTask(item, day)", "data-dashboard-open-task", "data-plan-open-task", "data-standard-open-task"]) {
  if (!appSource.includes(marker)) throw new Error(`每日任务缺少跳转能力：${marker}`);
}

const productionFiles = ["package.json", "index.html", "src/app.js", "src/content.js", "src/practice-bank.js", "src/mock-exams.js", "src/ear-training.js", "src/lessons.js", "src/resources.js", "src/storage.js", "src/accounts.js", "src/cloud.js", "src/cloud-config.js", "src/db.js"];
const forbiddenPatterns = ["z-ai-web-dev-sdk", "apiKey:", "CHATGLM_API_KEY", "sb_secret_"];
for (const file of productionFiles) {
  const content = await readFile(new URL(file, root), "utf8");
  for (const pattern of forbiddenPatterns) {
    if (content.includes(pattern)) throw new Error(`${file} 出现禁止内容：${pattern}`);
  }
}

for (const file of ["src/app.js", "src/content.js", "src/practice-bank.js", "src/mock-exams.js", "src/ear-training.js", "src/lessons.js", "src/resources.js", "src/storage.js", "src/accounts.js", "src/cloud.js", "src/cloud-config.js", "src/supabase-vendor-entry.js", "src/db.js", "sw.js", "scripts/build.mjs"]) {
  const result = spawnSync(process.execPath, ["--check", new URL(file, root).pathname], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${file} 语法检查失败：\n${result.stderr}`);
}

globalThis.localStorage = {
  values: new Map(),
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; },
  setItem(key, value) { this.values.set(key, String(value)); },
  removeItem(key) { this.values.delete(key); },
};
const accountModule = await import(`../src/accounts.js?quality=${APP_VERSION}`);
const storageModule = await import(`../src/storage.js?quality=${APP_VERSION}`);
localStorage.setItem("cet6-90day-state-v1", JSON.stringify({ ...storageModule.DEFAULT_STATE, studyMinutes: 7 }));
if (storageModule.loadState("guest").studyMinutes !== 7 || localStorage.getItem("cet6-90day-state-v1")) {
  throw new Error("旧版访客数据迁移失败");
}
storageModule.resetState("guest");
if (storageModule.loadState("guest").studyMinutes !== 0) throw new Error("访客数据清空后被旧状态恢复");
const firstAccount = await accountModule.createLocalAccount({ username: "quality-a", displayName: "检查甲", password: "quality-pass-a" });
const secondAccount = await accountModule.createLocalAccount({ username: "quality-b", displayName: "检查乙", password: "quality-pass-b" });
accountModule.setActiveAccount(firstAccount.id);
const firstState = storageModule.loadState();
firstState.studyMinutes = 11;
storageModule.saveState(firstState);
accountModule.setActiveAccount(secondAccount.id);
const secondState = storageModule.loadState();
secondState.studyMinutes = 22;
storageModule.saveState(secondState);
accountModule.setActiveAccount(firstAccount.id);
if (storageModule.loadState().studyMinutes !== 11) throw new Error("本机账户学习状态未正确隔离");
let rejectedWrongPassword = false;
try {
  await accountModule.authenticateLocalAccount(firstAccount.id, "wrong-password");
} catch {
  rejectedWrongPassword = true;
}
if (!rejectedWrongPassword) throw new Error("本机账户接受了错误口令");
const mockCloudUser = { id: "00000000-0000-0000-0000-000000000001", email: "quality@example.com", user_metadata: { display_name: "云检查" } };
const cloudAccount = accountModule.setCloudAccount(mockCloudUser);
if (accountModule.getCurrentAccount().id !== cloudAccount.id || accountModule.getCurrentAccount().type !== "cloud") {
  throw new Error("云账户身份未正确保存");
}
accountModule.clearCloudAccount();
if (accountModule.getCurrentAccount().type !== "guest") throw new Error("云账户退出后未恢复访客状态");

const cloudConfig = await readFile(new URL("src/cloud-config.js", root), "utf8");
if (!cloudConfig.includes("pggshlbhlfjrfgofqojd.supabase.co") || !cloudConfig.includes("sb_publishable_")) {
  throw new Error("Supabase公开配置缺失");
}
const schema = await readFile(new URL("supabase/schema.sql", root), "utf8");
for (const marker of ["enable row level security", "auth.uid()", "sync_study_state", "p_expected_revision"]) {
  if (!schema.includes(marker)) throw new Error(`Supabase数据库脚本缺少：${marker}`);
}

console.log(`检查通过：${plan.length}天计划，${VOCABULARY.length}个原创词条，${practiceItems.length}个专项训练单元，${MOCK_EXAMS.length}套原创完整测试，${requiredFiles.length}个核心文件。`);
