import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { buildPlan, VOCABULARY } from "../src/content.js";

const root = new URL("../", import.meta.url);
const requiredFiles = [
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "sw.js",
  "icon.svg",
  "src/app.js",
  "src/content.js",
  "src/storage.js",
  "src/db.js",
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

const html = await readFile(new URL("index.html", root), "utf8");
for (const id of ["view-dashboard", "view-plan", "view-vocabulary", "view-practice", "view-notices", "view-notes", "view-resources"]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`缺少页面区域：${id}`);
}

const productionFiles = ["package.json", "index.html", "src/app.js", "src/content.js", "src/storage.js", "src/db.js"];
const forbiddenPatterns = ["z-ai-web-dev-sdk", "apiKey:", "CHATGLM_API_KEY"];
for (const file of productionFiles) {
  const content = await readFile(new URL(file, root), "utf8");
  for (const pattern of forbiddenPatterns) {
    if (content.includes(pattern)) throw new Error(`${file} 出现禁止内容：${pattern}`);
  }
}

for (const file of ["src/app.js", "src/content.js", "src/storage.js", "src/db.js", "sw.js", "scripts/build.mjs"]) {
  const result = spawnSync(process.execPath, ["--check", new URL(file, root).pathname], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${file} 语法检查失败：\n${result.stderr}`);
}

console.log(`检查通过：${plan.length}天计划，${VOCABULARY.length}个原创词条，${requiredFiles.length}个核心文件。`);
