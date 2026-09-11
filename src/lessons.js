const LESSON = (id, module, title, subtitle, dayRange, sections) => ({ id, module, title, subtitle, dayRange, sections });

export const LESSONS = Object.freeze([
  LESSON("vocabulary-method", "vocabulary", "六级词汇：从认识到会用", "认读、拼写、听音、语境和搭配五层掌握", "贯穿 DAY 1—90，DAY 8—21重点学习", [
    {
      title: "什么才算真正掌握一个词？",
      paragraphs: [
        "只看到中文能认出英文，不等于在听力、阅读和写作中会用。六级词汇至少要经过五层：看到能认义、听到能辨音、给中文能拼写、放进句子能判断、与常见搭配一起输出。",
        "每天的新词量必须服从复习量。如果到期复习超过40个，当天先减少新词，避免只追求数字而没有记忆巩固。",
      ],
      steps: ["先看英文预测词义和词性", "听一遍发音并跟读两遍", "遮住英文完成一次拼写", "阅读原创例句并找出语法位置", "说出或写出一个常用搭配"],
    },
    {
      title: "例词拆解：substantial",
      example: {
        prompt: "The report provides substantial evidence for the proposal.",
        analysis: "evidence 是不可数名词，前面需要形容词；substantial 在这里不是“物质的”，而是“大量且有分量的”。",
        answer: "核心义：大量的、实质性的；高频搭配：substantial evidence / substantial amount / substantial improvement。",
      },
      errors: ["只背一个中文义，遇到熟词生义无法识别", "忽略词性，选词填空时位置判断错误", "会认不会拼，写作和翻译无法主动使用", "孤立背单词，不记录搭配和原句"],
    },
    {
      title: "每日达标线",
      checklist: ["完成今日系统队列，不跳过到期词", "新词至少完成认读和拼写两轮", "当日错词在队列末尾重做一次", "抽查10词达到70%，冲刺期达到80%", "能主动写出至少3个今日搭配"],
    },
  ]),
  LESSON("listening-method", "listening", "六级听力答题：预读、定位与排除", "先预测问题，再跟踪证据；听音障碍转入磨耳朵模块", "DAY 3、22—28、50、57及模拟阶段", [
    {
      title: "三类听力分别考什么？",
      paragraphs: [
        "长对话通常考人物关系、原因、计划、态度和建议；听力篇章强调事件顺序、主旨与细节；讲话、报道、讲座更强调结构信号、概念解释和观点推断。",
        "正式训练不要一开始就看文本。先按考试状态听一遍并作答，才能判断问题出在听音、词汇、定位还是推断。",
      ],
      steps: ["播放前：预读选项并圈人物、原因、态度和结果词", "首听：不暂停，跟住当前问题并完成选择", "二听：标记答案前后的否定、转折和因果信号", "提交后：逐项解释正确证据与干扰方式", "若证据看懂但声音没听出：把片段转入磨耳朵五步训练"],
    },
    {
      title: "例题：为什么图书馆延长开放时间？",
      example: {
        prompt: "not simply a response to higher visitor numbers ... students had asked for a quiet place to study in the evening",
        analysis: "not simply 否定了“因为访客更多”这一表面原因，真正答案出现在转折后的学生需求。听到否定、转折和原因表达时应提高注意力。",
        answer: "To provide students with evening study space.",
      },
      errors: ["听到原词 visitor numbers 就立刻选含访客数量的选项", "只记单词，没有跟踪否定和转折", "错后只看答案，不重新听证据句", "精听整篇导致耗时过长，反而无法坚持"],
    },
    {
      title: "错因判断",
      checklist: ["文本里词认识但声音没听出：转入磨耳朵处理连读、弱读和重音", "文本里词本身不认识：加入词本并保留原句", "句子听懂但答案错：检查定位和同义替换", "两项都像答案：比较问题问的是原因、结果还是态度", "总在后半段丢失：训练讲座结构词和笔记缩写"],
    },
  ]),
  LESSON("ear-training-method", "eartraining", "磨耳朵：训练连续语流理解", "用长对话、篇章、报道和讲座训练声音到意义的直接反应", "每日10分钟，与听力选择题分开完成", [
    {
      title: "核心句与磨耳朵为什么必须分开？",
      paragraphs: [
        "核心句是输出素材，目标是会翻译、会改写、能用于写作和口语；磨耳朵是连续输入训练，目标是在没有文本的情况下跟住人物、结构、转折、重音和信息推进。",
        "把一个漂亮单句循环播放，只能熟悉这个句子的声音，不能充分模拟六级长对话、听力篇章以及讲话、报道、讲座中的信息负荷。因此磨耳朵使用有上下文的多句材料。",
        "现行官方大纲给出的六级听力材料语速为每分钟140—160词。训练采用阶梯式适应：从0.8倍起步，每7天最多提高0.1倍；如果主旨题正确率低于70%，先保持当前速度并回到连读、弱读和重音的听辨。本站浏览器朗读不作为官方音频替代。",
      ],
      steps: ["盲听全文一遍，只判断场景、人物或主题", "第二遍完成一道主旨或结构题", "第三遍听写3个关键语块，而不是逐字抄全文", "查看文本，标出否定、转折、因果和总结信号", "按句群影子跟读，再用2—3句复述材料"],
    },
    {
      title: "四类材料分别练什么？",
      example: {
        prompt: "长对话、篇章、报道和讲座是否可以用同一种听法？",
        analysis: "不能完全相同。长对话追踪人物意图与最终决定；篇章追踪事件或说明顺序；报道关注背景、数据变化和后续决定；讲座关注概念定义、例证、修正和总结。",
        answer: "先识别材料类型，再预测信息结构。即使漏听局部词语，也要继续跟住当前说话者正在完成的功能。",
      },
      errors: ["一开始就看文本，无法暴露真实听音问题", "每个词都想听清，漏一个词后停止跟踪", "只听很多遍却不复述，无法验证是否理解", "把浏览器朗读当作官方真题音频，不关注设备语音差异"],
    },
    {
      title: "每日10分钟达标线",
      checklist: ["不看文本完成至少1遍全文盲听", "主旨题作答并能说出依据", "3个关键语块至少听写对2个", "跟读一个重点句群至少2遍", "不看文本完成2—3句口头复述", "五步全部完成才记录为今日磨耳朵达标"],
    },
  ]),
  LESSON("reading-method", "reading", "六级阅读：定位、证据与排除", "不同题型使用不同速度，答案必须回到文本证据", "DAY 4、29—35、51、58及模拟阶段", [
    {
      title: "三类阅读的时间与方法",
      paragraphs: [
        "选词填空先判断空格词性，再看搭配和逻辑；长篇匹配先读题干关键词，再寻找同义替换；仔细阅读先读题目，带着问题定位段落并排除干扰项。",
        "阅读训练不是把文章逐句翻译成中文。训练目标是更快地找到能回答问题的证据，并解释其他选项为什么不成立。",
      ],
      steps: ["圈出题干中的对象、动作和限定词", "预测答案可能出现的段落和表达方式", "找到证据句，并向前后各看一句", "把正确选项与证据做同义对应", "逐项写出错误选项的偷换、扩大或相反之处"],
    },
    {
      title: "例题：怎样的学习休息才有效？",
      example: {
        prompt: "The key is to decide the length and purpose of the break in advance.",
        analysis: "题干问 effective break，原文 key 引出核心条件。选项中的 planned 对应 in advance，length and purpose 几乎完整复现证据。",
        answer: "It should have a planned length and purpose.",
      },
      errors: ["选了文章提到但不是答案的信息", "把 may、can 等可能性扩大为 always", "题干问作者观点，却选择例子细节", "做完不标证据，无法判断是读懂还是猜对"],
    },
    {
      title: "每日达标线",
      checklist: ["选词填空完成10空并标词性", "长篇匹配完成10题并记录定位词", "仔细阅读完成1—2篇、每题标证据", "整组正确率基础期达到60%，强化期达到70%", "每个错题写清错误选项的干扰方式"],
    },
  ]),
  LESSON("writing-method", "writing", "六级写作：30分钟完成闭环", "审题、提纲、成文、检查，避免只背模板", "DAY 5、36—42、52、59及模拟阶段", [
    {
      title: "30分钟如何分配？",
      paragraphs: [
        "六级写作要求不少于150词。建议2分钟审题、3分钟提纲、22分钟成文、3分钟检查。先完成清楚准确的内容，再考虑句式变化。",
        "审题必须确认主题、写作任务、立场和受众。题目要求给出原因与措施时，只讨论现象而没有措施，会造成任务完成不足。",
      ],
      steps: ["写一句明确回应题目的中心句", "列两个互不重复的主体理由", "每个主体段使用解释或例子展开", "用连接手段体现因果、对比或让步", "检查主谓一致、时态、单复数、拼写和标点"],
    },
    {
      title: "例题：数字工具与专注力",
      example: {
        prompt: "How can students use digital tools without weakening concentration?",
        analysis: "文章不能只写数字工具的利弊。中心任务是提出兼顾工具使用与专注力的办法，可使用“限定通知”和“分段使用”作为两个主体段。",
        answer: "中心句示例：Digital tools can improve learning only when students set clear boundaries for when and why they use them.",
      },
      errors: ["背诵万能开头，第一段没有回应题目", "两个主体段表达同一个理由", "只堆高级词，出现搭配和语法错误", "不足150词或最后没有留检查时间"],
    },
    {
      title: "自评量表",
      checklist: ["任务回应：是否回答了题目要求的每一部分", "结构：每段是否只有一个中心任务", "展开：观点后是否有解释或例子", "语言：是否有准确的词汇和句式变化", "准确性：是否检查五类个人高频错误"],
    },
  ]),
  LESSON("translation-method", "translation", "六级翻译：先拆信息再写英语", "先保证信息完整，再优化句式与文化表达", "DAY 6、43—49、53、60及模拟阶段", [
    {
      title: "四步翻译法",
      paragraphs: [
        "先标出每句的时间、地点、主体、动作和逻辑关系，再决定英语主语。中文长句可以拆成两个英语句子，不必机械保持原句长度。",
        "文化专名不确定时，优先使用准确、可解释的普通表达，不要为了看起来高级而写无法确认的术语。",
      ],
      steps: ["划分意群并标逻辑关系", "确定每个分句的主语和谓语", "先写准确的核心句，再补修饰信息", "检查时态、冠词、单复数和介词", "回看中文，逐项检查是否遗漏信息"],
    },
    {
      title: "例句：合理利用冬季资源",
      example: {
        prompt: "合理利用冬季资源既能丰富市民生活，也能带动当地旅游和服务业的发展。",
        analysis: "主语可使用 Making proper use of winter resources；“既……也……”可用 not only ... but also ...；两个宾语分别是 residents' lives 与 local tourism and service industries。",
        answer: "Making proper use of winter resources can not only enrich residents' lives but also promote the development of local tourism and service industries.",
      },
      errors: ["逐字翻译中文语序，主干不清", "同一句反复更换主语造成逻辑混乱", "漏译时间、程度或并列关系", "只对照参考译文，不分析自己的错误类型"],
    },
    {
      title: "每日达标线",
      checklist: ["30分钟内完成一段，不空句", "中文关键信息覆盖率达到90%", "检查每句都有明确主谓结构", "标出并改写至少3处中式表达", "把不确定的文化表达加入个人词表"],
    },
  ]),
  LESSON("speaking-method", "speaking", "六级口语：结构化表达与互动", "覆盖自我介绍、个人陈述、讨论和问答", "DAY 6、54—71，口试考生重点学习", [
    {
      title: "如何在准备时间内组织内容？",
      paragraphs: [
        "个人陈述准备1分钟时，只写关键词，不写完整句。最稳定的结构是观点、两个理由或方面、一个例子、简短结论。",
        "讨论并不是轮流背诵。需要回应对方、补充理由、礼貌表达不同意见，并推动双方形成选择或结论。",
      ],
      steps: ["先用一句话直接回答问题", "给出两个清楚且不同的理由", "用具体校园或生活例子展开", "讨论中至少回应对方一次", "结尾总结共同点或最终选择"],
    },
    {
      title: "例题：理想的学习空间",
      example: {
        prompt: "Describe an ideal place for university students to study.",
        analysis: "可以按 physical environment、facilities、rules 三个关键词组织。无需列举所有设施，选择两项并解释为什么能提高学习效果。",
        answer: "开头示例：An ideal study space should be quiet enough for concentration but flexible enough for different learning activities.",
      },
      errors: ["准备时写完整句，真正回答时来不及组织", "长时间停顿后反复重启句子", "只表达自己，不回应讨论伙伴", "使用过长句导致语法和发音同时失控"],
    },
    {
      title: "录音自评",
      checklist: ["流利度：停顿是否用于组织而非频繁卡词", "可理解度：重音和句群是否清楚", "内容：是否完整回答题目", "词汇语法：是否准确而非盲目复杂", "互动：是否回应、追问和总结"],
    },
  ]),
  LESSON("review-method", "review", "错题复盘：把错误变成下一次动作", "区分知识缺口、方法错误、时间问题和粗心", "每日复盘、每周测后及DAY 73—84", [
    {
      title: "错题不是只抄正确答案",
      paragraphs: [
        "有效复盘至少回答四个问题：这题考什么、我的答案依据是什么、正确证据在哪里、下次看到什么信号要改变动作。",
        "同一道题反复错，通常不是记不住答案，而是没有修正产生错误的步骤。例如阅读定位错，应训练题干关键词和同义替换，而不是背选项。",
      ],
      steps: ["给错误选择一个主要原因", "重新作答且暂时不看解析", "写出正确证据或评分要点", "确定一个10—20分钟的补漏动作", "在1天、3天或7天后再次测试"],
    },
    {
      title: "四类缺口",
      example: {
        prompt: "为什么明明看懂文章仍然做错？",
        analysis: "可能是题干限定词漏看、证据段定位错误、同义替换没识别，或选项把局部事实扩大为作者观点。",
        answer: "不要笼统记录“粗心”。必须写成可验证原因，例如“没有看到题干中的 mainly，选择了次要细节”。",
      },
      errors: ["错因统一写成粗心", "只收藏不重做", "一次复盘处理太多低价值问题", "没有安排再次测试时间"],
    },
    {
      title: "补漏优先级",
      checklist: ["高权重且持续低分的模块优先", "同类错误一周出现3次以上优先", "可以在20分钟内修正的基础缺口优先", "偶发难题和偏题放在低优先级", "每周最多确定两个主攻缺口"],
    },
  ]),
  LESSON("exam-method", "exam", "完整模拟：建立可执行的考场流程", "不是简单刷分，而是验证时间、顺序和稳定性", "DAY 72—84，笔试前至少6次完整流程", [
    {
      title: "130分钟模拟如何执行？",
      paragraphs: [
        "模拟必须按写作30分钟、听力30分钟、阅读40分钟、翻译30分钟完成。训练时应尽量使用与正式考试相近的开始时间、桌面和文具。",
        "每次模拟只验证一到两个变量，例如阅读时间或写作检查流程，不要一次同时改变所有策略。",
      ],
      steps: ["考前5分钟完成物品与页面检查", "全程不查词典和笔记", "记录每部分结束时的剩余时间", "交卷后先标记不确定题再评分", "第二天完成深度复盘，而不是马上再做一套"],
    },
    {
      title: "怎样判断模拟有效？",
      example: {
        prompt: "分数提高但超时，算不算进步？",
        analysis: "不算稳定进步。正式考试受固定时间约束，超时得到的正确率不能直接代表考试表现。",
        answer: "必须同时记录正确率、实际耗时、未完成题数和高频错误。四项共同改善才说明策略有效。",
      },
      errors: ["只看总正确率，不看模块耗时", "做完当天立刻再刷题，未完成复盘", "模拟时随意暂停听力或查词", "频繁更换答题策略，无法比较效果"],
    },
    {
      title: "达标线",
      checklist: ["130分钟内完成全部模块", "写作不少于150词", "阅读没有因时间不足大面积猜题", "翻译保留至少3分钟检查", "所有错题在次日完成归因和补漏动作"],
    },
  ]),
]);

