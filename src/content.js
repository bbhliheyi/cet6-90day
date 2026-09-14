import { SUPPLEMENTAL_PRACTICE_CONTENT } from "./practice-bank.js?v=0.5.7";

export const APP_VERSION = "0.5.7";

export const EXAM_CONFIG = Object.freeze({
  region: "吉林 · 长春",
  planStart: "2026-09-13T00:00:00+08:00",
  registrationDeadline: "2026-09-28T17:00:00+08:00",
  oralAdmitCard: "2026-11-17T09:00:00+08:00",
  oralExam: "2026-11-22T08:30:00+08:00",
  writtenAdmitCard: "2026-12-01T09:00:00+08:00",
  writtenExam: "2026-12-12T15:00:00+08:00",
  verifiedAt: "2026-09-11",
});

export const PHASES = Object.freeze([
  { id: "diagnosis", label: "诊断建档", shortLabel: "诊断", start: 1, end: 7, color: "#d86f3d" },
  { id: "foundation", label: "词汇基础", shortLabel: "基础", start: 8, end: 21, color: "#ba8a2d" },
  { id: "input", label: "听读主攻", shortLabel: "听读", start: 22, end: 35, color: "#3f7c71" },
  { id: "output", label: "写译主攻", shortLabel: "写译", start: 36, end: 49, color: "#526f9c" },
  { id: "intensive", label: "专项强化", shortLabel: "强化", start: 50, end: 63, color: "#865f96" },
  { id: "oral", label: "口试整合", shortLabel: "口试", start: 64, end: 71, color: "#a75858" },
  { id: "mock", label: "完整模拟", shortLabel: "模拟", start: 72, end: 84, color: "#335f76" },
  { id: "sprint", label: "考前收束", shortLabel: "冲刺", start: 85, end: 90, color: "#173f39" },
]);

const DAY_TITLES = Object.freeze([
  "全科诊断与目标分设置",
  "词汇量与拼写诊断",
  "听力三题型诊断",
  "阅读三题型诊断",
  "写作限时诊断",
  "翻译与口语诊断",
  "第一周综合测与计划校准",
  "高频动词与学术搭配",
  "高频名词与同义替换",
  "高频形容词与态度词",
  "副词、连接词与逻辑",
  "词根词缀与词性转换",
  "听音辨词与重音",
  "第二周词汇周测",
  "教育与校园主题词汇",
  "科技与创新主题词汇",
  "环境与生态主题词汇",
  "社会与文化主题词汇",
  "经济与就业主题词汇",
  "熟词生义与近义辨析",
  "第三周综合测",
  "长对话：人物与场景",
  "长对话：观点与态度",
  "听力篇章：主旨结构",
  "听力篇章：细节顺序",
  "讲话报道讲座：信号词",
  "讲话报道讲座：推断",
  "第四周听力周测",
  "选词填空：词性",
  "选词填空：搭配与逻辑",
  "长篇匹配：关键词",
  "长篇匹配：同义替换",
  "仔细阅读：主旨与细节",
  "仔细阅读：推断与态度",
  "第五周阅读周测",
  "写作审题与任务回应",
  "三段式结构与主题句",
  "举例、因果、对比和让步",
  "句式变化与衔接",
  "限时完整写作一",
  "写作错误清单",
  "第六周写作周测",
  "翻译拆句与主干识别",
  "时态、语态与主语选择",
  "中国文化与专名表达",
  "科技、生态与发展表达",
  "长句合并与衔接",
  "限时完整翻译一",
  "第七周写译综合测",
  "听力薄弱题型强化一",
  "阅读薄弱题型强化一",
  "写作限时二",
  "翻译限时二",
  "口试Part 1专项",
  "口试Part 2个人陈述",
  "第八周专项测",
  "听力薄弱题型强化二",
  "阅读薄弱题型强化二",
  "写作限时三",
  "翻译限时三",
  "口试Part 2讨论策略",
  "口试Part 3问答",
  "第九周综合测",
  "完整口试模拟一",
  "发音、重音、连读复盘",
  "完整口试模拟二",
  "讨论互动与礼貌打断",
  "完整口试模拟三",
  "口试高频主题串练",
  "设备、证件与流程检查",
  "CET-SET6考试日",
  "完整模拟一",
  "模拟一深度复盘",
  "完整模拟二",
  "模拟二复盘与弱项训练",
  "完整模拟三",
  "模拟三复盘与词汇回炉",
  "完整模拟四",
  "模拟四复盘",
  "打印笔试准考证与信息核对",
  "完整模拟五",
  "模拟五复盘",
  "完整模拟六",
  "第十二周总复盘",
  "高频错词与听力信号词",
  "阅读定位和同义替换",
  "写作结构与个人错误清单",
  "翻译文化表达与遗漏检查",
  "轻量综合训练与物品准备",
  "最终回顾、早睡和状态调整",
]);

const WEEKLY_TEST_DAYS = new Set([7, 14, 21, 28, 35, 42, 49, 56, 63, 84]);
const MOCK_DAYS = new Set([72, 74, 76, 78, 81, 83]);
const REVIEW_DAYS = new Set([73, 75, 77, 79, 82, 84]);

const phaseForDay = (day) => PHASES.find((phase) => day >= phase.start && day <= phase.end);

const task = (id, module, title, minutes, detail) => ({ id, module, title, minutes, detail });

