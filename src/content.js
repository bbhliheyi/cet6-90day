export const APP_VERSION = "0.1.0";

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
      task("errors", "review", "模拟错题归因", 40, "逐题选择错误原因，并写出下一次可执行的纠正动作。"),
      task("vocabulary", "vocabulary", "高频错词回炉", 25, "完成错词拼写、听写和语境复习。"),
      task("listening", "listening", "听力错段精听", 25, "对最薄弱片段完成逐句听写和跟读。"),
      task("reading", "reading", "阅读证据复核", 25, "重新定位证据句，比较错误选项的干扰方式。"),
      task("output", "writing", "写译错误改写", 25, "选择三处典型错误重新表达。"),
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
      task("listening", "listening", "轻量听力热身", 15, "保持语音敏感度，不追求训练量。"),
      task("review", "review", "状态与策略确认", 15, "确认作息、答题顺序和个人检查清单。"),
    ];
  }

  if (WEEKLY_TEST_DAYS.has(day)) {
    return [
      task("vocabulary", "vocabulary", "100词周测", 25, "混合认读、拼写、听写和语境题。"),
      task("listening", "listening", "听力整组训练", 25, "一次完成后再进入精听复盘。"),
      task("reading", "reading", "阅读组合训练", 30, "记录每题耗时和证据位置。"),
      task("output", day % 2 ? "translation" : "writing", "写作或翻译限时任务", 25, "完成后按个人错误清单检查。"),
      task("speaking", "speaking", "口语录音", 15, "完成一次计时表达并回听自评。"),
      task("review", "review", "周报与计划校准", 15, "比较本周正确率、耗时和学习完成度。"),
    ];
  }

  const outputModule = day % 2 === 0 ? "writing" : "translation";
  const outputTitle = outputModule === "writing" ? "写作训练" : "翻译训练";
  return [
    task("vocabulary", "vocabulary", "词汇学习与到期复习", 25, `围绕“${title}”完成认读、拼写或语境训练。`),
    task("listening", "listening", "听力精练", 25, "首听答题、二听定位、三听复盘一个薄弱片段。"),
    task("reading", "reading", "阅读限时训练", 30, "完成一组题并标出证据句与干扰项。"),
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

export const PRACTICE_CONTENT = Object.freeze({
  listening: [
    {
      id: "listen-urban-library",
      title: "长对话：城市图书馆的新服务",
      script: "The city library has extended its weekend opening hours after a three-month trial. According to the librarian, the change was not simply a response to higher visitor numbers. Many university students had asked for a quiet place to study in the evening. The library will review the service again in December before deciding whether to make it permanent.",
      question: "Why did the library extend its weekend hours?",
      options: ["To host more public lectures", "To provide students with evening study space", "To reduce the number of weekday visitors", "To prepare for a building renovation"],
      answer: 1,
      explanation: "关键信息是 university students asked for a quiet place to study in the evening。",
    },
    {
      id: "listen-campus-garden",
      title: "听力篇章：校园共享花园",
      script: "A group of students turned an unused corner of their campus into a small community garden. The project was originally designed to teach practical environmental skills, but it soon produced an unexpected benefit. Students from different departments began to meet there and exchange ideas. The organizers now consider social connection as important as the vegetables they grow.",
      question: "What unexpected benefit did the garden produce?",
      options: ["It lowered food prices", "It attracted professional farmers", "It encouraged students from different departments to connect", "It increased the size of the campus"],
      answer: 2,
      explanation: "unexpected benefit 后说明不同院系学生开始见面并交流。",
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
    },
  ],
  writing: [
    { id: "write-digital-focus", title: "数字工具与专注力", prompt: "Write an essay on how university students can use digital tools without allowing them to weaken concentration. Give reasons and practical examples.", hints: ["明确数字工具既有价值也有干扰", "提出两项可执行措施", "结尾回到有意识使用技术"] },
    { id: "write-campus-service", title: "大学生参与校园公共服务", prompt: "Write an essay on whether university students should take part in improving shared campus services. Support your view with reasons and examples.", hints: ["说明参与的教育价值", "讨论时间成本或边界", "给出具体参与方式"] },
  ],
  translation: [
    { id: "trans-winter-city", title: "北方城市的冬季公共生活", source: "在中国北方，冬季不仅意味着寒冷，也形成了独特的公共生活。许多城市通过冰雪运动、节庆活动和公共文化空间，鼓励居民走出家门。合理利用冬季资源既能丰富市民生活，也能带动当地旅游和服务业的发展。", keyPoints: ["不仅……也……的并列结构", "鼓励某人做某事", "合理利用资源", "带动旅游和服务业发展"] },
    { id: "trans-community-library", title: "社区图书馆", source: "近年来，一些社区图书馆开始提供更加灵活的服务。除了借阅图书，人们还可以参加讲座、学习数字技能或与邻居交流。这些小型公共空间使知识更容易获得，也增强了社区成员之间的联系。", keyPoints: ["近年来的时态", "除了……还……", "使知识更容易获得", "增强成员之间的联系"] },
  ],
  speaking: [
    { id: "speak-learning-space", title: "理想的学习空间", prompt: "Describe an ideal place for university students to study. Explain what facilities it should provide and why.", followUp: "Should universities keep study spaces open late at night? Why or why not?" },
    { id: "speak-community-work", title: "大学生与社区服务", prompt: "Describe one useful way university students can contribute to their local community.", followUp: "What can students learn from participating in community work?" },
    { id: "speak-technology", title: "课堂中的数字工具", prompt: "Do digital tools always improve classroom learning? Give reasons and an example.", followUp: "How should teachers respond when technology distracts students?" },
  ],
});

export const PREP_TASKS = Object.freeze([
  task("check-registration", "notice", "核对报名资格与报名状态", 10, "登录全国报名系统，确认学籍、照片、科目和缴费状态。"),
  task("set-goal", "plan", "设置目标与每日时长", 10, "确定目标分、是否参加口试以及60/90/130分钟模式。"),
  task("device", "speaking", "检查耳机和麦克风", 10, "确认浏览器可以播放语音并录制口语。"),
  task("backup", "data", "了解数据备份", 5, "完成一次JSON导出，确认学习记录只保存在当前设备。"),
]);

export const SKILL_LABELS = Object.freeze({
  vocabulary: "词汇",
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  translation: "翻译",
  speaking: "口语",
  review: "复盘",
  exam: "考试",
  notice: "通知",
  plan: "计划",
  data: "数据",
});
