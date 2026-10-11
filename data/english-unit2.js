/*
 * Unit 2 All about us：根据用户提供的学习目标、学习重点照片整理。
 * 家庭、身体、Who、have got、th/t、五感和友爱阅读分别学习。
 * 学习卡、人物设定、短文和题目由本项目原创，不复制教材故事或音视频。
 * 原有题号保持不变；0–2 综合复习使用独立编号和统计分项。
 */
(function (root) {
  'use strict';

  const topics = [
    { id: 'unit2-family', subject: 'english', name: 'Unit 2 · 我的家人', icon: '🏡', description: '认识 family 和 6 种家人称呼。', goal: '能谈论家庭，用英文介绍例子中的家人。', focus: 'family, father/dad, mother/mum, grandfather/grandpa, grandmother/grandma, brother, sister' },
    { id: 'unit2-body', subject: 'english', name: 'Unit 2 · 认识身体', icon: '🖐️', description: '看部位图，认识 13 个身体词条。', goal: '能理解并说出常见身体部位的英文，分清 foot 和 feet。', focus: 'arm, body, ear, eye, face, foot/feet, hair, hand, head, leg, mouth, nose, tail' },
    { id: 'unit2-who', subject: 'english', name: 'Unit 2 · 他是谁，她是谁', icon: '💬', description: '用 Who 问人物，用 He’s、She’s 回答。', goal: '能询问人物身份，按明确的人物设定介绍姓名和家人关系。', focus: "Who is he? He's my brother. / Who is she? She's my sister." },
    { id: 'unit2-havegot', subject: 'english', name: 'Unit 2 · 我有这些特征', icon: '👀', description: '说头发和眼睛，练习 have got 问答。', goal: '能用 have/haven’t got 表达有或没有，理解 Have you got …? 并作简短回答。', focus: "I've got brown hair. / They've got blue eyes. / Have you got red hair? Yes, I have. / No, I haven't." },
    { id: 'unit2-phonics', subject: 'english', name: 'Unit 2 · th 和 t', icon: '🔤', description: '听完整示例词，认识词中的 th 和 t。', goal: '能把示例词中的浊 th 音 /ð/、t 音 /t/ 与拼写联系起来。', focus: 'th: mother, father, brother, grandfather, grandmother / t: cat, sister' },
    { id: 'unit2-senses', subject: 'english', name: 'Unit 2 · 运用感官', icon: '🌼', description: '认识看、听、闻、尝、摸，尊重不同能力。', goal: '能理解 see、hear、smell、taste、touch 和常见部位配对，了解人们体验世界的方式可以不同。', focus: 'see — eyes; hear — ears; smell — nose; taste — tongue; touch — hands' },
    { id: 'unit2-reading', subject: 'english', name: 'Unit 2 · 家庭友爱小阅读', icon: '📖', description: '读 4 篇原创小短文，找出人物和信息。', goal: '能从简单阅读中获取正确信息，理解关心家人、友善待人的行为。', focus: '找姓名、家人关系、头发和眼睛特征；理解分享、帮助和尊重。' }
  ];

  const reviewTopic = {
    id: 'review02-mixed', subject: 'english', name: '0–2 · 综合复习', icon: '🌟',
    description: '把 Hello、Unit 1、Unit 2 的重点连起来练。',
    goal: '能在原创小情境中综合运用问候、姓名年龄、数字颜色、物品方位和人物特征。',
    focus: '姓名和年龄；数字和颜色；Where、this/these；Who、have got。'
  };

  const familyWords = [
    { key: 'family', english: 'family', speech: 'family', chinese: '家庭；家人', example: 'This is my family.', translation: '这是我的家人。', hint: '想想所有家人放在一起的称呼。' },
    { key: 'father', english: 'father / dad', speech: 'father, dad', chinese: '爸爸', example: 'This is my dad.', translation: '这是我的爸爸。', hint: '想想“父亲”的英文称呼。' },
    { key: 'mother', english: 'mother / mum', speech: 'mother, mum', chinese: '妈妈', example: 'This is my mum.', translation: '这是我的妈妈。', hint: '想想“母亲”的英文称呼。' },
    { key: 'grandfather', english: 'grandfather / grandpa', speech: 'grandfather, grandpa', chinese: '爷爷或外公', example: 'This is my grandpa.', translation: '这是我的爷爷或外公。', hint: '爸爸或妈妈的爸爸，都可以用这个英文称呼。' },
    { key: 'grandmother', english: 'grandmother / grandma', speech: 'grandmother, grandma', chinese: '奶奶或外婆', example: 'This is my grandma.', translation: '这是我的奶奶或外婆。', hint: '爸爸或妈妈的妈妈，都可以用这个英文称呼。' },
    { key: 'brother', english: 'brother', speech: 'brother', chinese: '哥哥或弟弟', example: 'This is my brother.', translation: '这是我的哥哥或弟弟。', hint: '这个英文称呼不区分哥哥和弟弟。' },
    { key: 'sister', english: 'sister', speech: 'sister', chinese: '姐姐或妹妹', example: 'This is my sister.', translation: '这是我的姐姐或妹妹。', hint: '这个英文称呼不区分姐姐和妹妹。' }
  ];

  const bodyWords = [
    { key: 'arm', english: 'arm', chinese: '手臂', hint: '从肩膀到手之间的部位。' },
    { key: 'body', english: 'body', chinese: '躯干', hint: '这里标出的是胸口和腹部所在的躯干。' },
    { key: 'ear', english: 'ear', chinese: '耳朵', hint: '想想头部两侧，通常用来听声音的部位。' },
    { key: 'eye', english: 'eye', chinese: '眼睛', hint: '想想脸上，通常用来看东西的部位。' },
    { key: 'face', english: 'face', chinese: '脸；面部', hint: '眼睛、鼻子和嘴都在这个区域里。' },
    { key: 'foot', english: 'foot', chinese: '一只脚', hint: '想想腿下面，鞋子通常套住的部位；图上只有一只。' },
    { key: 'hair', english: 'hair', chinese: '头发', hint: '想想头顶长出的东西。' },
    { key: 'hand', english: 'hand', chinese: '手', hint: '手臂的末端，有手指。' },
    { key: 'head', english: 'head', chinese: '头', hint: '整个头部都在标出的区域里。' },
    { key: 'leg', english: 'leg', chinese: '腿', hint: '连接躯干和脚的部位。' },
    { key: 'mouth', english: 'mouth', chinese: '嘴', hint: '想想脸上说话和吃东西常用的部位。' },
    { key: 'nose', english: 'nose', chinese: '鼻子', hint: '想想脸中间，通常用来闻气味的部位。' },
    { key: 'tail', english: 'tail', chinese: '尾巴', hint: '这张图画的是小猫，留意身体后面的长长部位。' }
  ];

  const people = [
    { key: 'mum', name: 'Nina', pronoun: 'she', role: 'mum', chinese: '妈妈', hair: 'black', eyes: 'brown' },
    { key: 'dad', name: 'Sam', pronoun: 'he', role: 'dad', chinese: '爸爸', hair: 'brown', eyes: 'blue' },
    { key: 'grandma', name: 'Rosa', pronoun: 'she', role: 'grandma', chinese: '奶奶', hair: 'brown', eyes: 'green' },
    { key: 'grandpa', name: 'Ben', pronoun: 'he', role: 'grandpa', chinese: '爷爷', hair: 'black', eyes: 'brown' },
    { key: 'brother', name: 'Leo', pronoun: 'he', role: 'brother', chinese: '弟弟', hair: 'brown', eyes: 'green' },
    { key: 'sister', name: 'Mia', pronoun: 'she', role: 'sister', chinese: '姐姐', hair: 'black', eyes: 'blue' }
  ];

  const featurePeople = [
    { key: 'mia', name: 'Mia', pronoun: 'she', hair: 'black', eyes: 'blue' },
    { key: 'leo', name: 'Leo', pronoun: 'he', hair: 'brown', eyes: 'green' },
    { key: 'ava', name: 'Ava', pronoun: 'she', hair: 'brown', eyes: 'blue' },
    { key: 'ben', name: 'Ben', pronoun: 'he', hair: 'black', eyes: 'brown' }
  ];

  const colourChinese = { black: '黑色', brown: '棕色', blond: '金色', blue: '蓝色', green: '绿色', red: '红色' };
  const relationChinese = { mum: '妈妈', dad: '爸爸', grandma: '奶奶或外婆', grandpa: '爷爷或外公', brother: '哥哥或弟弟', sister: '姐姐或妹妹' };
  const phonicsWords = [
    { word: 'mother', group: 'th', chinese: '妈妈' },
    { word: 'father', group: 'th', chinese: '爸爸' },
    { word: 'brother', group: 'th', chinese: '哥哥或弟弟' },
    { word: 'grandfather', group: 'th', chinese: '爷爷或外公' },
    { word: 'grandmother', group: 'th', chinese: '奶奶或外婆' },
    { word: 'cat', group: 't', chinese: '猫' },
    { word: 'sister', group: 't', chinese: '姐姐或妹妹' }
  ];

  const senses = [
    { key: 'see', chinese: '看', part: 'eyes', partChinese: '眼睛', icon: '👀', model: 'We use our eyes to see.', translation: '我们通常用眼睛看。', hint: '想想“看见”对应的英文动作词。' },
    { key: 'hear', chinese: '听', part: 'ears', partChinese: '耳朵', icon: '👂', model: 'We use our ears to hear.', translation: '我们通常用耳朵听。', hint: '想想“听见”对应的英文动作词。' },
    { key: 'smell', chinese: '闻', part: 'nose', partChinese: '鼻子', icon: '👃', model: 'We use our nose to smell.', translation: '我们通常用鼻子闻气味。', hint: '想想“闻到气味”对应的动作词。' },
    { key: 'taste', chinese: '尝', part: 'tongue', partChinese: '舌头', icon: '👅', model: 'We use our tongue to taste.', translation: '我们通常用舌头尝味道。', hint: '想想“尝到味道”对应的动作词。' },
    { key: 'touch', chinese: '摸；触摸', part: 'hands', partChinese: '手', icon: '🖐️', model: 'We use our hands to touch.', translation: '我们常用手触摸。', hint: '想想用手轻轻感觉物品表面的动作。' }
  ];

  const readings = [
    {
      key: 'family-book', title: '家人一起看书',
      passage: ['This is my family.', 'My mum is Nina.', 'My brother is Leo.', 'We share a book.'],
      translation: ['这是我的家人。', '我的妈妈叫妮娜。', '我的哥哥或弟弟叫里奥。', '我们一起分享一本书。'],
      glossary: [{ english: 'my', chinese: '我的' }, { english: 'share', chinese: '分享' }, { english: 'we', chinese: '我们' }],
      queries: [
        { key: 'mum-name', prompt: '读小短文：妈妈叫什么名字？', answer: 'Nina', choices: ['Nina', 'Leo', 'Mia'], hint: '找到 My mum 开头的句子。', explanation: 'My mum is Nina. 说明妈妈叫 Nina。', speech: 'My mum is Nina.' },
        { key: 'leo-role', prompt: '读小短文：Leo 是作者的哪位家人？', answer: '哥哥或弟弟', choices: ['哥哥或弟弟', '爸爸', '爷爷或外公'], hint: '找到 Leo 所在的句子，留意名字前面的关系词。', explanation: 'My brother is Leo. 说明 Leo 是哥哥或弟弟。', speech: 'My brother is Leo.' },
        { key: 'share-book', prompt: '读小短文：家人一起分享什么？', answer: '一本书', choices: ['一本书', '一支蜡笔', '一把尺子'], hint: '看看最后一句 share 后面的物品。', explanation: 'We share a book. 说明家人一起分享一本书。', speech: 'We share a book.' }
      ]
    },
    {
      key: 'mia-features', title: '米娅介绍自己',
      passage: ["I'm Mia.", "I've got black hair and blue eyes.", 'My brother is Leo.', 'We share our crayons.'],
      translation: ['我叫米娅。', '我有黑色的头发和蓝色的眼睛。', '我的哥哥或弟弟叫里奥。', '我们分享我们的蜡笔。'],
      glossary: [{ english: 'and', chinese: '和' }, { english: 'our', chinese: '我们的' }, { english: 'crayons', chinese: '蜡笔（复数）' }],
      queries: [
        { key: 'hair', prompt: '读小短文：米娅的头发是什么颜色？', answer: '黑色', choices: ['黑色', '棕色', '金色'], hint: '找 hair 前面的颜色词。', explanation: 'black hair 是黑色的头发。', speech: "I've got black hair." },
        { key: 'eyes', prompt: '读小短文：米娅的眼睛是什么颜色？', answer: '蓝色', choices: ['蓝色', '棕色', '绿色'], hint: '找 eyes 前面的颜色词。', explanation: 'blue eyes 是蓝色的眼睛。', speech: "I've got blue eyes." },
        { key: 'share', prompt: '读小短文：米娅和里奥分享什么？', answer: '蜡笔', choices: ['蜡笔', '铅笔', '橡皮'], hint: '看看最后一句的物品词。', explanation: 'We share our crayons. 说明他们分享蜡笔。', speech: 'We share our crayons.' }
      ]
    },
    {
      key: 'help-grandpa', title: '帮爷爷找眼镜',
      passage: ['This is my grandpa.', 'His name is Ben.', 'We read a book together.', 'I help him find his glasses.'],
      translation: ['这是我的爷爷。', '他叫本。', '我们一起读一本书。', '我帮他找他的眼镜。'],
      glossary: [{ english: 'his', chinese: '他的' }, { english: 'together', chinese: '一起' }, { english: 'find', chinese: '找到' }, { english: 'glasses', chinese: '眼镜' }],
      queries: [
        { key: 'name', prompt: '读小短文：爷爷叫什么名字？', answer: 'Ben', choices: ['Ben', 'Leo', 'Sam'], hint: '找到 His name 开头的句子。', explanation: 'His name is Ben. 说明爷爷叫 Ben。', speech: 'His name is Ben.' },
        { key: 'together', prompt: '读小短文：作者和爷爷一起做了什么？', answer: '读书', choices: ['读书', '画海报', '听音乐'], hint: '找含有 together 的句子。', explanation: 'We read a book together. 说明他们一起读书。', speech: 'We read a book together.' },
        { key: 'help', prompt: '读小短文：作者帮助爷爷找什么？', answer: '眼镜', choices: ['眼镜', '书包', '墨水笔'], hint: '找最后一句 find 后面的物品；小词条能帮你。', explanation: 'I help him find his glasses. 说明作者帮爷爷找眼镜。', speech: 'I help him find his glasses.' }
      ]
    },
    {
      key: 'picture-friends', title: '一起看图画',
      passage: ['Ana and Noah are friends.', 'Ana cannot hear.', 'Noah shows Ana a picture.', 'They look at the picture together.'],
      translation: ['安娜和诺亚是朋友。', '安娜听不见声音。', '诺亚给安娜看一张图画。', '他们一起看这张图画。'],
      glossary: [{ english: 'friends', chinese: '朋友们' }, { english: 'cannot hear', chinese: '听不见声音' }, { english: 'shows', chinese: '给……看' }, { english: 'look at', chinese: '看' }],
      queries: [
        { key: 'relationship', prompt: '读小短文：安娜和诺亚是什么关系？', answer: '朋友', choices: ['朋友', '兄妹', '父女'], hint: '第一句会告诉你他们的关系。', explanation: 'Ana and Noah are friends. 说明他们是朋友。', speech: 'Ana and Noah are friends.' },
        { key: 'hear', prompt: '读小短文：谁听不见声音？', answer: 'Ana', choices: ['Ana', 'Noah', 'Leo'], hint: '找 cannot hear 前面的名字。', explanation: 'Ana cannot hear. 说明安娜听不见声音。人们感受世界的方式可以不同。', speech: 'Ana cannot hear.' },
        { key: 'help', prompt: '读小短文：诺亚怎样和安娜一起体验？', answer: '一起看图画', choices: ['一起看图画', '要求她必须听见', '不和她一起玩'], hint: '看第三句和第四句，他们怎样一起参与？', explanation: 'Noah shows Ana a picture. They look at the picture together. 说明朋友一起看图画，尊重不同能力。', speech: 'They look at the picture together.' }
      ]
    }
  ];

  function card(id, title, lines, sayPrompt, sayModel, extra) {
    return { id, title, lines, sayPrompt, sayModel, ...(extra || {}) };
  }
  function question(id, topic, prompt, answer, choices, hint, explanation, extra) {
    return { id, topic, prompt, answer, choices, hint, explanation, ...(extra || {}) };
  }
  function alternatives(items, index, field) {
    return [items[index][field], items[(index + 2) % items.length][field], items[(index + 4) % items.length][field]];
  }
  function personVisual(person) {
    return { type: 'person', name: person.name, pronoun: person.pronoun, hair: person.hair, eyes: person.eyes, label: `原创人物 ${person.name}；设定用 ${person.pronoun} 指代。` };
  }
  function listening(id, topic, prompt, answer, choices, hint, explanation, speech, extra) {
    return question(id, topic, prompt, answer, choices, hint, explanation,
      { kind: 'listening', speech, fallbackPrompt: `文字提示：${speech}`, answerSpeech: speech, ...(extra || {}) });
  }

  const lessons = {
    'unit2-family': familyWords.map(entry => card(
      `unit2-lesson-family-${entry.key}`, `认识${entry.chinese}`,
      [{ english: entry.english, chinese: entry.chinese }, { english: entry.example, chinese: entry.translation }],
      '选例子中的一位家人，用 This is my … 介绍；也可以只读词语。', entry.example,
      { note: '家庭成员可以不同，选择示例角色练习即可；不要求填写真实家庭资料。' }
    )),
    'unit2-body': bodyWords.map(entry => card(
      `unit2-lesson-body-${entry.key}`, `认识${entry.chinese}`,
      [{ english: entry.english, chinese: entry.chinese }, ...(entry.key === 'foot' ? [{ english: 'feet', chinese: '脚（复数）：一只脚用 foot，多只脚用 feet。' }] : [])],
      '看看图中标出的部位，试着说出这个词；无需做身体动作。', entry.key === 'foot' ? 'foot, feet' : entry.english,
      { visual: { type: 'body', part: entry.key }, ...(entry.key === 'hair' ? { note: '说一头头发时，hair 通常不可数，不在后面加 s。' } : {}) }
    )),
    'unit2-who': [
      card('unit2-lesson-who-he', '问“他是谁”', [{ english: 'Who is he?', chinese: '他是谁？' }, { english: "He's Leo. He's my brother.", chinese: '他叫里奥。他是我的弟弟。' }], '扮演介绍 Leo 的小朋友，和家人轮流问答。', "Who is he? He's Leo. He's my brother.", { visual: personVisual(people[4]), note: '例子明确设定 Leo 用 he 指代、是弟弟；不从外貌猜人物关系。' }),
      card('unit2-lesson-who-she', '问“她是谁”', [{ english: 'Who is she?', chinese: '她是谁？' }, { english: "She's Mia. She's my sister.", chinese: '她叫米娅。她是我的姐姐。' }], '扮演介绍 Mia 的小朋友，先问“是谁”，再说名字和关系。', "Who is she? She's Mia. She's my sister.", { visual: personVisual(people[5]), note: '例子明确设定 Mia 用 she 指代、是姐姐；不从外貌猜人物关系。' }),
      card('unit2-lesson-who-boy-girl', '认识 boy 和 girl', [{ english: "He's a boy.", chinese: '他是一个男孩。' }, { english: "She's a girl.", chinese: '她是一个女孩。' }], '按示例里已说明的人物设定，用 He’s 或 She’s 回答。', "He's a boy. She's a girl.", { note: 'boy 表示男孩，girl 表示女孩。人物设定由文字明确说明，不根据衣服、头发或颜色推测。' }),
      card('unit2-lesson-who-short', '认识缩写', [{ english: 'Who’s = Who is', chinese: 'Who’s 和 Who is 表达相同意思。' }, { english: 'He’s = He is; She’s = She is', chinese: 'He’s 是 He is 的缩写；She’s 是 She is 的缩写。' }], '先用完整问答读一遍，再用缩写读一遍。', "Who is she? She's my mum.")
    ],
    'unit2-havegot': [
      card('unit2-lesson-havegot-hair', '说头发颜色', [{ english: "I've got brown hair.", chinese: '我有棕色的头发。' }, { english: 'black hair; brown hair; blond hair', chinese: '黑发；棕发；金发。blond 是补充描述词。' }], '扮演图中的 Leo，说说例子中的头发颜色。', "I've got brown hair.", { visual: personVisual(featurePeople[1]), note: 'I’ve got = I have got；说一头头发时用 hair，不用 a hair 或 hairs。' }),
      card('unit2-lesson-havegot-eyes', '说眼睛颜色', [{ english: "I've got blue eyes.", chinese: '我有蓝色的眼睛。' }, { english: 'blue eyes; brown eyes; green eyes', chinese: '蓝色眼睛；棕色眼睛；绿色眼睛。' }], '扮演图中的 Mia，说说眼睛颜色；不用填写自己的特征。', "I've got blue eyes.", { visual: personVisual(featurePeople[0]), note: '一只眼睛用 eye，两只眼睛用 eyes。' }),
      card('unit2-lesson-havegot-they', '说“他们有”', [{ english: "They've got green eyes.", chinese: '他们有绿色的眼睛。' }], '想象两位示例角色都有绿色眼睛，用 They’ve got 描述。', "They've got green eyes.", { note: 'They’ve got = They have got，表示“他们有”。这里是原创示例，不代表教材人物设定。' }),
      card('unit2-lesson-havegot-no', '说“没有”', [{ english: "I haven't got black hair.", chinese: '我没有黑色的头发。' }, { english: "They haven't got blue eyes.", chinese: '他们没有蓝色的眼睛。' }], '读示例，分清“有”和“没有”。', "I haven't got black hair. They haven't got blue eyes.", { note: 'haven’t = have not，表达“没有”；不同外貌都值得尊重，不比较好坏。' }),
      card('unit2-lesson-havegot-ask', '问“你有吗”', [{ english: 'Have you got red hair?', chinese: '你有红色的头发吗？' }], '对示例人物提出问题，再听下一张卡的回答。', 'Have you got red hair?'),
      card('unit2-lesson-havegot-yes', '回答“有”', [{ english: 'Have you got blue eyes? Yes, I have.', chinese: '你有蓝色的眼睛吗？是的，我有。' }], '扮演示例人物 Mia，先问再肯定回答。', 'Have you got blue eyes? Yes, I have.', { visual: personVisual(featurePeople[0]) }),
      card('unit2-lesson-havegot-not', '回答“没有”', [{ english: "Have you got black hair? No, I haven't.", chinese: '你有黑色的头发吗？不，我没有。' }], '扮演棕色头发的 Leo，用否定回答。', "Have you got black hair? No, I haven't.", { visual: personVisual(featurePeople[1]) })
    ],
    'unit2-phonics': [
      card('unit2-lesson-phonics-th', '词中的 th', [{ english: 'mother, father, brother', chinese: '妈妈、爸爸、哥哥或弟弟' }], '先听完整词，再跟着读，留意词中 th 的声音。', 'mother, father, brother', { soundLetter: 'th', exampleWords: ['mother', 'father', 'brother'], note: '这组 th 是浊音 /ð/：舌尖轻放在上下齿之间，轻轻出气并发声。这里播放完整示例词，单独的字母名不是音素示范。' }),
      card('unit2-lesson-phonics-grand', '长词里的 th', [{ english: 'grandfather, grandmother', chinese: '爷爷或外公、奶奶或外婆' }], '慢慢听完整词，找一找词中相同的 th。', 'grandfather, grandmother', { soundLetter: 'th', exampleWords: ['grandfather', 'grandmother'], note: '这两个词中的 th 也发 /ð/。不把所有 th 都说成同一个音，本组只练这些示例词。' }),
      card('unit2-lesson-phonics-t', '词里的 t', [{ english: 'cat, sister', chinese: '猫、姐姐或妹妹' }], '先听完整词，再读一遍；t 在 cat 的词尾、sister 的词中。', 'cat, sister', { soundLetter: 't', exampleWords: ['cat', 'sister'], note: 't 音 /t/：舌尖先碰上齿后方，再轻轻放开。这里不是把字母名 T 当作 /t/，也不把这些例词叫作“t 首音词”。' }),
      card('unit2-lesson-phonics-spell', '把声音和拼写连起来', [{ english: 'mo[th]er; ca[t]; sis[t]er', chinese: 'mother 中间有 th；cat 末尾有 t；sister 中间有 t。' }], '听整个词后，在纸上圈出 th 或 t；也可以只在屏幕上找。', 'mother, cat, sister', { note: '开口练说由孩子或家人自己完成，不做自动发音评分。' })
    ],
    'unit2-senses': [
      ...senses.map(entry => card(`unit2-lesson-senses-${entry.key}`, `认识“${entry.chinese}”`, [{ english: entry.key, chinese: entry.chinese }, { english: entry.model, chinese: entry.translation }], '看图，说出动作词；也可以只听、只读或指图，不需要真实体验。', entry.model, { visual: { type: 'sense', sense: entry.key, icon: entry.icon, label: `常见感官配对：${entry.partChinese}与${entry.chinese}` }, note: entry.key === 'taste' ? 'tongue（舌头）是本课配对用的小词。不尝陌生物品；如家人愿意安排，只选熟悉、安全的食物，也可以仅看图。' : entry.key === 'touch' ? '只看图也能练习；不触摸热、尖锐或不熟悉的物品。感知触摸也不只靠双手。' : '这是常见感官配对，不表示每个人都能以相同方式看、听或感受。' })),
      card('unit2-lesson-senses-respect', '每个人的体验可以不同', [{ english: "Let's look at the picture together.", chinese: '我们一起看这张图画吧。' }], '想想怎样邀请朋友一起参与，也听听朋友希望怎样做。', "Let's look at the picture together.", { note: '有的人看不见或听不见，也会用其他方式了解世界。先询问对方需要什么帮助，尊重每个人的方式。' }),
      card('unit2-lesson-senses-safe', '用图示也能学习', [{ english: 'see, hear, smell, taste, touch', chinese: '看、听、闻、尝、摸' }], '指着图说动作词；如果不想体验，用看图、听词代替即可。', 'see, hear, smell, taste, touch', { note: '不要求尝陌生物品、摸危险物品或强迫体验；跟家人一起选择适合自己的学习方式。' })
    ],
    'unit2-reading': readings.map(story => card(`unit2-lesson-reading-${story.key}`, `原创小阅读：${story.title}`, story.passage.map((english, index) => ({ english, chinese: story.translation[index] })), '先找姓名和关键词，再说一条读到的信息。', story.passage.join(' '), { note: '这是学习小乐园原创短文，用来练习本单元语言和友爱主题。' }))
  };

  function familyBank() {
    const topic = 'unit2-family';
    return familyWords.flatMap((entry, index) => [
      question(`unit2-family-word-${entry.key}`, topic, `“${entry.chinese}”对应哪个英文称呼？`, entry.english, alternatives(familyWords, index, 'english'), entry.hint, `${entry.english} 表示${entry.chinese}。`, { answerSpeech: entry.speech }),
      listening(`unit2-family-listen-${entry.key}`, topic, '听一个家庭词，选出它的意思。', entry.chinese, alternatives(familyWords, index, 'chinese'), '想想刚刚听到的是整个家庭，还是一位家人。', `${entry.speech} 表示${entry.chinese}。`, entry.speech),
      question(`unit2-family-sentence-${entry.key}`, topic, `这句介绍了谁：${entry.example}`, entry.chinese, alternatives(familyWords, index, 'chinese'), '找 my 后面的家庭词，回想这个称呼。', `${entry.example} 的意思是“${entry.translation}”。`, { answerSpeech: entry.example })
    ]);
  }

  function bodyBank() {
    const topic = 'unit2-body';
    const result = bodyWords.flatMap((entry, index) => [
      question(`unit2-body-picture-${entry.key}`, topic, '看部位图，选出红圈标出部位的英文。', entry.english, alternatives(bodyWords, index, 'english'), entry.hint, `${entry.english} 表示${entry.chinese}。`, { visual: { type: 'body', part: entry.key }, answerSpeech: entry.english }),
      listening(`unit2-body-listen-${entry.key}`, topic, '听一个身体词，选出它的意思。', entry.chinese, alternatives(bodyWords, index, 'chinese'), '想想刚才听到的词对应身体哪一部分。', `${entry.english} 表示${entry.chinese}。`, entry.english)
    ]);
    [1, 2].forEach(count => {
      const answer = count === 1 ? 'foot' : 'feet';
      result.push(question(`unit2-body-foot-count-${count}`, topic, `图上标出了${count === 1 ? '一只脚' : '两只脚'}，用哪个词？`, answer, [answer, count === 1 ? 'feet' : 'foot', 'hand'], 'foot 和 feet 是同一个身体部位的单数、复数。', count === 1 ? '一只脚用 foot。' : '多只脚用 feet，不是 foots。', { visual: { type: 'body', part: count === 1 ? 'foot' : 'feet' }, answerSpeech: answer }));
    });
    return result;
  }

  function whoBank() {
    const topic = 'unit2-who';
    const result = [];
    people.forEach(person => {
      const he = person.pronoun === 'he', pronoun = he ? 'He' : 'She', other = he ? 'She' : 'He';
      const ask = `Who is ${person.pronoun}?`, answer = `${pronoun}'s my ${person.role}.`;
      const setting = `原创设定：${person.name} 是我的${person.chinese}，用 ${person.pronoun} 指代。`;
      result.push(question(`unit2-who-answer-${person.key}`, topic, `${setting}\n回答：${ask}`, answer, [answer, `${other}'s my ${person.role}.`, `It's a ${person.role}.`], '先看题干中已说明的 he 或 she，再看家人关系。', `${ask} 问人物是谁；这里用 ${answer} 回答已说明的关系。`, { visual: personVisual(person), answerSpeech: `${ask} ${answer}` }));
      result.push(question(`unit2-who-ask-${person.key}`, topic, `${setting}\n想问这位家人是谁，选哪句？`, ask, [ask, `Who is ${he ? 'she' : 'he'}?`, "What's this?"], '问人物是谁用 Who；按题干中明确的代词提问。', `这里明确用 ${person.pronoun}，所以问 ${ask}；What's this? 询问东西是什么。`, { visual: personVisual(person), answerSpeech: ask }));
      const meaning = relationChinese[person.role];
      result.push(listening(`unit2-who-listen-${person.key}`, topic, '听一句人物介绍，选出家人关系。', meaning, [meaning, relationChinese[people[(people.indexOf(person) + 2) % people.length].role], relationChinese[people[(people.indexOf(person) + 4) % people.length].role]], '留意 my 后面表示家人关系的词。', `${answer} 介绍的是${meaning}。${meaning.includes('或') ? '这个英文称呼不区分这里列出的两种中文关系。' : ''}`, answer));
    });
    [
      { key: 'boy', name: 'Adam', pronoun: 'he', chinese: '男孩', answer: "He's a boy.", other: "She's a girl." },
      { key: 'girl', name: 'Hana', pronoun: 'she', chinese: '女孩', answer: "She's a girl.", other: "He's a boy." }
    ].forEach(person => result.push(question(`unit2-who-person-${person.key}`, topic, `题干设定：${person.name} 是一个${person.chinese}，用 ${person.pronoun} 指代。哪句符合设定？`, person.answer, [person.answer, person.other, "It's a chair."], '按文字里给出的人物设定选择，不根据外观猜。', `${person.answer} 表示“${person.pronoun === 'he' ? '他' : '她'}是一个${person.chinese}”。`, { answerSpeech: person.answer })));
    return result;
  }

  function haveGotBank() {
    const topic = 'unit2-havegot';
    const result = [];
    featurePeople.forEach(person => {
      const hairText = `I've got ${person.hair} hair.`, eyesText = `I've got ${person.eyes} eyes.`;
      result.push(question(`unit2-havegot-picture-hair-${person.key}`, topic, `扮演图中的 ${person.name}，介绍头发颜色，选哪句？`, hairText, [hairText, `I've got ${person.hair === 'black' ? 'brown' : 'black'} hair.`, "I've got blond hair."], '只看头发的颜色，不看眼睛；把自己当成这个示例角色。', `${person.name} 的图中设定是${colourChinese[person.hair]}头发，用 ${hairText} 介绍。hair 在这里不加 s。`, { visual: personVisual(person), answerSpeech: hairText }));
      result.push(question(`unit2-havegot-picture-eyes-${person.key}`, topic, `扮演图中的 ${person.name}，介绍眼睛颜色，选哪句？`, eyesText, ['blue', 'brown', 'green'].map(colour => `I've got ${colour} eyes.`), '看眼睛的颜色；这里不是描述头发。', `${person.name} 的图中设定是${colourChinese[person.eyes]}眼睛，用 ${eyesText} 介绍。两只眼睛用 eyes。`, { visual: personVisual(person), answerSpeech: eyesText }));
      result.push(listening(`unit2-havegot-listen-hair-${person.key}`, topic, '听一句话，选出说话人的头发颜色。', colourChinese[person.hair], ['黑色', '棕色', '红色'], '留意 hair 前面的颜色词。', `${hairText} 说明说话人有${colourChinese[person.hair]}头发。`, hairText));
    });
    const rows = [
      ['complete-i', '补一句“我有棕色头发”：I ___ got brown hair.', 'have', ['have', 'has', 'am'], 'I 和 have 搭配，have got 表示有。', 'I have got brown hair. 可以缩写成 I’ve got brown hair.', "I've got brown hair."],
      ['complete-they', '补一句“他们有蓝色眼睛”：They ___ got blue eyes.', 'have', ['have', 'has', 'is'], 'They 表示他们，和 have 搭配。', 'They have got blue eyes. 可以缩写成 They’ve got blue eyes.', "They've got blue eyes."],
      ['negative-i', '想说“我没有黑色头发”，选哪句？', "I haven't got black hair.", ["I haven't got black hair.", "I've got black hair.", "I've got blue eyes."], '没有，要找 haven’t got。', 'I haven’t got black hair. 表示我没有黑色头发。', "I haven't got black hair."],
      ['negative-they', '想说“他们没有绿色眼睛”，选哪句？', "They haven't got green eyes.", ["They haven't got green eyes.", "They've got green eyes.", "I've got green eyes."], '这次说的是他们，并且是没有。', 'They haven’t got green eyes. 表示他们没有绿色眼睛。', "They haven't got green eyes."],
      ['ask', '想问“你有红色头发吗”，选哪句？', 'Have you got red hair?', ['Have you got red hair?', 'How old are you?', 'Who is he?'], '问有没有，要用 Have you got …?。', 'Have you got red hair? 询问你有没有红色头发。', 'Have you got red hair?'],
      ['yes', '示例角色有蓝色眼睛。别人问 Have you got blue eyes?，角色怎样简短回答？', 'Yes, I have.', ['Yes, I have.', "No, I haven't.", 'Yes, I am.'], '题干说有，回答 Have you got 时用 have。', '有，就回答 Yes, I have.；这里回答的是 Have you got …?。', 'Have you got blue eyes? Yes, I have.'],
      ['no', '示例角色没有红色头发。别人问 Have you got red hair?，角色怎样简短回答？', "No, I haven't.", ["No, I haven't.", 'Yes, I have.', "No, I'm not."], '题干说没有，回答要用 haven’t。', '没有，就回答 No, I haven’t.。', "Have you got red hair? No, I haven't."],
      ['hair-form', '描述一头黑色头发，补一句：I’ve got black ___.', 'hair', ['hair', 'a hair', 'hairs'], '表示一头头发时，通常用不可数的 hair。', '描述一头头发用 black hair，不用 a hair 或 hairs。', "I've got black hair."],
      ['eyes-form', '描述两只绿色眼睛，补一句：I’ve got green ___.', 'eyes', ['eyes', 'eye', 'an eye'], '两只眼睛要用复数。', 'eyes 是 eye 的复数；green eyes 表示绿色的眼睛。', "I've got green eyes."],
      ['short-have', 'I’ve got 的完整写法是？', 'I have got', ['I have got', 'I am got', 'I has got'], 'I’ve 里的缩写在这里表示 I have。', 'I’ve got = I have got，表示我有。', "I've got brown hair."],
      ['short-they', 'They’ve got 的完整写法是？', 'They have got', ['They have got', 'They are got', 'They has got'], 'They’ve 里的缩写在这里表示 They have。', 'They’ve got = They have got，表示他们有。', "They've got blue eyes."],
      ['short-not', 'haven’t 的完整写法是？', 'have not', ['have not', 'has not', 'am not'], '缩写中的 n’t 表示 not，再看前面的 have。', 'haven’t = have not，用 haven’t got 表达没有。', "I haven't got black hair."]
    ];
    rows.forEach(row => result.push(question(`unit2-havegot-language-${row[0]}`, topic, row[1], row[2], row[3], row[4], row[5], { answerSpeech: row[6] })));
    [
      { key: 'they-yes', speech: "They've got blue eyes.", answer: '他们有蓝色眼睛', choices: ['他们有蓝色眼睛', '他们没有蓝色眼睛', '我有棕色头发'] },
      { key: 'they-no', speech: "They haven't got green eyes.", answer: '他们没有绿色眼睛', choices: ['他们没有绿色眼睛', '他们有绿色眼睛', '我没有黑色头发'] },
      { key: 'i-no', speech: "I haven't got black hair.", answer: '我没有黑色头发', choices: ['我没有黑色头发', '我有黑色头发', '他们有蓝色眼睛'] },
      { key: 'ask', speech: 'Have you got red hair?', answer: '问有没有红色头发', choices: ['问有没有红色头发', '问名字', '问年龄'] }
    ].forEach(row => result.push(listening(`unit2-havegot-listen-language-${row.key}`, topic, '听一句话，选出它的意思。', row.answer, row.choices, '留意是 I 还是 They，再听有没有 haven’t 或提问的语气。', `${row.speech} 的意思是“${row.answer}”。`, row.speech)));
    return result;
  }

  function phonicsBank() {
    const topic = 'unit2-phonics';
    const result = [];
    phonicsWords.forEach(entry => {
      const marked = entry.word.replace(entry.group, `[${entry.group}]`), missing = entry.word.replace(entry.group, '__');
      result.push(question(`unit2-phonics-group-${entry.word}`, topic, `看单词 ${marked}，方括号中的拼写属于哪一组？`, entry.group, [entry.group, entry.group === 'th' ? 't' : 'th', 'p'], '仔细看方括号里的一个字母，还是两个字母组成的 th。', `${entry.word} 中标出的 ${entry.group} 对应这里练习的 ${entry.group === 'th' ? '浊 th 音 /ð/' : 't 音 /t/'}；听完整示例词再跟读。`, { soundLetter: entry.group, exampleWords: [entry.word], answerSpeech: entry.word }));
      result.push(question(`unit2-phonics-spell-${entry.word}`, topic, `补出“${entry.chinese}”的英文：${missing}`, entry.group, [entry.group, entry.group === 'th' ? 't' : 'th', 'p'], '回想完整词的拼写，空白可以放一个字母或字母组合。', `补上 ${entry.group}，完整词是 ${entry.word}。`, { soundLetter: entry.group, exampleWords: [entry.word], answerSpeech: entry.word }));
    });
    [
      { key: 'th-group', speech: 'mother, father, brother', answer: 'th', words: ['mother', 'father', 'brother'] },
      { key: 't-group', speech: 'cat, sister', answer: 't', words: ['cat', 'sister'] },
      { key: 'mother', speech: 'mother', answer: 'th', words: ['mother'] },
      { key: 'father', speech: 'father', answer: 'th', words: ['father'] },
      { key: 'cat', speech: 'cat', answer: 't', words: ['cat'] },
      { key: 'sister', speech: 'sister', answer: 't', words: ['sister'] }
    ].forEach(row => result.push(listening(`unit2-phonics-listen-${row.key}`, topic, '听完整示例词，选出本课对应的拼写组。', row.answer, [row.answer, row.answer === 'th' ? 't' : 'th', 'p'], '先辨认整个词，再回想学习卡里标出的 th 或 t。', `${row.words.join('、')} 属于本课的 ${row.answer} 示例组；这里不把字母名当作音素。`, row.speech, { soundLetter: row.answer, exampleWords: row.words })));
    return result;
  }

  function sensesBank() {
    const topic = 'unit2-senses';
    const result = [];
    senses.forEach((entry, index) => {
      result.push(question(`unit2-senses-action-${entry.key}`, topic, `“${entry.chinese}”对应哪个英文动作词？`, entry.key, alternatives(senses, index, 'key'), entry.hint, `${entry.key} 表示${entry.chinese}。`, { visual: { type: 'sense', sense: entry.key, icon: entry.icon, label: `图示动作：${entry.chinese}` }, answerSpeech: entry.key }));
      result.push(question(`unit2-senses-match-${entry.key}`, topic, `在常见感官配对里，${entry.key}（${entry.chinese}）通常对应哪个部位？`, entry.part, alternatives(senses, index, 'part'), `想想通常用什么部位${entry.chinese}；这些配对不代表每个人的能力都相同。`, `${entry.key}（${entry.chinese}）与 ${entry.part}（${entry.partChinese}）是常见配对。`, { answerSpeech: entry.model }));
      result.push(listening(`unit2-senses-listen-${entry.key}`, topic, '播放后，选出这个动作词的意思。', entry.chinese, alternatives(senses, index, 'chinese'), '回想五感学习卡里的动作词。', `${entry.key} 表示${entry.chinese}。`, entry.key));
      const contexts = { see: '图示：用眼睛看书上的图画。这个动作是？', hear: '图示：用耳朵听音乐。这个动作是？', smell: '图示：用鼻子闻花的气味。这个动作是？', taste: '图示：用舌头尝家人已确认安全的熟悉食物。这个动作是？', touch: '图示：用手轻轻摸常温的柔软布料。这个动作是？' };
      result.push(question(`unit2-senses-context-${entry.key}`, topic, contexts[entry.key], entry.key, alternatives(senses, index, 'key'), '这是图示情境，选出文字里明确描述的动作，不需要真的做。', `文字里描述的动作是 ${entry.key}（${entry.chinese}）。看图就能完成，不要求真实体验。`, { answerSpeech: entry.key }));
    });
    [
      ['respect', '朋友听不见声音，哪种做法体现尊重？', '询问需要什么帮助，选能一起参与的方式', ['询问需要什么帮助，选能一起参与的方式', '要求朋友必须听见', '嘲笑朋友'], '每个人体验世界的方式可以不同，先听听朋友的想法。', '尊重不同能力，询问对方需要什么帮助，并选择能一起参与的方式。', "Let's look at the picture together."],
      ['safe-taste', '学习 taste 时，哪种练习方式安全？', '看图认识词，不尝陌生物品', ['看图认识词，不尝陌生物品', '独自尝不知道是什么的东西', '尝清洁用品'], '看图也能完成学习，不需要尝未知的东西。', 'taste 表示尝；看图就能学。真实体验只由家人确认熟悉、安全的食物。', 'taste'],
      ['safe-touch', '学习 touch 时，看到又热又尖的物品，应该怎样做？', '不触摸，用安全图示练习', ['不触摸，用安全图示练习', '直接用手摸', '请朋友闭眼摸'], '不为了练习而触碰危险物品。', 'touch 表示触摸；不碰热或尖锐的物品，可以看图学习。', 'touch']
    ].forEach(row => result.push(question(`unit2-senses-care-${row[0]}`, topic, row[1], row[2], row[3], row[4], row[5], { answerSpeech: row[6] })));
    return result;
  }

  function readingBank() {
    const topic = 'unit2-reading';
    return readings.flatMap(story => story.queries.map(row => question(`unit2-reading-${story.key}-${row.key}`, topic, row.prompt, row.answer, row.choices, row.hint, row.explanation, { passage: story.passage, glossary: story.glossary, answerSpeech: row.speech })));
  }

  const numbers = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const reviewColours = [
    { key: 'red', chinese: '红色', value: '#df343f' }, { key: 'blue', chinese: '蓝色', value: '#267bd8' },
    { key: 'green', chinese: '绿色', value: '#278645' }, { key: 'yellow', chinese: '黄色', value: '#f4cd27' },
    { key: 'purple', chinese: '紫色', value: '#853eaa' }
  ];

  function reviewBank() {
    const topic = reviewTopic.id;
    const result = [
      question('review02-mixed-greeting', topic, '新朋友向你说 Hello!，你想回应问好，选哪句？', 'Hi!', ['Hi!', 'Goodbye!', 'Thank you.'], '见面时互相说“你好”。', 'Hi! 可以回应 Hello!，向朋友问好。', { answerSpeech: 'Hello! Hi!' }),
      question('review02-mixed-name', topic, '原创对话：What’s your name? — I’m Ava. 对话中的名字是？', 'Ava', ['Ava', 'seven', 'green'], '问名字，要看 I’m 后面的人名。', 'I’m Ava. 表示我叫 Ava。', { answerSpeech: "What's your name? I'm Ava." }),
      listening('review02-mixed-age', topic, '听年龄问答，选出例子中小朋友的年龄。', '7 岁', ['7 岁', '6 岁', '8 岁'], '留意 I’m 后面的数字。', 'I’m seven. 说明例子中的小朋友七岁。', "How old are you? I'm seven.")
    ];
    [1, 3, 5, 8, 10].forEach(value => result.push(question(`review02-mixed-number-${value}`, topic, '数数星星，选出数量的英文。', numbers[value - 1], [numbers[value - 1], numbers[(value + 1) % 10], numbers[(value + 4) % 10]], '一颗一颗数，每颗只数一次。', `${value} 颗星星，英语说 ${numbers[value - 1]}。`, { visual: { type: 'count', count: value, icon: '⭐' }, answerSpeech: numbers[value - 1] })));
    reviewColours.forEach((colour, index) => result.push(question(`review02-mixed-colour-${colour.key}`, topic, '看色块，选出颜色的英文。', colour.key, alternatives(reviewColours, index, 'key'), '回想 Hello 的颜色学习卡。', `${colour.key} 表示${colour.chinese}。`, { visual: { type: 'colour', value: colour.value, label: `${colour.chinese}色块` }, answerSpeech: colour.key })));
    [
      { key: 'on', chinese: '在书桌上', object: 'book', anchor: 'desk' },
      { key: 'in', chinese: '在书包里', object: 'pencil', anchor: 'bag' },
      { key: 'under', chinese: '在椅子下面', object: 'bag', anchor: 'chair' },
      { key: 'next to', chinese: '紧挨着书包', object: 'rubber', anchor: 'bag' }
    ].forEach(relation => {
      const text = `It's ${relation.key} the ${relation.anchor}.`;
      const words = ['on', 'in', 'under', 'next to'];
      const choices = [relation.key, ...words.filter(word => word !== relation.key).slice(0, 2)].map(word => `It's ${word} the ${relation.anchor}.`);
      const visual = { type: 'position', relation: relation.key, object: relation.object, anchor: relation.anchor };
      result.push(question(`review02-mixed-position-picture-${relation.key.replace(/ /g, '-')}`, topic, `看位置图，回答：Where's the ${relation.object}?`, text, choices, '看看物品是在上面、里面、下面，还是紧挨着。', `${text} 表示物品${relation.chinese}。`, { visual, answerSpeech: text }));
      result.push(listening(`review02-mixed-position-listen-${relation.key.replace(/ /g, '-')}`, topic, '听位置句，选出表示位置的词。', relation.key, [relation.key, ...words.filter(word => word !== relation.key).slice(0, 2)], '留意 is 后面和 the 前面的短词或短语。', `听到的是 ${text}，位置词是 ${relation.key}。`, text));
    });
    [
      { key: 'book', plural: 'books', chinese: '书', icon: '📕' },
      { key: 'pencil', plural: 'pencils', chinese: '铅笔', icon: '✏️' }
    ].forEach(entry => [1, 2].forEach(count => {
      const singular = count === 1, ask = singular ? "What's this?" : 'What are these?', answer = singular ? `It's a ${entry.key}.` : `They're ${entry.plural}.`;
      result.push(question(`review02-mixed-plural-${entry.key}-${count}`, topic, `看物品图，回答：${ask}`, answer, [answer, singular ? `They're ${entry.plural}.` : `It's a ${entry.key}.`, singular ? `It's ${entry.plural}.` : `They're a ${entry.key}.`], '一个用 this 和 It’s，多个用 these 和 They’re。', `${count} 件${entry.chinese}，用 ${answer} 回答。`, { visual: { type: 'objects', word: entry.key, count, icon: entry.icon, label: `${count} 件${entry.chinese}` }, answerSpeech: `${ask} ${answer}` }));
    }));
    people.forEach(person => {
      const pronoun = person.pronoun === 'he' ? 'He' : 'She', other = person.pronoun === 'he' ? 'She' : 'He', answer = `${pronoun}'s my ${person.role}.`;
      result.push(question(`review02-mixed-who-${person.key}`, topic, `例子明确说明：${person.name} 是我的${person.chinese}，用 ${person.pronoun} 指代。回答 Who is ${person.pronoun}?`, answer, [answer, `${other}'s my ${person.role}.`, "It's a book."], '按题干给出的关系和代词选择，不猜人物外观。', `${answer} 介绍例子中的家人关系。`, { visual: personVisual(person), answerSpeech: answer }));
    });
    [
      ['hair', '例子明确说：角色有棕色头发。扮演角色介绍，选哪句？', "I've got brown hair.", ["I've got brown hair.", "I haven't got brown hair.", "I've got blue eyes."], '介绍“我有”，还要选头发的句子。', 'I’ve got brown hair. 表示我有棕色头发。'],
      ['eyes', '例子明确说：两位角色都有绿色眼睛。介绍他们，选哪句？', "They've got green eyes.", ["They've got green eyes.", "They haven't got green eyes.", "I've got black hair."], '说“他们有”，还要描述绿色眼睛。', 'They’ve got green eyes. 表示他们有绿色眼睛。'],
      ['no-hair', '例子中的角色没有黑色头发。扮演角色说明，选哪句？', "I haven't got black hair.", ["I haven't got black hair.", "I've got black hair.", "They've got black hair."], '没有，用 haven’t got。', 'I haven’t got black hair. 表示我没有黑色头发。'],
      ['yes-answer', '角色有蓝色眼睛。回答 Have you got blue eyes?，选哪句？', 'Yes, I have.', ['Yes, I have.', "No, I haven't.", 'Yes, I am.'], '这次问 Have you got，肯定回答用 have。', '有蓝色眼睛，回答 Yes, I have.。'],
      ['no-answer', '角色没有红色头发。回答 Have you got red hair?，选哪句？', "No, I haven't.", ["No, I haven't.", 'Yes, I have.', "No, I'm not."], '这次问 Have you got，否定回答用 haven’t。', '没有红色头发，回答 No, I haven’t.。']
    ].forEach(row => result.push(question(`review02-mixed-havegot-${row[0]}`, topic, row[1], row[2], row[3], row[4], row[5], { answerSpeech: row[2] })));
    return result;
  }

  lessons[reviewTopic.id] = [
    card('review02-lesson-greeting', '见面打招呼', [{ english: "Hello! I'm Ava.", chinese: '你好！我叫阿娃。' }], '扮演例子角色，先问好，再说名字。', "Hello! I'm Ava."),
    card('review02-lesson-name-age', '姓名和年龄', [{ english: "What's your name? I'm Leo.", chinese: '你叫什么名字？我叫里奥。' }, { english: "How old are you? I'm seven.", chinese: '你几岁了？示例回答：我七岁了。' }], '轮流问名字和年龄，用示例回答即可。', "What's your name? I'm Leo. How old are you? I'm seven."),
    card('review02-lesson-number', '数一数，再说数字', [{ english: 'five', chinese: '五' }], '数星星，用英文说数量。', 'five', { visual: { type: 'count', count: 5, icon: '⭐' } }),
    card('review02-lesson-colour', '说一说颜色', [{ english: 'purple', chinese: '紫色' }], '看色块，说出英文颜色。', 'purple', { visual: { type: 'colour', value: '#853eaa', label: '紫色色块' } }),
    card('review02-lesson-position', '物品在哪里', [{ english: "Where's the book? It's on the desk.", chinese: '书在哪里？它在书桌上。' }], '看位置图，轮流问在哪里。', "Where's the book? It's on the desk.", { visual: { type: 'position', relation: 'on', object: 'book', anchor: 'desk' } }),
    card('review02-lesson-plural', '一个和多个', [{ english: "What's this? It's a book.", chinese: '这是什么？它是一本书。' }, { english: "What are these? They're books.", chinese: '这些是什么？它们是书。' }], '先看一件物品，再看两件物品，换一种问答。', "What's this? It's a book. What are these? They're books.", { visual: { type: 'objects', word: 'book', count: 2, icon: '📕', label: '两本书' } }),
    card('review02-lesson-who', '介绍人物', [{ english: "Who is she? She's my sister.", chinese: '她是谁？她是我的姐姐。' }], '例子明确设定 Mia 是姐姐、用 she，按设定练问答。', "Who is she? She's my sister.", { visual: personVisual(people[5]) }),
    card('review02-lesson-havegot', '特征和有没有', [{ english: "I've got blue eyes.", chinese: '我有蓝色眼睛。' }, { english: "Have you got red hair? No, I haven't.", chinese: '你有红色头发吗？不，我没有。' }], '扮演示例 Mia，按图说特征，再回答问题。', "I've got blue eyes. Have you got red hair? No, I haven't.", { visual: personVisual(featurePeople[0]) })
  ];

  const questions = {
    'unit2-family': familyBank(), 'unit2-body': bodyBank(), 'unit2-who': whoBank(),
    'unit2-havegot': haveGotBank(), 'unit2-phonics': phonicsBank(), 'unit2-senses': sensesBank(),
    'unit2-reading': readingBank(), [reviewTopic.id]: reviewBank()
  };

  const booklet = {
    title: '我的 All about me 小手册',
    names: [{ name: 'Mia', pronoun: 'she' }, { name: 'Leo', pronoun: 'he' }, { name: 'Ava', pronoun: 'she' }, { name: 'Ben', pronoun: 'he' }],
    ages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    hairColours: [{ key: 'black', english: 'black', chinese: '黑色', value: '#20242a' }, { key: 'brown', english: 'brown', chinese: '棕色', value: '#88512f' }, { key: 'blond', english: 'blond', chinese: '金色', value: '#e9c565' }],
    eyeColours: [{ key: 'blue', english: 'blue', chinese: '蓝色', value: '#267bd8' }, { key: 'brown', english: 'brown', chinese: '棕色', value: '#88512f' }, { key: 'green', english: 'green', chinese: '绿色', value: '#278645' }],
    family: [{ key: 'mum', english: 'mum', chinese: '妈妈', pronoun: 'she' }, { key: 'dad', english: 'dad', chinese: '爸爸', pronoun: 'he' }, { key: 'grandma', english: 'grandma', chinese: '奶奶或外婆', pronoun: 'she' }, { key: 'grandpa', english: 'grandpa', chinese: '爷爷或外公', pronoun: 'he' }, { key: 'brother', english: 'brother', chinese: '哥哥或弟弟', pronoun: 'he' }, { key: 'sister', english: 'sister', chinese: '姐姐或妹妹', pronoun: 'she' }],
    favourites: [{ key: 'book', english: 'book', chinese: '书', icon: '📕' }, { key: 'pencil', english: 'pencil', chinese: '铅笔', icon: '✏️' }, { key: 'dog', english: 'dog', chinese: '狗', icon: '🐕' }, { key: 'cat', english: 'cat', chinese: '猫', icon: '🐈' }]
  };

  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function lesson(topic) { return copy(lessons[topic] || []); }
  function bank(topic) { return copy(questions[topic] || []); }
  const api = { topics, lesson, bank, reviewTopic, booklet };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GardenUnit2 = api;
})(typeof window !== 'undefined' ? window : globalThis);