function buildDailyTasks(day, title) {
  if (day === 71) {
    return [
      task("warmup", "speaking", "口试热身", 10, "只复习开场、结构和互动表达，不临时增加新模板。"),
      task("check", "exam", "核对证件与场次", 5, "以准考证上的时间、地点和入场要求为准。"),
      task("reflection", "review", "考后记录", 15, "记录题目主题、个人表现和笔试阶段需要继续改进的能力。"),
    ];
  }

  if (MOCK_DAYS.has(day)) {
    return [
      task("mock", "exam", title, 130, "按写作、听力、阅读、翻译顺序完成完整模拟，中途不查资料。"),
      task("snapshot", "review", "记录考试快照", 10, "保存各模块完成情况、剩余时间和最不确定的题目。"),
    ];
  }

  if (REVIEW_DAYS.has(day)) {
    return [
      task("errors", "review", "模拟错题归因", 35, "逐题选择错误原因，并写出下一次可执行的纠正动作。"),
      task("vocabulary", "vocabulary", "高频错词回炉", 20, "完成错词拼写、听写和语境复习。"),
      task("sentences", "sentences", "每日核心句复习", 15, "复习3句，完成汉译英，并把其中1句改写到写作或口语主题。"),
      task("eartraining", "eartraining", "错段磨耳朵", 10, "不看文本重听最薄弱片段，完成主旨复述、关键语块听写和跟读。"),
      task("listening", "listening", "听力错题重做", 10, "重新作答并确认题干、证据句、同义替换和错误原因。"),
      task("reading", "reading", "阅读证据复核", 20, "重新定位证据句，比较错误选项的干扰方式。"),
      task("output", "writing", "写译错误改写", 20, "选择三处典型错误重新表达。"),
    ];
  }

  if (day === 70 || day === 80 || day === 89 || day === 90) {
    const specialDetails = {
      70: "核对口试准考证、证件、路线、耳麦要求和到场时间。",
      80: "下载笔试准考证，核对姓名、照片、考点、考试时间和入场要求。",
      89: "准备证件、文具、路线、衣物和闹钟，完成轻量训练。",
      90: "只回顾个人错题清单，停止完整模拟并保证睡眠。",
    };
    return [
      task("special", "exam", title, 25, specialDetails[day]),
      task("vocabulary", "vocabulary", "轻量词汇复习", 20, "只复习高频错词和熟词生义。"),
      task("sentences", "sentences", "核心句热身", 15, "复述3句高频表达，并各完成一次主题替换。"),
      task("eartraining", "eartraining", "轻量磨耳朵", 10, "听一段熟悉的长对话、篇章或报道，只抓结构和重音。"),
      task("listening", "listening", "听力信号词热身", 5, "快速回顾一组题干和证据定位，不再做高强度精听。"),
      task("review", "review", "状态与策略确认", 10, "确认作息、答题顺序和个人检查清单。"),
    ];
  }

  if (WEEKLY_TEST_DAYS.has(day)) {
    return [
      task("vocabulary", "vocabulary", "100词周测", 20, "混合认读、拼写、听写和语境题。"),
      task("sentences", "sentences", "核心句周复习", 15, "复习本周21句，抽查6句汉译英和3句主题改写。"),
      task("eartraining", "eartraining", "连续语流周练", 10, "选一段长对话或讲座，不看文本完成主旨、语块听写和复述。"),
      task("listening", "listening", "听力整组训练", 10, "按考试状态完成选择题，再核对证据和干扰项。"),
      task("reading", "reading", "阅读组合训练", 25, "记录每题耗时和证据位置。"),
      task("output", day % 2 ? "translation" : "writing", "写作或翻译限时任务", 25, "完成后按个人错误清单检查。"),
      task("speaking", "speaking", "口语录音", 15, "完成一次计时表达并回听自评。"),
      task("review", "review", "周报与计划校准", 10, "比较本周正确率、耗时和学习完成度。"),
    ];
  }

  const outputModule = day % 2 === 0 ? "writing" : "translation";
  const outputTitle = outputModule === "writing" ? "写作训练" : "翻译训练";
  return [
    task("vocabulary", "vocabulary", "词汇学习与到期复习", 20, `围绕“${title}”完成认读、拼写或语境训练。`),
    task("sentences", "sentences", "每日核心句", 15, "学习3句可输出表达，完成汉译英，并挑1句用于写作或口语改写。"),
    task("eartraining", "eartraining", "每日磨耳朵", 10, "听1段长对话、篇章、报道或讲座，完成盲听、语块听写和影子跟读。"),
    task("listening", "listening", "听力答题精练", 10, "按考试状态完成1组选择题，再定位证据句并分析干扰项。"),
    task("reading", "reading", "阅读限时训练", 25, "完成一组题并标出证据句与干扰项。"),
    task("output", outputModule, outputTitle, 25, "按审题、组织、成文和检查四步完成。"),
    task("speaking", "speaking", "口语表达", 15, "完成一次计时表达、录音或影子跟读。"),
    task("review", "review", "错题复盘", 10, "处理当天最有价值的三条错误记录。"),
  ];
}

function formatPlanDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatIsoDateInChina(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function buildPlan() {
  const start = new Date(EXAM_CONFIG.planStart).getTime();
  return DAY_TITLES.map((title, index) => {
    const day = index + 1;
    const date = new Date(start + index * 86_400_000);
    const phase = phaseForDay(day);
    const tasks = buildDailyTasks(day, title);
    return {
      day,
      date: formatIsoDateInChina(date),
      dateLabel: formatPlanDate(date),
      phase: phase.id,
      phaseLabel: phase.label,
      phaseColor: phase.color,
      title,
      objective: `完成“${title}”，留下可以复查的答题、录音或错题记录。`,
      estimatedMinutes: tasks.reduce((total, item) => total + item.minutes, 0),
      tasks,
      assessment: WEEKLY_TEST_DAYS.has(day) || MOCK_DAYS.has(day) ? "完成测试并提交复盘" : "完成每日任务并处理3条错误",
    };
  });
}

export const VOCABULARY = Object.freeze([
  { word: "substantial", pos: "adj.", meaning: "大量的；实质性的", example: "The survey provides substantial evidence for changing the study plan.", collocation: "substantial evidence" },
  { word: "allocate", pos: "v.", meaning: "分配；划拨", example: "Students should allocate enough time to careful reading.", collocation: "allocate time to" },
  { word: "anticipate", pos: "v.", meaning: "预期；预料", example: "We anticipate that the new library will attract more readers.", collocation: "anticipate a change" },
  { word: "coherent", pos: "adj.", meaning: "连贯的；条理清楚的", example: "A coherent paragraph develops one central idea.", collocation: "a coherent argument" },
  { word: "compelling", pos: "adj.", meaning: "令人信服的；引人注目的", example: "The writer offers a compelling reason to protect urban trees.", collocation: "compelling evidence" },
  { word: "consecutive", pos: "adj.", meaning: "连续的", example: "She studied for thirty consecutive days without missing a review.", collocation: "consecutive days" },
  { word: "controversy", pos: "n.", meaning: "争议；争论", example: "The proposal triggered controversy among local residents.", collocation: "cause controversy" },
  { word: "diminish", pos: "v.", meaning: "减少；削弱", example: "Short breaks can prevent attention from diminishing during study.", collocation: "diminish the impact" },
  { word: "diverse", pos: "adj.", meaning: "多样的；不同的", example: "The program serves learners from diverse educational backgrounds.", collocation: "diverse backgrounds" },
  { word: "elaborate", pos: "v./adj.", meaning: "详细说明；精心制作的", example: "Please elaborate on the main reason for your choice.", collocation: "elaborate on" },
  { word: "encounter", pos: "v./n.", meaning: "遇到；遭遇", example: "Readers often encounter unfamiliar terms in academic articles.", collocation: "encounter a problem" },
  { word: "facilitate", pos: "v.", meaning: "促进；使便利", example: "Clear headings facilitate the rapid location of evidence.", collocation: "facilitate learning" },
  { word: "feasible", pos: "adj.", meaning: "可行的", example: "A shorter daily plan is more feasible during a busy week.", collocation: "a feasible solution" },
  { word: "fluctuate", pos: "v.", meaning: "波动；起伏", example: "Motivation may fluctuate, but a routine keeps progress stable.", collocation: "prices fluctuate" },
  { word: "formulate", pos: "v.", meaning: "制定；系统表达", example: "The team formulated a practical response to the problem.", collocation: "formulate a plan" },
  { word: "incentive", pos: "n.", meaning: "激励；刺激因素", example: "Visible progress can provide an incentive to continue learning.", collocation: "financial incentive" },
  { word: "inevitable", pos: "adj.", meaning: "不可避免的", example: "Occasional mistakes are inevitable during intensive practice.", collocation: "an inevitable result" },
  { word: "inhibit", pos: "v.", meaning: "抑制；阻碍", example: "Fear of mistakes can inhibit students from speaking freely.", collocation: "inhibit growth" },
  { word: "innovative", pos: "adj.", meaning: "创新的", example: "The museum introduced an innovative way to explain local history.", collocation: "innovative approach" },
  { word: "legitimate", pos: "adj.", meaning: "合理的；合法的", example: "Privacy is a legitimate concern when recordings are stored online.", collocation: "legitimate concern" },
  { word: "maintain", pos: "v.", meaning: "保持；维护", example: "It is easier to maintain progress with a realistic schedule.", collocation: "maintain a balance" },
  { word: "mitigate", pos: "v.", meaning: "减轻；缓和", example: "Public transport can help mitigate traffic congestion.", collocation: "mitigate the risk" },
  { word: "mutual", pos: "adj.", meaning: "相互的；共同的", example: "The discussion ended with mutual respect despite disagreement.", collocation: "mutual understanding" },
  { word: "neglect", pos: "v./n.", meaning: "忽视；疏于照管", example: "Do not neglect translation while focusing on reading speed.", collocation: "neglect a duty" },
  { word: "perceive", pos: "v.", meaning: "察觉；理解；认为", example: "Listeners may perceive the same tone in different ways.", collocation: "perceive a difference" },
  { word: "persistent", pos: "adj.", meaning: "持续的；坚持不懈的", example: "Persistent practice gradually improves listening accuracy.", collocation: "persistent effort" },
  { word: "preliminary", pos: "adj.", meaning: "初步的；预备的", example: "The preliminary results reveal a weakness in vocabulary.", collocation: "preliminary results" },
  { word: "profound", pos: "adj.", meaning: "深远的；深刻的", example: "Digital technology has had a profound influence on education.", collocation: "profound impact" },
  { word: "reluctant", pos: "adj.", meaning: "不情愿的；勉强的", example: "Some students are reluctant to record their own voices.", collocation: "be reluctant to" },
  { word: "reinforce", pos: "v.", meaning: "加强；巩固", example: "A short review can reinforce what was learned yesterday.", collocation: "reinforce an idea" },
  { word: "resilient", pos: "adj.", meaning: "有韧性的；能恢复的", example: "A resilient learner returns to the plan after a difficult week.", collocation: "a resilient community" },
  { word: "retain", pos: "v.", meaning: "保留；记住", example: "Using a word in context helps learners retain it longer.", collocation: "retain information" },
  { word: "shift", pos: "v./n.", meaning: "转变；移动", example: "The focus will shift from accuracy to speed in the final stage.", collocation: "a shift in focus" },
  { word: "specify", pos: "v.", meaning: "明确说明；具体指定", example: "The notice specifies when candidates can print admission tickets.", collocation: "specify a date" },
  { word: "sustainable", pos: "adj.", meaning: "可持续的", example: "A sustainable routine is more valuable than a brief burst of effort.", collocation: "sustainable development" },
  { word: "transform", pos: "v.", meaning: "改变；转化", example: "Regular reflection can transform mistakes into useful evidence.", collocation: "transform into" },
  { word: "underlying", pos: "adj.", meaning: "潜在的；根本的", example: "The review identifies the underlying cause of each error.", collocation: "underlying cause" },
  { word: "valid", pos: "adj.", meaning: "有效的；合理的", example: "The conclusion is valid only when the evidence is reliable.", collocation: "a valid argument" },
  { word: "widespread", pos: "adj.", meaning: "广泛的；普遍的", example: "Mobile payment has become widespread in many cities.", collocation: "widespread use" },
  { word: "yield", pos: "v./n.", meaning: "产生；带来；产量", example: "Focused practice often yields better results than random repetition.", collocation: "yield results" },
]);

const BASE_PRACTICE_CONTENT = Object.freeze({
  listening: [
    {
      id: "listen-urban-library",
      title: "长对话：城市图书馆的新服务",
      script: "The city library has extended its weekend opening hours after a three-month trial. According to the librarian, the change was not simply a response to higher visitor numbers. Many university students had asked for a quiet place to study in the evening. The library will review the service again in December before deciding whether to make it permanent.",
      question: "Why did the library extend its weekend hours?",
      options: ["To host more public lectures", "To provide students with evening study space", "To reduce the number of weekday visitors", "To prepare for a building renovation"],
      answer: 1,
      questionType: "原因细节题",
      evidence: "Many university students had asked for a quiet place to study in the evening.",
      explanation: "关键信息是 university students asked for a quiet place to study in the evening。",
      optionAnalysis: ["原文没有提到举办更多讲座。", "正确。对应学生希望晚上有安静学习空间。", "higher visitor numbers 被 not simply 否定，且没有减少工作日访客。", "原文没有提到装修。"],
    },
    {
      id: "listen-campus-garden",
      title: "听力篇章：校园共享花园",
      script: "A group of students turned an unused corner of their campus into a small community garden. The project was originally designed to teach practical environmental skills, but it soon produced an unexpected benefit. Students from different departments began to meet there and exchange ideas. The organizers now consider social connection as important as the vegetables they grow.",
      question: "What unexpected benefit did the garden produce?",
      options: ["It lowered food prices", "It attracted professional farmers", "It encouraged students from different departments to connect", "It increased the size of the campus"],
      answer: 2,
      questionType: "转折后细节题",
      evidence: "Students from different departments began to meet there and exchange ideas.",
      explanation: "unexpected benefit 后说明不同院系学生开始见面并交流。",
      optionAnalysis: ["材料只提到种植蔬菜，没有提到价格。", "参与者是学生，没有职业农民。", "正确。meet and exchange ideas 对应 connect。", "花园利用闲置角落，并未扩大校园。"],
    },
  ],
  reading: [
    {
      id: "read-micro-breaks",
      title: "仔细阅读：短休息是否会打断学习？",
      passage: "Many students avoid taking breaks because they fear losing momentum. However, a break does not have to mean abandoning a task. A carefully planned pause can reduce mental fatigue and create a clear boundary between two stages of work. The key is to decide the length and purpose of the break in advance. An unplanned visit to social media may expand into half an hour, while a five-minute walk or stretch is easier to control. Therefore, the value of a break depends less on whether it interrupts study and more on whether it helps the learner return with a specific next step.",
      question: "What does the passage suggest about an effective study break?",
      options: ["It should involve social media", "It should have a planned length and purpose", "It should take place only after all work is finished", "It should last at least half an hour"],
      answer: 1,
      evidence: "The key is to decide the length and purpose of the break in advance.",
      explanation: "作者强调提前决定休息的长度和目的。",
      questionType: "观点细节题",
      optionAnalysis: ["社交媒体被作为可能失控的反例。", "正确。planned 对应 in advance。", "作者没有说必须全部完成后休息。", "半小时是失控休息的例子，不是建议。"],
    },
    {
      id: "read-local-museums",
      title: "仔细阅读：地方博物馆的数字化",
      passage: "Small museums often lack the funding needed for large exhibitions, yet digital tools can extend their reach in modest ways. A short audio guide recorded by local volunteers may help visitors understand an object more fully. A searchable online catalogue can also connect teachers with materials that would otherwise remain unseen. Digital access is not a replacement for visiting a museum; rather, it can prepare people for a visit and allow them to continue exploring afterwards. The most successful projects begin with a clear educational need instead of adopting technology merely because it is fashionable.",
      question: "According to the passage, what characterizes successful digital museum projects?",
      options: ["They replace physical visits completely", "They use the newest technology available", "They begin with a clear educational purpose", "They focus mainly on expensive exhibitions"],
      answer: 2,
      evidence: "The most successful projects begin with a clear educational need.",
      explanation: "结尾句直接给出成功项目应从明确教育需求出发。",
      questionType: "段尾主旨题",
      optionAnalysis: ["原文明说数字访问不是实体参观的替代。", "作者反对为了时髦而采用技术。", "正确。educational purpose 对应 educational need。", "文章讨论的是低成本数字工具，而非昂贵展览。"],
    },
  ],
  writing: [
    {
      id: "write-digital-focus",
      title: "数字工具与专注力",
      prompt: "Write an essay on how university students can use digital tools without allowing them to weaken concentration. Give reasons and practical examples.",
      hints: ["明确数字工具既有价值也有干扰", "提出两项可执行措施", "结尾回到有意识使用技术"],
      outline: ["第一段：回应题目，技术价值取决于使用边界", "第二段：关闭非必要通知并限定学习应用", "第三段：按任务分时段使用，休息时离开屏幕", "结尾：有目的地使用而不是被动响应"],
      sample: "Digital tools can improve learning only when students set clear boundaries for when and why they use them. Notifications should be turned off during focused study, while reference apps should be opened only for a specific task. Students can also divide study into short blocks and leave the screen during breaks. In this way, technology supports concentration instead of controlling it.",
    },
    {
      id: "write-campus-service",
      title: "大学生参与校园公共服务",
      prompt: "Write an essay on whether university students should take part in improving shared campus services. Support your view with reasons and examples.",
      hints: ["说明参与的教育价值", "讨论时间成本或边界", "给出具体参与方式"],
      outline: ["第一段：表明适度参与值得鼓励", "第二段：学生最了解日常使用中的问题", "第三段：参与可以培养责任感，但不应替代专业岗位", "结尾：通过反馈、志愿服务和项目建议参与"],
      sample: "University students should take part in improving shared campus services because they use these services every day and can identify practical problems quickly. Their participation can also develop responsibility and cooperation. However, students should contribute through feedback, volunteer projects and carefully designed proposals rather than replace trained staff. Such participation benefits both the campus and the students themselves.",
    },
  ],
  translation: [
    {
      id: "trans-winter-city",
      title: "北方城市的冬季公共生活",
      source: "在中国北方，冬季不仅意味着寒冷，也形成了独特的公共生活。许多城市通过冰雪运动、节庆活动和公共文化空间，鼓励居民走出家门。合理利用冬季资源既能丰富市民生活，也能带动当地旅游和服务业的发展。",
      keyPoints: ["不仅……也……的并列结构", "鼓励某人做某事", "合理利用资源", "带动旅游和服务业发展"],
      reference: "In northern China, winter means more than cold weather; it has also shaped a distinctive form of public life. Many cities encourage residents to leave their homes through winter sports, festivals and public cultural spaces. Making proper use of winter resources can not only enrich residents' lives but also promote the development of local tourism and service industries.",
      analysis: ["第一句用 means more than 表达“不仅意味着”更自然", "第二句以 cities 作主语，encourage somebody to do something", "第三句使用动名词短语作主语，并用 not only ... but also ... 连接两个结果"],
    },
    {
      id: "trans-community-library",
      title: "社区图书馆",
      source: "近年来，一些社区图书馆开始提供更加灵活的服务。除了借阅图书，人们还可以参加讲座、学习数字技能或与邻居交流。这些小型公共空间使知识更容易获得，也增强了社区成员之间的联系。",
      keyPoints: ["近年来的时态", "除了……还……", "使知识更容易获得", "增强成员之间的联系"],
      reference: "In recent years, some community libraries have begun to offer more flexible services. In addition to borrowing books, people can attend lectures, learn digital skills or communicate with their neighbours. These small public spaces make knowledge more accessible and strengthen connections among community members.",
      analysis: ["近年来通常与现在完成时连用", "In addition to 后接名词或动名词", "make knowledge more accessible 比 make people get knowledge easier 更自然", "connections among 强调多人之间的联系"],
    },
  ],
  speaking: [
    { id: "speak-learning-space", title: "理想的学习空间", prompt: "Describe an ideal place for university students to study. Explain what facilities it should provide and why.", followUp: "Should universities keep study spaces open late at night? Why or why not?", structure: ["观点：安静但能支持不同任务", "设施：稳定网络、插座和可预约讨论区", "原因：减少寻找资源和空间冲突", "结论：开放时间应兼顾需求与管理成本"], sample: "An ideal study space should be quiet enough for concentration but flexible enough for different learning activities. It should provide reliable internet access, power outlets and separate areas for discussion. These facilities allow students to focus without disturbing one another. I also think some spaces should stay open late during examination periods, provided that safety and staffing can be ensured." },
    { id: "speak-community-work", title: "大学生与社区服务", prompt: "Describe one useful way university students can contribute to their local community.", followUp: "What can students learn from participating in community work?", structure: ["选择一种服务：数字技能辅导", "说明服务对象和具体做法", "解释对社区的价值", "说明学生获得的沟通与责任感"], sample: "University students can help older residents learn basic digital skills, such as making medical appointments or using public transport apps. The service solves practical problems and reduces anxiety about technology. Students, meanwhile, learn to explain ideas patiently and understand needs that differ from their own." },
    { id: "speak-technology", title: "课堂中的数字工具", prompt: "Do digital tools always improve classroom learning? Give reasons and an example.", followUp: "How should teachers respond when technology distracts students?", structure: ["直接回答：不总是", "优点：快速访问资料与互动", "风险：通知和无关内容分散注意", "建议：明确任务、限定使用时间"], sample: "Digital tools do not always improve learning. They are useful when students need quick access to information or immediate feedback, but the same devices can also create distractions. Teachers should explain the purpose of each tool, set a clear time limit and ask students to close unrelated applications." },
  ],
});

const PRACTICE_SOURCE = Object.freeze({
  sourceType: "original",
  sourceLabel: "本站原创练习",
  sourceDetail: "非官方真题，依据六级题型和能力要求独立编写；不复制商业题库。",
});

function normalizePracticeItem(item, module) {
  const defaultType = {
    listening: "听力选择题",
    reading: "仔细阅读",
    writing: "写作",
    translation: "翻译",
    speaking: "口语",
  }[module] || "专项训练";
  return Object.freeze({
    ...PRACTICE_SOURCE,
    ...item,
    module,
    type: item.type || defaultType,
    kind: item.kind || (module === "reading" ? "careful" : "response"),
  });
}

export const PRACTICE_CONTENT = Object.freeze(
  Object.fromEntries(
    Object.keys(BASE_PRACTICE_CONTENT).map((module) => [
      module,
      Object.freeze([
        ...(BASE_PRACTICE_CONTENT[module] || []),
        ...(SUPPLEMENTAL_PRACTICE_CONTENT[module] || []),
      ].map((item) => normalizePracticeItem(item, module))),
    ]),
  ),
);

export const PREP_TASKS = Object.freeze([
  task("check-registration", "notice", "核对报名资格与报名状态", 10, "登录全国报名系统，确认学籍、照片、科目和缴费状态。"),
  task("set-goal", "plan", "设置目标与每日时长", 10, "确定目标分、是否参加口试以及60/90/130分钟模式。"),
  task("device", "speaking", "检查耳机和麦克风", 10, "确认浏览器可以播放语音并录制口语。"),
  task("backup", "data", "了解数据备份", 5, "完成一次JSON导出，确认学习记录只保存在当前设备。"),
]);

export const SKILL_LABELS = Object.freeze({
  vocabulary: "词汇",
  sentences: "核心句",
  eartraining: "磨耳朵",
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  translation: "翻译",
  speaking: "口语",
  mock: "完整测试",
  review: "复盘",
  exam: "考试",
  notice: "通知",
  plan: "计划",
  data: "数据",
});

const coreSentence = (id, topic, english, chinese, pattern, keywords, writingUse, speakingUse, note) => ({
  id,
  topic,
  english,
  chinese,
  pattern,
  keywords,
  writingUse,
  speakingUse,
  note,
});

const CORE_SENTENCE_SOURCE = Object.freeze({
  sourceType: "original-modeled",
  sourceLabel: "本站原创 · 按CET-6能力点编写",
  sourceDetail: "主题、句式和表达为本站独立制作，用于模拟六级写作、翻译和口语迁移；不复制官方真题或商业题库。",
});

const normalizeCoreSentence = (sentence) => Object.freeze({ ...CORE_SENTENCE_SOURCE, ...sentence });

export const CORE_SENTENCES = Object.freeze([
  {
    id: "sentence-01",
    topic: "学习与成长",
    english: "Consistent effort is more valuable than a brief burst of enthusiasm.",
    chinese: "持续的努力比短暂的热情更有价值。",
    pattern: "A is more valuable than B",
    keywords: ["consistent effort", "brief burst", "enthusiasm"],
    writingUse: "适合写作中比较长期行动与短期冲动。",
    speakingUse: "可用于回答如何保持学习动力。",
    note: "more valuable than 表示“比……更有价值”，主语可替换为 regular practice。",
  },
  {
    id: "sentence-02",
    topic: "数字工具",
    english: "Digital tools can improve learning only when students set clear boundaries for their use.",
    chinese: "只有当学生为数字工具的使用设定清晰边界时，数字工具才能改善学习。",
    pattern: "only when ... can ...",
    keywords: ["improve learning", "set clear boundaries", "for their use"],
    writingUse: "适合数字化、专注力和教育类作文的让步与条件表达。",
    speakingUse: "可用于讨论手机是否有助于学习。",
    note: "only when 置于句首时，主句使用部分倒装；本句放在主语后，结构更易掌握。",
  },
  {
    id: "sentence-03",
    topic: "教育公平",
    english: "Access to reliable information is essential for students from different educational backgrounds.",
    chinese: "可靠信息的获取对于来自不同教育背景的学生至关重要。",
    pattern: "Access to ... is essential for ...",
    keywords: ["access to", "reliable information", "educational backgrounds"],
    writingUse: "适合教育机会、公共服务和信息公平主题。",
    speakingUse: "可用于说明学校应提供什么资源。",
    note: "access 是不可数名词，常用 access to something，不要写 access of。",
  },
  {
    id: "sentence-04",
    topic: "环境保护",
    english: "Small changes in daily habits can make a meaningful contribution to environmental protection.",
    chinese: "日常习惯中的微小改变可以为环境保护作出有意义的贡献。",
    pattern: "make a contribution to ...",
    keywords: ["small changes", "daily habits", "meaningful contribution"],
    writingUse: "适合环境、低碳生活和个人责任类作文。",
    speakingUse: "可用于回答个人如何保护环境。",
    note: "contribution 后接介词 to；meaningful 比 important 更适合表达“有意义的”。",
  },
  {
    id: "sentence-05",
    topic: "城市生活",
    english: "Well-designed public spaces can strengthen community ties and improve the quality of urban life.",
    chinese: "设计合理的公共空间可以加强社区联系，改善城市生活质量。",
    pattern: "can strengthen ... and improve ...",
    keywords: ["well-designed", "community ties", "quality of urban life"],
    writingUse: "适合城市发展、公共设施和社区服务类作文。",
    speakingUse: "可用于描述理想城市或社区。",
    note: "两个并列动词共用 can，避免重复写 can。",
  },
  {
    id: "sentence-06",
    topic: "科技创新",
    english: "Innovation becomes meaningful when it solves a real problem instead of merely attracting attention.",
    chinese: "当创新解决真实问题，而不是仅仅吸引注意时，创新才有意义。",
    pattern: "when ... instead of ...",
    keywords: ["becomes meaningful", "solve a real problem", "merely"],
    writingUse: "适合科技创新、人工智能和公共产品类作文。",
    speakingUse: "可用于评价一种新技术是否真正有用。",
    note: "instead of 后接动名词或名词；merely 表示“仅仅”，可降低表达绝对化。",
  },
  {
    id: "sentence-07",
    topic: "阅读方法",
    english: "The ability to locate evidence quickly is just as important as the ability to understand the main idea.",
    chinese: "快速定位证据的能力与理解主旨的能力同样重要。",
    pattern: "as important as ...",
    keywords: ["locate evidence", "main idea", "just as ... as"],
    writingUse: "可迁移到阅读策略、信息素养和学习方法主题。",
    speakingUse: "可用于解释考试阅读中为什么要找证据。",
    note: "两个 ability to do 结构并列，句子有较强的六级写作质感。",
  },
  {
    id: "sentence-08",
    topic: "听力训练",
    english: "Repeated exposure to natural speech gradually makes unfamiliar sounds easier to recognize.",
    chinese: "反复接触自然语音会逐渐使陌生的声音更容易被识别。",
    pattern: "make + object + adjective",
    keywords: ["repeated exposure", "natural speech", "recognize"],
    writingUse: "适合学习方法、语言输入和个人成长类表达。",
    speakingUse: "可用于回答如何提高听力。",
    note: "make unfamiliar sounds easier to recognize 是 make 宾语+形容词+不定式结构。",
  },
  {
    id: "sentence-09",
    topic: "文化传承",
    english: "Traditional culture remains alive when it is explained in a way that younger generations can understand.",
    chinese: "当传统文化以年轻一代能够理解的方式被讲述时，它才能保持活力。",
    pattern: "in a way that ...",
    keywords: ["remain alive", "traditional culture", "younger generations"],
    writingUse: "适合中国文化、非遗、教育和代际交流主题。",
    speakingUse: "可用于回答如何让传统文化吸引年轻人。",
    note: "in a way that 引出定语从句，比简单写 so that 更精准。",
  },
  {
    id: "sentence-10",
    topic: "就业与能力",
    english: "Employers increasingly value applicants who can communicate clearly and adapt to changing situations.",
    chinese: "雇主越来越看重能够清晰沟通并适应变化情境的申请者。",
    pattern: "value applicants who ...",
    keywords: ["increasingly", "applicants", "adapt to"],
    writingUse: "适合就业、大学教育和综合能力主题。",
    speakingUse: "可用于讨论大学生应培养哪些能力。",
    note: "who 引导定语从句，同时修饰 applicants；adapt to 后接名词或动名词。",
  },
  {
    id: "sentence-11",
    topic: "公共健康",
    english: "A sustainable routine should leave enough room for rest, exercise and meaningful social interaction.",
    chinese: "可持续的日常安排应该留出足够时间用于休息、锻炼和有意义的社交。",
    pattern: "leave room for ...",
    keywords: ["sustainable routine", "leave room for", "social interaction"],
    writingUse: "适合健康、平衡生活和大学生时间管理主题。",
    speakingUse: "可用于回答如何安排大学生活。",
    note: "leave room for 是高频搭配；enough 修饰 room，不要机械翻译成 leave enough time。",
  },
  {
    id: "sentence-12",
    topic: "社会责任",
    english: "Responsible citizens do not simply complain about public problems; they also look for practical ways to improve them.",
    chinese: "负责任的公民不会只是抱怨公共问题，他们也会寻找切实可行的办法来改善这些问题。",
    pattern: "not simply ...; also ...",
    keywords: ["responsible citizens", "public problems", "practical ways"],
    writingUse: "适合社会责任、志愿服务和公共参与类作文。",
    speakingUse: "可用于回答大学生如何参与社区。",
    note: "not simply ... also ... 形成对照，适合避免观点单薄。",
  },
  coreSentence("sentence-13", "教育方法", "A well-designed course should not only deliver information but also teach students how to ask better questions.", "一门设计合理的课程不仅应该传递信息，还应该教会学生如何提出更好的问题。", "not only ... but also ...", ["well-designed course", "deliver information", "ask better questions"], "适合教育改革、课堂质量和人才培养主题。", "可用于说明理想课程应具备什么特点。", "not only...but also连接两个并列动词，主语共用 should。"),
  coreSentence("sentence-14", "反馈与成长", "When feedback is specific and timely, students are more likely to turn mistakes into practical improvements.", "当反馈具体且及时，学生更有可能把错误转化为切实的改进。", "be likely to turn A into B", ["specific and timely", "turn mistakes into", "practical improvements"], "适合教育评价、学习方法和个人成长主题。", "可用于回答如何有效利用老师或同伴反馈。", "be likely to 后接动词原形；turn A into B表示把A转化为B。"),
  coreSentence("sentence-15", "教育公平", "Universities can narrow the opportunity gap by providing flexible support instead of assuming that every learner starts from the same point.", "大学可以通过提供灵活支持来缩小机会差距，而不是假设每个学习者都从同一起点出发。", "by doing ... instead of doing ...", ["narrow the opportunity gap", "flexible support", "start from the same point"], "适合教育公平、公共资源和包容性教育主题。", "可用于讨论学校如何帮助不同背景的学生。", "by引出方式；instead of后接动名词，表达对比措施。"),
  coreSentence("sentence-16", "考试评价", "The purpose of assessment is not merely to rank students but to show them what they should improve next.", "评价的目的不仅是给学生排名，还应该让他们知道下一步需要改进什么。", "The purpose of ... is not merely ... but ...", ["purpose of assessment", "rank students", "improve next"], "适合考试评价、教育目标和反馈机制主题。", "可用于说明考试成绩之外的评价价值。", "not merely...but...比简单写not only更适合强调目的。"),
  coreSentence("sentence-17", "数字工具", "Convenience should never be mistaken for genuine understanding, especially when a tool provides an answer too quickly.", "便利绝不应被误认为真正的理解，尤其是在工具过快给出答案时。", "should never be mistaken for ...", ["convenience", "genuine understanding", "too quickly"], "适合人工智能、独立思考和数字素养主题。", "可用于讨论为什么不能盲目依赖工具。", "mistake A for B表示把A误认为B；especially when补充风险条件。"),
  coreSentence("sentence-18", "数字素养", "Before relying on an automated suggestion, users should check its source, purpose and possible limitations.", "在依赖自动化建议之前，使用者应该核查它的来源、目的和可能的局限。", "Before doing ..., ... should ...", ["rely on", "automated suggestion", "possible limitations"], "适合人工智能、信息核验和网络安全主题。", "可用于回答如何负责任地使用人工智能。", "三个并列名词source、purpose和limitations让表达更完整。"),
  coreSentence("sentence-19", "科技创新", "Technology is most useful when it removes unnecessary barriers without removing the need for human judgment.", "当技术消除不必要的障碍而没有消除人的判断需要时，技术才最有用。", "be most useful when ... without ...", ["remove barriers", "human judgment", "unnecessary"], "适合科技创新、智能服务和人机关系主题。", "可用于评价技术是否真正改善生活。", "without后接动名词，表示技术改进的边界。"),
  coreSentence("sentence-20", "信息公平", "Digital access matters only if people can understand the information and use it to make informed decisions.", "数字化获取只有在人们能够理解信息并用它作出知情决定时才有意义。", "matter only if ...", ["digital access", "informed decisions", "understand information"], "适合数字鸿沟、公共服务和信息公平主题。", "可用于说明设备普及不等于真正平等。", "matter only if引出必要条件；informed decision表示知情决定。"),
  coreSentence("sentence-21", "环境保护", "Protecting the environment requires both responsible individual choices and policies that make those choices easier to maintain.", "保护环境既需要个人作出负责任的选择，也需要让这些选择更容易坚持的政策。", "require both A and B", ["responsible choices", "policies", "maintain"], "适合环境保护、公共政策和低碳生活主题。", "可用于回答个人行动与政府政策的关系。", "both...and连接两个并列名词短语；that引导定语从句。"),
  coreSentence("sentence-22", "绿色出行", "Public transport becomes attractive when it is reliable, affordable and convenient enough for everyday use.", "当公共交通足够可靠、负担得起且便利到可以日常使用时，它才会有吸引力。", "become attractive when ...", ["reliable", "affordable", "everyday use"], "适合绿色出行、城市治理和公共服务主题。", "可用于说明人们为什么选择或放弃公共交通。", "三个形容词并列，具体回答政策如何改变行为。"),
  coreSentence("sentence-23", "公共政策", "A policy is more likely to succeed when its benefits are visible and its requirements are realistic.", "一项政策的好处清晰可见且要求切实可行时，更有可能取得成功。", "be more likely to succeed when ...", ["policy", "visible benefits", "realistic requirements"], "适合政策执行、社会治理和公共参与主题。", "可用于评价一项措施是否可持续。", "visible与realistic分别对应效果感知和执行成本。"),
  coreSentence("sentence-24", "发展观念", "Economic growth should be judged not only by how much is produced but also by how fairly its benefits are shared.", "经济增长不应只根据生产了多少来判断，还应看增长收益分配得是否公平。", "be judged by ... not only ... but also ...", ["economic growth", "judge by", "fairly shared"], "适合经济发展、社会公平和共同富裕主题。", "可用于讨论如何定义高质量发展。", "被动结构be judged by适合正式写作，how引导两个并列宾语从句。"),
  coreSentence("sentence-25", "文化传承", "Cultural heritage can be preserved more effectively when local communities are treated as active participants rather than passive audiences.", "当当地社区被视为积极参与者而不是被动观众时，文化遗产才能得到更有效的保护。", "treat A as ... rather than ...", ["cultural heritage", "active participants", "passive audiences"], "适合文化传承、非遗保护和社区参与主题。", "可用于说明保护文化不能只靠展示。", "be treated as被动语态；rather than突出角色转变。"),
  coreSentence("sentence-26", "翻译表达", "Translation involves more than replacing words; it also requires attention to context, tone and cultural meaning.", "翻译不仅是替换词语，还需要关注语境、语气和文化含义。", "involve more than ...; require attention to ...", ["replace words", "context", "cultural meaning"], "适合翻译方法、文化交流和语言学习主题。", "可用于说明好的翻译为什么不能逐词对应。", "分号后的it指translation，requires与involves形成递进。"),
  coreSentence("sentence-27", "青年参与", "Young people are more willing to engage with tradition when they are allowed to reinterpret it in contemporary forms.", "当年轻人被允许以当代形式重新诠释传统时，他们更愿意参与其中。", "be willing to do when ...", ["engage with tradition", "reinterpret", "contemporary forms"], "适合传统文化、青年参与和文化创新主题。", "可用于回答如何让传统文化吸引年轻人。", "be allowed to do表达被给予空间；engage with比简单的like更准确。"),
  coreSentence("sentence-28", "文化创新", "A tradition gains new meaning when it continues to answer the needs of the people who inherit it.", "一项传统在继续回应传承者需求时会获得新的意义。", "gain new meaning when ...", ["gain new meaning", "answer the needs", "inherit"], "适合文化传承、代际关系和社会变化主题。", "可用于讨论传统如何在现代社会延续。", "who引导定语从句修饰people；inherit在此表示继承文化。"),
  coreSentence("sentence-29", "写作论证", "A convincing argument connects a clear claim with evidence that directly addresses the question under discussion.", "有说服力的论点会把清晰的主张与直接回应讨论问题的证据联系起来。", "connect A with B that ...", ["convincing argument", "clear claim", "directly address"], "适合写作方法、论证和信息判断主题。", "可用于解释一篇文章为什么有说服力。", "that引导定语从句修饰evidence；directly强调证据相关性。"),
  coreSentence("sentence-30", "段落结构", "A clear paragraph usually begins with a focused topic sentence and develops it through explanation or example.", "一个清晰的段落通常以明确的主题句开头，并通过解释或例子展开。", "begin with ... and develop ... through ...", ["focused topic sentence", "develop", "explanation or example"], "适合六级作文段落结构和主题句训练。", "可用于回答如何组织一段英文表达。", "begin和develop共享主语；through表示展开手段。"),
  coreSentence("sentence-31", "举例论证", "Examples are persuasive only when they clarify the general point instead of distracting readers from it.", "例子只有在阐明一般观点而不是让读者偏离观点时才有说服力。", "be persuasive only when ... instead of ...", ["persuasive", "clarify the point", "distract readers"], "适合写作举例、论证有效性和信息组织主题。", "可用于说明举例不能只是罗列经历。", "only when限定条件；instead of后接动名词。"),
  coreSentence("sentence-32", "让步表达", "Acknowledging a limitation does not weaken an argument if the writer explains how the problem can be addressed.", "如果作者解释了如何解决问题，承认局限并不会削弱论点。", "does not ... if ...", ["acknowledge a limitation", "weaken an argument", "address a problem"], "适合六级作文让步、平衡观点和措施论证。", "可用于回答如何处理一个方案的缺点。", "if从句说明承认局限后仍有解决路径，逻辑比绝对化表达更稳。"),
  coreSentence("sentence-33", "口语观点", "I would approach this issue from both the individual and the institutional perspective.", "我会从个人和制度两个角度来分析这个问题。", "approach an issue from both A and B", ["approach an issue", "individual perspective", "institutional perspective"], "适合口试讨论、观点展开和作文开头。", "可直接用作口语Part 2或讨论题的结构句。", "from both...and...提示后文要分别展开两个层面。"),
  coreSentence("sentence-34", "口语衔接", "From my perspective, the most practical solution is to improve the system before asking individuals to change their habits.", "在我看来，最实际的解决方案是在要求个人改变习惯之前先改进制度。", "From my perspective, ... before ...", ["practical solution", "improve the system", "change habits"], "适合写作措施段和口语观点题。", "可用于提出先解决环境条件再要求个人行动的观点。", "before引出先后关系；asking individuals to do比要求某人改变更自然。"),
  coreSentence("sentence-35", "口语举措", "One practical way to encourage participation is to reduce the time and information costs involved.", "鼓励参与的一种实际方式是降低参与所涉及的时间和信息成本。", "One practical way to ... is to ...", ["encourage participation", "reduce costs", "involved"], "适合公共参与、志愿服务和校园活动主题。", "可用于回答如何让更多人参加一项活动。", "involved后置修饰costs；time and information costs使措施更具体。"),
  coreSentence("sentence-36", "口语平衡", "It is difficult to solve a complex problem with a single measure, because different groups may face different barriers.", "很难用一项措施解决复杂问题，因为不同群体可能面临不同障碍。", "It is difficult to ... because ...", ["complex problem", "single measure", "different barriers"], "适合写作结尾、政策分析和口语讨论。", "可用于避免把复杂问题简单化。", "because从句给出原因；may face保留合理的不确定性。"),
  coreSentence("sentence-37", "阅读策略", "Readers should distinguish between information that is merely mentioned and evidence that supports the author's conclusion.", "读者应该区分仅被提及的信息和支持作者结论的证据。", "distinguish between A and B", ["merely mentioned", "support a conclusion", "evidence"], "适合阅读理解、信息筛选和批判性思维主题。", "可用于解释做阅读题时为什么不能看到原词就选。", "merely降低信息重要性；that引导两个定语从句保持结构平行。"),
  coreSentence("sentence-38", "阅读判断", "A headline may attract attention, but the details determine whether a claim is reliable.", "标题可能吸引注意，但细节决定一个说法是否可靠。", "A may ..., but B determines whether ...", ["headline", "attract attention", "reliable claim"], "适合媒体素养、网络信息和阅读方法主题。", "可用于讨论如何判断网络消息。", "but后用details与headline形成对比；whether引出判断内容。"),
  coreSentence("sentence-39", "逻辑关系", "The relationship between a problem and its solution becomes clearer when the causes are identified before the measures are proposed.", "当在提出措施前先找出原因时，问题与解决方案之间的关系会更清晰。", "becomes clearer when ... before ...", ["relationship", "identify causes", "propose measures"], "适合写作问题解决型作文和阅读逻辑。", "可用于回答为什么建议必须建立在原因分析之上。", "被动结构are identified和are proposed保持形式平行。"),
  coreSentence("sentence-40", "证据判断", "Evidence becomes more convincing when it is specific enough to be checked and relevant enough to answer the question.", "证据足够具体、可以核查，并且足够相关、能够回答问题时，会更有说服力。", "be ... enough to ... and ... enough to ...", ["convincing evidence", "be checked", "relevant"], "适合阅读证据、写作论证和信息素养主题。", "可用于说明什么样的例子才真正有效。", "两个enough to结构并列，分别强调可核查性和相关性。"),
  coreSentence("sentence-41", "健康生活", "A realistic schedule should protect essential tasks while leaving enough flexibility for unexpected changes.", "一个现实的时间表既要保证重要任务，也要为意外变化留下足够弹性。", "should ... while leaving ... for ...", ["realistic schedule", "essential tasks", "unexpected changes"], "适合时间管理、健康生活和学习计划主题。", "可用于说明为什么计划不能排得过满。", "while连接同时发生的两个要求；leave flexibility for是固定搭配。"),
  coreSentence("sentence-42", "注意力管理", "Short breaks are helpful when they restore attention rather than become another source of distraction.", "短暂休息在恢复注意力而不是变成另一种干扰时才有帮助。", "be helpful when ... rather than ...", ["restore attention", "source of distraction", "short breaks"], "适合学习方法、数字自律和健康主题。", "可用于讨论休息和手机使用的区别。", "rather than后的become与restore保持并列逻辑。"),
  coreSentence("sentence-43", "睡眠与学习", "Sleep is not wasted time; it is part of the process through which the brain organizes new information.", "睡眠不是浪费时间，而是大脑整理新信息过程的一部分。", "not ...; it is part of ... through which ...", ["wasted time", "organize information", "process"], "适合健康、学习科学和效率主题。", "可用于回答为什么备考不能长期熬夜。", "through which引导定语从句，说明process的作用。"),
  coreSentence("sentence-44", "就业能力", "Employers value graduates who can learn independently, communicate clearly and respond constructively to criticism.", "雇主看重能够独立学习、清晰沟通并建设性回应批评的毕业生。", "value graduates who can ...", ["learn independently", "communicate clearly", "constructively"], "适合就业、大学教育和综合能力主题。", "可用于回答大学生应培养哪些能力。", "三个动词并列，constructively修饰respond，表达回应方式。"),
  coreSentence("sentence-45", "适应变化", "The ability to adapt does not mean abandoning one's principles; it means applying them wisely in changing situations.", "适应能力并不意味着放弃原则，而是意味着在变化的情境中明智地运用原则。", "does not mean ...; it means ...", ["ability to adapt", "principles", "changing situations"], "适合就业、个人成长和社会变化主题。", "可用于回答适应变化是否等于没有立场。", "分号后的it指the ability to adapt；applying与abandoning形成对照。"),
  coreSentence("sentence-46", "实践学习", "Internships are valuable when students are encouraged to reflect on what they observe instead of simply completing assigned tasks.", "当学生被鼓励反思所观察到的内容，而不是只完成分配的任务时，实习才有价值。", "be valuable when ... instead of ...", ["internships", "reflect on", "assigned tasks"], "适合就业、实践教育和能力培养主题。", "可用于讨论实习如何真正帮助大学生。", "reflect on后接名词或动名词；instead of强调从做事到反思的提升。"),
  coreSentence("sentence-47", "公共服务", "Public services should be designed around people's actual needs rather than around the convenience of the provider.", "公共服务应该围绕人们的实际需求设计，而不是围绕提供者的便利设计。", "be designed around ... rather than ...", ["public services", "actual needs", "provider"], "适合公共治理、服务型政府和社会公平主题。", "可用于评价一个公共服务是否真正以人为本。", "rather than连接两个介词短语，结构简洁有力。"),
  coreSentence("sentence-48", "社区参与", "Community participation becomes sustainable when people can see both the value of their contribution and the results it produces.", "当人们既能看到自己的贡献价值，也能看到它产生的结果时，社区参与才可持续。", "becomes sustainable when ... both ... and ...", ["community participation", "value of contribution", "results"], "适合志愿服务、社区建设和社会责任主题。", "可用于回答如何让志愿活动长期开展。", "both连接value和results；it指their contribution。"),
].map(normalizeCoreSentence));

export function dailyCoreSentences(day = 1) {
  const normalizedDay = Math.max(1, Number(day) || 1);
  const start = ((normalizedDay - 1) * 3) % CORE_SENTENCES.length;
  return [0, 1, 2].map((offset) => CORE_SENTENCES[(start + offset) % CORE_SENTENCES.length]);
}