export const LESSON_BY_ID = Object.freeze(Object.fromEntries(LESSONS.map((lesson) => [lesson.id, lesson])));

export function lessonIdForModule(module) {
  const map = {
    vocabulary: "vocabulary-method",
    sentences: "writing-method",
    eartraining: "ear-training-method",
    listening: "listening-method",
    reading: "reading-method",
    writing: "writing-method",
    translation: "translation-method",
    speaking: "speaking-method",
    review: "review-method",
    exam: "exam-method",
    notice: "exam-method",
    plan: "review-method",
    data: "review-method",
  };
  return map[module] || "review-method";
}

export function dailyTaskGuidance(day, task, phase) {
  const weekly = [7, 14, 21, 28, 35, 42, 49, 56, 63, 84].includes(day);
  const mock = [72, 74, 76, 78, 81, 83].includes(day);
  const lateStage = day >= 50;
  const requirements = {
    vocabulary: {
      quantity: weekly ? "100词混合测验" : day >= 85 ? "错词20个 + 搭配10组" : "新词20个 + 到期复习最多30个",
      output: weekly ? "测验记录和错词清单" : "至少3个主动搭配",
      criterion: weekly ? `${lateStage ? 80 : 70}%及以上，错词当天重测` : "完成全部到期词；10词抽查至少7题正确",
    },
    sentences: {
      quantity: weekly ? "复习21句，抽查6句汉译英" : "学习或复习3句可输出表达",
      output: weekly ? "6句汉译英 + 3句主题改写" : "至少2句汉译英 + 1句写作或口语改写",
      criterion: "不是只会朗读；能够脱离原主题准确复用至少1个句型",
    },
    eartraining: {
      quantity: weekly ? "长对话、篇章或讲座1段完整五步训练" : "连续语流1段，约60—120秒",
      output: "主旨答案、3个关键语块、1次影子跟读和2—3句复述",
      criterion: "盲听主旨正确；语块至少2/3；完成跟读和复述",
    },
    listening: {
      quantity: weekly ? "完整听力专项1组" : mock ? "正式流程25题" : "选择题1组 + 精听60—90秒",
      output: "答案、证据句、选项分析和错因标签",
      criterion: `${lateStage ? 70 : 60}%及以上；每个错题标明听音、词汇、定位或推断原因`,
    },
    reading: {
      quantity: weekly ? "选词10空 + 匹配10题 + 仔细阅读1篇" : mock ? "正式流程30题" : "阅读1组，约5—10题",
      output: "每题证据位置和错误选项原因",
      criterion: `${lateStage ? 70 : 60}%及以上，并在计划时间内完成`,
    },
    writing: {
      quantity: "30分钟完整作文1篇，不少于150词",
      output: "提纲、初稿和五项自查结果",
      criterion: "完整回应任务；结构清楚；检查后无明显主谓、时态和拼写错误",
    },
    translation: {
      quantity: "30分钟段落翻译1篇",
      output: "译文、信息点核对和3处修改",
      criterion: "关键信息覆盖至少90%；每句主谓完整；不空译",
    },
    speaking: {
      quantity: day >= 64 ? "完整口试流程或2轮90秒陈述" : "1轮60—90秒录音",
      output: "录音和六维自评",
      criterion: "回答完整；无超过5秒空白；回听后至少改进1处",
    },
    review: {
      quantity: mock ? "整套模拟复盘" : "当天3条最高价值错题",
      output: "错因、证据、纠正动作和复测日期",
      criterion: "每条错误都有具体原因，不能只写“粗心”",
    },
    exam: {
      quantity: mock ? "130分钟完整模拟1套" : "完成当日考试或检查清单",
      output: "各模块耗时、结果和不确定题清单",
      criterion: mock ? "不暂停、不查资料、按固定顺序完成并安排次日复盘" : "清单逐项核对完成",
    },
    notice: {
      quantity: "核对报名系统中的资格、照片、科目和缴费状态",
      output: "记录核对日期和待办事项，不记录敏感账号信息",
      criterion: "四项状态均确认，并知道下一关键日期",
    },
    plan: {
      quantity: `确认${phase || "当前阶段"}的目标和每日时长`,
      output: "目标分、每日模式和两个薄弱模块",
      criterion: "目标具体，可在本周测验中验证",
    },
    data: {
      quantity: "导出1份JSON备份",
      output: "可识别的本地备份文件",
      criterion: "确认文件已下载且能找到",
    },
  };
  return { ...requirements[task.module], lessonId: lessonIdForModule(task.module) };
}

export const MODULE_ANALYSIS = Object.freeze({
  vocabulary: { title: "词汇", threshold: 70, action: "连续3天完成到期词，并把错词放入拼写和语境训练。" },
  sentences: { title: "核心句", threshold: 70, action: "每天完成3句汉译英，并将1个句型改写到新的写作或口语主题。" },
  eartraining: { title: "磨耳朵", threshold: 60, action: "选一段连续语流完成盲听、3个语块听写、影子跟读和复述。" },
  listening: { title: "听力答题", threshold: 60, action: "重做一组选择题，预读选项，并为每题标出证据句与干扰项。" },
  reading: { title: "阅读", threshold: 60, action: "重做一组题，每题必须标证据句并解释一个干扰项。" },
  writing: { title: "写作", threshold: 65, action: "用30分钟完成一篇不少于150词的作文，再按五项清单改写。" },
  translation: { title: "翻译", threshold: 65, action: "完成一段翻译，逐项核对信息覆盖并改写三处中式表达。" },
  speaking: { title: "口语", threshold: 65, action: "录制两次90秒陈述，对比停顿、结构和发音后保留较好版本。" },
});
