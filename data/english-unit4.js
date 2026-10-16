/*
 * Unit 4 Food with friends：根据用户提供的学习目标和重点照片整理。
 * 学习卡、题目、短文、食谱和野餐任务均为本项目原创，不使用教材故事或录音。
 * 本文件只增加新题号；固定词表和固定情境不等于随机生成的新题。
 * 喜好属于原创人物设定，真实孩子的口味和礼貌拒绝都受到尊重。
 */
(function (root) {
  'use strict';

  const topics = [
    { id: 'unit4-food', subject: 'english', name: 'Unit 4 · 认识食物', icon: '🍎', description: '认识 19 个重点食物词，分清不同词义。', goal: '能理解并说出常见食物的英文名称，区分食物 chicken、orange 与以前学过的动物和颜色。', focus: 'banana, bread, burger, cake, chicken, chocolate, lemonade, mango, salad, water; apple, bean, fruit, grape, juice, meat, meatball, orange, sausage' },
    { id: 'unit4-likes', subject: 'english', name: 'Unit 4 · 说说喜好', icon: '💬', description: '表达喜欢和不喜欢，询问朋友的喜好。', goal: '能用 like/don’t like 表达喜好，用 Do you like …? 问答，理解 likes 和 doesn’t like。', focus: "I like apples. / I don't like mangoes. / She likes bread. / He doesn't like chocolate. / Do you like grapes? Yes, I do. / No, I don't." },
    { id: 'unit4-requests', subject: 'english', name: 'Unit 4 · 请你尝一尝', icon: '🤲', description: '礼貌请求、邀请，接受或谢绝都可以。', goal: '能用 Can I have some …, please? 请求，用 Would you like some …? 邀请，并根据情境礼貌回应。', focus: 'Can I have some water, please? / Here you are. / Would you like some cake? / Yes, please. / No, thank you.' },
    { id: 'unit4-phonics', subject: 'english', name: 'Unit 4 · 字母 a 的声音', icon: '🔤', description: '听完整单词，辨认示例中 a 的两种声音。', goal: '把示例词中标出的 a 与 /æ/、/eɪ/ 联系起来，不把字母名当成所有 a 的发音。', focus: '/æ/: mango, salad（第一个 a）, cat, bag; /eɪ/: cake, lemonade, paper。只归纳这些例词，不说所有 a 都一样。' },
    { id: 'unit4-recipes', subject: 'english', name: 'Unit 4 · 读懂小食谱', icon: '🥣', description: '找食材，按步骤理解原创水果沙拉食谱。', goal: '能区分食材和做法，理解 First、Next、Then、Last 的先后顺序，了解食物可以有不同做法。', focus: 'ingredients、recipe、bowl、mix、share；用已经准备好的水果制作虚拟水果沙拉。' },
    { id: 'unit4-reading', subject: 'english', name: 'Unit 4 · 朋友野餐阅读', icon: '📖', description: '读 4 篇原创小短文，找到食物、喜好和分享信息。', goal: '能根据明确的短文事实作答，理解分享、询问和尊重别人的选择。', focus: '找出人物、食物、饮料和位置；理解不同喜好、礼貌请求与谢绝。' },
    { id: 'unit4-strategies', subject: 'english', name: 'Unit 4 · 找线索再选择', icon: '🔎', description: '先看问句，再找原文线索，排除不合适的答案。', goal: '能判断问题在问食物、人物还是地点，依据明确的信息排除错误选项，再核对答案。', focus: '先确定问什么；找原句；看清 don’t / doesn’t；核对预测，不把个人猜想当作事实。' }
  ];
  const reviewTopic = { id: 'review34-mixed', subject: 'english', name: '3–4 · 综合复习', icon: '🌟', description: '把农场动物和朋友野餐的重点连起来练。', goal: '能在原创情境中综合运用动物、描述、has got、食物、喜好及礼貌请求。', focus: '动物和形容词；has/hasn’t got；食物和喜好；请求与邀请；阅读线索。' };

  const foods = [
    { key: 'banana', english: 'banana', chinese: '香蕉', icon: '🍌', hint: '它是常见的黄色长条水果。' },
    { key: 'bread', english: 'bread', chinese: '面包', icon: '🍞', hint: '想想“面包”的英文；这里不加 s。' },
    { key: 'burger', english: 'burger', chinese: '汉堡包', icon: '🍔', hint: '两片面包中夹着食材的这种食物。' },
    { key: 'cake', english: 'cake', chinese: '蛋糕', icon: '🍰', hint: '生日聚会里常见的这种甜点。' },
    { key: 'chicken', english: 'chicken', chinese: '鸡肉', icon: '🍗', hint: '这里在食物单元，表示鸡肉，不是活的动物。' },
    { key: 'chocolate', english: 'chocolate', chinese: '巧克力', icon: '🍫', hint: '想想“巧克力”的英文。' },
    { key: 'lemonade', english: 'lemonade', chinese: '柠檬水', icon: '🥤', hint: '这是本课中用柠檬制作的饮料名称。' },
    { key: 'mango', english: 'mango', chinese: '芒果', icon: '🥭', hint: '想想“芒果”的英文，开头是 m。' },
    { key: 'salad', english: 'salad', chinese: '沙拉', icon: '🥗', hint: '将蔬菜或水果等食材拌在一起的这种食物。' },
    { key: 'water', english: 'water', chinese: '水', icon: '💧', hint: '想想“水”的英文。' },
    { key: 'apple', english: 'apple', chinese: '苹果', icon: '🍎', hint: '想想“苹果”的英文。' },
    { key: 'bean', english: 'bean', chinese: '豆', icon: '🌱', hint: '本课用这个词表示一颗豆；多颗时说 beans。' },
    { key: 'fruit', english: 'fruit', chinese: '水果', icon: '🍎🍌', hint: '苹果、香蕉等都属于这一类食物。' },
    { key: 'grape', english: 'grape', chinese: '葡萄', icon: '🍇', hint: '这种水果常常一串串地长着。' },
    { key: 'juice', english: 'juice', chinese: '果汁', icon: '🥤', hint: '用水果制作的饮料，但这里不是水果本身。' },
    { key: 'meat', english: 'meat', chinese: '肉', icon: '🥩', hint: '这里泛指肉类，不是肉丸。' },
    { key: 'meatball', english: 'meatball', chinese: '肉丸', icon: '🍽️', hint: 'meat 加上 ball，表示丸子形状的肉食。' },
    { key: 'orange', english: 'orange', chinese: '橙子', icon: '🍊', hint: '本题在说水果，不是在问颜色。' },
    { key: 'sausage', english: 'sausage', chinese: '香肠', icon: '🌭', hint: '想想“香肠”的英文；图标只是食物示意。' }
  ];
  const phonicsWords = [
    { word: 'mango', marked: 'm[a]ngo', sound: '/æ/', chinese: '芒果' },
    { word: 'salad', marked: 's[a]lad', sound: '/æ/', chinese: '沙拉' },
    { word: 'cat', marked: 'c[a]t', sound: '/æ/', chinese: '猫' },
    { word: 'bag', marked: 'b[a]g', sound: '/æ/', chinese: '包' },
    { word: 'cake', marked: 'c[a]ke', sound: '/eɪ/', chinese: '蛋糕' },
    { word: 'lemonade', marked: 'lemon[a]de', sound: '/eɪ/', chinese: '柠檬水' },
    { word: 'paper', marked: 'p[a]per', sound: '/eɪ/', chinese: '纸' }
  ];
  const recipe = {
    title: '原创食谱：水果沙拉',
    passage: ['We have got apples, bananas and grapes.', 'First, wash your hands.', 'Next, put the prepared fruit in a bowl.', 'Then, add some juice and mix.', 'Last, share the fruit salad.'],
    translation: ['我们有苹果、香蕉和葡萄。', '首先，洗手。', '接着，把已经准备好的水果放进碗里。', '然后，加一些果汁并拌一拌。', '最后，分享水果沙拉。'],
    glossary: [{ english: 'prepared fruit', chinese: '已经准备好的水果' }, { english: 'First / Next / Then / Last', chinese: '首先 / 接着 / 然后 / 最后' }, { english: 'bowl', chinese: '碗' }, { english: 'add', chinese: '加入' }, { english: 'mix', chinese: '拌一拌' }, { english: 'share', chinese: '分享' }]
  };
  const readings = [
    { key: 'picnic-basket', title: '篮子里的午餐', passage: ['Mia and Ben have a picnic.', 'Mia has got some bread and apples.', 'Ben has got some chicken and grapes.', 'The water is in the basket.'], translation: ['米娅和本去野餐。', '米娅有一些面包和苹果。', '本有一些鸡肉和葡萄。', '水在篮子里。'], glossary: [{ english: 'picnic', chinese: '野餐' }, { english: 'basket', chinese: '篮子' }], queries: [
      ['mia', '短文中，米娅带了哪两种食物？', '面包和苹果', ['面包和苹果', '鸡肉和葡萄', '蛋糕和橙子'], '找 Mia has got 开头的一句。', 'Mia has got some bread and apples. 明确写出米娅的食物。', 'Mia has got some bread and apples.'],
      ['ben', '短文中，谁带了鸡肉和葡萄？', 'Ben', ['Ben', 'Mia', '没有人'], '找 chicken 和 grapes 所在句子的名字。', 'Ben has got some chicken and grapes. 说的是 Ben。', 'Ben has got some chicken and grapes.'],
      ['water', '根据短文，水在哪里？', '篮子里', ['篮子里', '椅子下', '窗户旁'], '看最后一句，in the basket 是在篮子里。', 'The water is in the basket. 明确说明水的位置。', 'The water is in the basket.'],
      ['activity', '短文中，两个朋友在做什么？', '野餐', ['野餐', '上音乐课', '骑马'], '看第一句里的 picnic。', 'Mia and Ben have a picnic. 告诉我们他们在野餐。', 'Mia and Ben have a picnic.']
    ] },
    { key: 'different-tastes', title: '喜欢的食物不一样', passage: ['Nora likes mangoes.', 'Eli does not like mangoes.', 'He likes apples.', 'They listen to each other.'], translation: ['诺拉喜欢芒果。', '伊莱不喜欢芒果。', '他喜欢苹果。', '他们听取彼此的想法。'], glossary: [{ english: 'does not', chinese: '不；doesn’t 的完整形式' }, { english: 'each other', chinese: '彼此' }], queries: [
      ['nora', '根据短文，诺拉喜欢什么？', '芒果', ['芒果', '香肠', '果汁'], '第一句 Nora likes 后面就是答案。', 'Nora likes mangoes. 说明诺拉喜欢芒果。', 'Nora likes mangoes.'],
      ['eli-not', '根据短文，伊莱不喜欢什么？', '芒果', ['芒果', '苹果', '短文说他什么都不喜欢'], '找 does not like；not 表示不。', 'Eli does not like mangoes. 说他不喜欢芒果，不能推成他不喜欢所有食物。', 'Eli does not like mangoes.'],
      ['he', 'He likes apples. 中的 He 指谁？', 'Eli', ['Eli', 'Nora', '两个人'], '看前一句提到的人物，第三句继续介绍他。', '第二句介绍 Eli，第三句的 He 继续指 Eli。', 'He likes apples.'],
      ['together', '短文最后，他们怎样对待不同喜好？', '听取彼此的想法', ['听取彼此的想法', '强迫别人吃芒果', '嘲笑不同口味'], '最后一句 listen to each other 是互相倾听。', 'They listen to each other. 表示尊重彼此的不同喜好。', 'They listen to each other.']
    ] },
    { key: 'ask-for-water', title: '先请求，再道谢', passage: ['Ava says, "Can I have some water, please?"', 'Sam says, "Here you are."', 'Ava says, "Thank you."', 'The water is on the picnic table.'], translation: ['艾娃说：“请给我一些水，好吗？”', '萨姆说：“给你。”', '艾娃说：“谢谢你。”', '水在野餐桌上。'], glossary: [{ english: 'says', chinese: '说' }, { english: 'picnic table', chinese: '野餐桌' }], queries: [
      ['request', '短文中，艾娃想要什么？', '水', ['水', '巧克力', '鸡肉'], '找 Can I have some 后面的食物或饮料。', 'Can I have some water, please? 是请求一些水。', 'Can I have some water, please?'],
      ['giver', '短文中，谁说 Here you are.？', 'Sam', ['Sam', 'Ava', '两个人都说了'], '第二句的人物就是递东西的人。', '第二句写 Sam says, "Here you are."，说这句的是 Sam。', 'Here you are.'],
      ['thanks', '艾娃收到水后说了什么？', 'Thank you.', ['Thank you.', 'How old are you?', 'It is a cat.'], '第三句是收到帮助后的道谢。', 'Ava says, "Thank you."，表示谢谢你。', 'Thank you.'],
      ['place', '根据短文，水放在哪里？', '野餐桌上', ['野餐桌上', '篮子下面', '教室门后'], '最后一句 on 表示在……上面。', 'The water is on the picnic table. 说明水在野餐桌上。', 'The water is on the picnic table.']
    ] },
    { key: 'polite-choice', title: '邀请，也尊重谢绝', passage: ['Lina says, "Would you like some cake?"', 'Owen says, "No, thank you."', 'Lina says, "Would you like some grapes?"', 'Owen says, "Yes, please."'], translation: ['莉娜说：“你想来些蛋糕吗？”', '欧文说：“不了，谢谢。”', '莉娜说：“你想来些葡萄吗？”', '欧文说：“好的，请给我一些。”'], glossary: [{ english: 'Would you like some …?', chinese: '你想来些……吗？' }, { english: 'No, thank you.', chinese: '不了，谢谢；礼貌谢绝' }, { english: 'Yes, please.', chinese: '好的，请给我一些；礼貌接受' }], queries: [
      ['first', '莉娜第一次邀请欧文吃什么？', '蛋糕', ['蛋糕', '葡萄', '汉堡包'], '看第一句的 cake。', '第一句是 Would you like some cake?，先邀请吃蛋糕。', 'Would you like some cake?'],
      ['decline', '欧文怎样回应蛋糕邀请？', '礼貌谢绝', ['礼貌谢绝', '礼貌接受', '询问年龄'], '第二句 No, thank you. 里的 No 是关键。', 'No, thank you. 是礼貌谢绝，不是做错了，也不代表不尊重朋友。', 'No, thank you.'],
      ['accept', '根据短文，欧文接受了什么？', '葡萄', ['葡萄', '蛋糕', '橙子'], '第三句邀请葡萄，第四句回答 Yes, please.。', '欧文在葡萄邀请后回答 Yes, please.，表示接受葡萄。', 'Would you like some grapes? Yes, please.'],
      ['who', '短文中，谁提出了两次邀请？', 'Lina', ['Lina', 'Owen', '没有人'], '找两个 Would you like 开头问句前的人名。', '两个邀请都由 Lina 提出，Owen 负责回应。', 'Would you like some cake?']
    ] }
  ];

  function card(id, title, lines, sayPrompt, sayModel, extra) { return Object.assign({ id, title, lines, sayPrompt, sayModel }, extra || {}); }
  function question(id, topic, prompt, answer, choices, hint, explanation, extra) { return Object.assign({ id, topic, prompt, answer, choices, hint, explanation }, extra || {}); }
  function rowQuestions(topic, rows) { return rows.map(row => question(`${topic}-${row[0]}`, topic, row[1], row[2], row[3], row[4], row[5], { answerSpeech: row[6] })); }
  function listening(id, topic, answer, choices, speech, explanation, extra) { return question(id, topic, '听完整词或句子，选出意思。', answer, choices, '可以再听一次，也可以阅读文字提示。先找关键词。', explanation, Object.assign({ kind: 'listening', speech, fallbackPrompt: `文字提示：${speech}`, answerSpeech: speech }, extra || {})); }
  function alternatives(items, index, field) { return [items[index][field], items[(index + 1) % items.length][field], items[(index + 3) % items.length][field]]; }
  function foodVisual(entry) { return { type: 'food', icon: entry.icon, label: `食物示意：${entry.chinese}` }; }
  function lines(english, chinese) { return english.map((text, index) => ({ english: text, chinese: chinese[index] })); }

  const lessons = {
    'unit4-food': foods.map(entry => card(`unit4-lesson-food-${entry.key}`, `认识${entry.chinese}`, [{ english: entry.english, chinese: entry.chinese }], '看中文和食物示意，听完整单词，再说一遍。', entry.english, { visual: foodVisual(entry), note: entry.key === 'chicken' ? '本课 chicken 表示食物“鸡肉”；Unit 3 的 chicken 表示动物“鸡”。' : entry.key === 'orange' ? '本课 orange 表示水果“橙子”；Hello 中也学过它表示橙色的用法。' : entry.key === 'bean' || entry.key === 'grape' ? `词卡用单数 ${entry.english}；说一些${entry.chinese}时用 some ${entry.english}s。` : '图标只是食物示意，名称以单词和中文说明为准。喜欢什么由每个人自己决定。' })),
    'unit4-likes': [
      card('unit4-lesson-likes-self-yes', '我喜欢', [{ english: 'I like apples.', chinese: '我喜欢苹果。' }], '这是句型示例；可以换成自己会说的食物。', 'I like apples.', { note: '喜欢整类可数食物时，这里用复数 apples。个人喜好不自动评分。' }),
      card('unit4-lesson-likes-self-no', '我不喜欢', [{ english: "I don't like mangoes.", chinese: '我不喜欢芒果。' }], '读出 don’t 的“不”；不喜欢也可以礼貌表达。', "I don't like mangoes.", { note: 'don’t = do not。mangoes 是 mango 的一种标准复数写法。' }),
      card('unit4-lesson-likes-she', '说“她喜欢”', [{ english: 'She likes bread.', chinese: '她喜欢面包。' }], '示例中的她喜欢面包，留意 likes 末尾的 s。', 'She likes bread.', { note: 'She / He 后的肯定句用 likes；bread 在这里是不可数食物，不写 breads。' }),
      card('unit4-lesson-likes-he-no', '说“他不喜欢”', [{ english: "He doesn't like chocolate.", chinese: '他不喜欢巧克力。' }], '示例中的他不喜欢巧克力；doesn’t 后用 like。', "He doesn't like chocolate.", { note: 'doesn’t = does not。这里不写 doesn’t likes。' }),
      card('unit4-lesson-likes-question', '问朋友喜欢吗', [{ english: 'Do you like grapes?', chinese: '你喜欢葡萄吗？' }], '读出问句，也认真听对方的回答。', 'Do you like grapes?', { note: 'Do 放在 you 前面，提问仍用 like。' }),
      card('unit4-lesson-likes-answer-yes', '喜欢，怎样回答', [{ english: 'Do you like grapes? Yes, I do.', chinese: '你喜欢葡萄吗？是的，我喜欢。' }], '示例人物明确喜欢葡萄，所以用肯定回答。', 'Do you like grapes? Yes, I do.'),
      card('unit4-lesson-likes-answer-no', '不喜欢，怎样回答', [{ english: "Do you like grapes? No, I don't.", chinese: '你喜欢葡萄吗？不，我不喜欢。' }], '示例人物明确不喜欢葡萄，所以用否定回答。', "Do you like grapes? No, I don't.", { note: '这是喜好问答；接受食物邀请时通常用 Yes, please.，注意场景不同。' }),
      card('unit4-lesson-likes-listen', '口味不同，也能做朋友', [{ english: 'We like different food.', chinese: '我们喜欢不同的食物。' }, { english: 'We listen to each other.', chinese: '我们听取彼此的想法。' }], '说一种自己喜欢或不喜欢的食物，也听听朋友的选择。', 'We like different food. We listen to each other.', { glossary: [{ english: 'different', chinese: '不同的' }, { english: 'each other', chinese: '彼此' }], note: '题目只核对原创人物的明确设定，不把真实孩子的口味判成对错。' })
    ],
    'unit4-requests': [
      card('unit4-lesson-requests-ask', '想要一些，请这样说', [{ english: 'Can I have some water, please?', chinese: '请给我一些水，好吗？' }], '请朋友递水时，用 please 表达礼貌。', 'Can I have some water, please?'),
      card('unit4-lesson-requests-give', '递给别人', [{ english: 'Here you are.', chinese: '给你。' }, { english: 'Thank you.', chinese: '谢谢你。' }], '一人递东西，一人道谢；可以只读文字。', 'Here you are. Thank you.'),
      card('unit4-lesson-requests-offer', '邀请别人尝一尝', [{ english: 'Would you like some cake?', chinese: '你想来些蛋糕吗？' }], '试着发出邀请，再听对方的选择。', 'Would you like some cake?'),
      card('unit4-lesson-requests-accept', '愿意接受', [{ english: 'Yes, please.', chinese: '好的，请给我一些。' }], '示例人物愿意接受邀请，礼貌回答。', 'Yes, please.', { note: '这不是 Do you like …? 的简短回答；请先看问句是在邀请还是询问喜好。' }),
      card('unit4-lesson-requests-decline', '也可以礼貌谢绝', [{ english: 'No, thank you.', chinese: '不了，谢谢。' }], '示例人物暂时不想吃；谢绝也很礼貌。', 'No, thank you.', { note: '邀请不是要求。朋友谢绝时，尊重选择，不强迫吃东西。' }),
      card('unit4-lesson-requests-icecream', '补充词：ice cream', [{ english: 'ice cream', chinese: '冰激凌' }, { english: 'Would you like some ice cream?', chinese: '你想来些冰激凌吗？' }], '这份邀请使用教材重点句里的补充食物词，听完整词再读句子。', 'Would you like some ice cream?', { note: 'ice cream 是本课句型中的补充词，不计入本次 19 个重点食物词。' }),
      card('unit4-lesson-requests-some', 'some 后，词形要合适', [{ english: 'some apples; some bread; some water', chinese: '一些苹果；一些面包；一些水' }, { english: 'Can I have some apples, please?', chinese: '请给我一些苹果，好吗？' }], '苹果有多个，写 apples；这里的面包和水不加 s。', 'some apples. some bread. some water. Can I have some apples, please?', { note: '本课中可数食物用复数，如 bananas、grapes、meatballs；不可数食物如 bread、water、chicken（鸡肉）直接接 some。' })
    ],
    'unit4-phonics': [
      card('unit4-lesson-phonics-short', '这些例词中的 /æ/', [{ english: 'm[a]ngo; s[a]lad; c[a]t; b[a]g', chinese: '芒果；沙拉；猫；包；看方括号里的 a' }], '听完整单词，再看标出的 a。', 'mango. salad. cat. bag.', { soundLetter: 'a', exampleWords: ['mango', 'salad', 'cat', 'bag'], note: '这些例词中标出的 a 对应 /æ/。salad 只标第一个 a，第二个 a 不属于这里的目标。播放完整单词，不用字母名 A 代替它。' }),
      card('unit4-lesson-phonics-long', '这些例词中的 /eɪ/', [{ english: 'c[a]ke; lemon[a]de; p[a]per', chinese: '蛋糕；柠檬水；纸；看方括号里的 a' }], '听完整词，比较上一张卡的声音。', 'cake. lemonade. paper.', { soundLetter: 'a', exampleWords: ['cake', 'lemonade', 'paper'], note: '这些例词中标出的 a 对应 /eɪ/，与字母名 A 的声音相同；不是每个 a 都这样读。' }),
      card('unit4-lesson-phonics-salad', 'salad 只看第一个 a', [{ english: 's[a]lad', chinese: '沙拉；方括号里是第一个 a' }], '听 salad，再在词里指一指第一个 a。', 'salad', { soundLetter: 'a', exampleWords: ['salad'], note: 'salad 有两个 a。本节归类的是第一个 a 的 /æ/，不把第二个 a 一起归进来。' }),
      card('unit4-lesson-phonics-compare', '同一个字母，示例声音不同', [{ english: 'bag; cake', chinese: 'bag 中 a 是 /æ/；cake 中 a 是 /eɪ/' }, { english: 'cat; paper', chinese: 'cat 中 a 是 /æ/；paper 中 a 是 /eɪ/' }], '听完整例词，比较标出的声音，不作自动发音评分。', 'bag. cake. cat. paper.', { soundLetter: 'a', exampleWords: ['bag', 'cake', 'cat', 'paper'], note: '本节只归纳这些例词。读新词要继续听正确词音，不能把所有 a 都套同一条规则。' })
    ],
    'unit4-recipes': [
      card('unit4-lesson-recipes-ingredients', '先看食材', [{ english: 'apples, bananas, grapes and juice', chinese: '苹果、香蕉、葡萄和果汁' }], '这些是原创水果沙拉需要的食材；bowl 是容器，不是食材。', 'apples. bananas. grapes. juice.', { glossary: [{ english: 'ingredients', chinese: '食材' }, { english: 'bowl', chinese: '碗' }], note: '虚拟练习使用已经准备好的水果，不安排刀具或加热操作。' }),
      card('unit4-lesson-recipes-method', recipe.title, lines(recipe.passage, recipe.translation), '先找食材，再用 First、Next、Then、Last 找到顺序。', recipe.passage.join(' '), { glossary: recipe.glossary, note: '原创示例食谱。可以用词卡排步骤完成，不要求实际制作或品尝。' }),
      card('unit4-lesson-recipes-steps', '顺序词带路', [{ english: 'First, wash your hands.', chinese: '首先，洗手。' }, { english: 'Last, share the fruit salad.', chinese: '最后，分享水果沙拉。' }], '在食谱中找开头和结尾，再找中间两步。', 'First, wash your hands. Last, share the fruit salad.', { note: '按本篇明确写出的步骤作答，不把其他可行做法说成错误。' }),
      card('unit4-lesson-recipes-cultures', '食物可以有不同做法', [{ english: 'This pasta dish is from Italy.', chinese: '这道意面来自意大利。' }, { english: 'People make food in different ways.', chinese: '人们用不同的方式做食物。' }], '认识本节补充词 pasta，了解一道食物的来源，不比较谁的食物更好。', 'This pasta dish is from Italy. People make food in different ways.', { glossary: [{ english: 'pasta', chinese: '意大利面食' }, { english: 'dish', chinese: '一道菜' }, { english: 'Italy', chinese: '意大利' }, { english: 'in different ways', chinese: '用不同的方式' }], note: '“这道意面来自意大利”是示例中的信息，不表示那里的人只吃这一种食物。' })
    ],
    'unit4-reading': readings.map(story => card(`unit4-lesson-reading-${story.key}`, story.title, lines(story.passage, story.translation), '先读小词典，再找到一句支持答案的原文。可以听、读或指句子。', story.passage.join(' '), { glossary: story.glossary, note: '这是本项目原创短文和人物设定，不是教材原文。回答以短文为准，不猜真实朋友的喜好。' })),
    'unit4-strategies': [
      card('unit4-lesson-strategies-question', '先看“问什么”', [{ english: 'What food does Mia like?', chinese: '米娅喜欢什么食物？' }, { english: 'Who has got the water?', chinese: '谁拿着水？' }, { english: 'Where is the bread?', chinese: '面包在哪里？' }], '先说问题要食物、人物还是地点，再找对应信息。', 'What food does Mia like? Who has got the water? Where is the bread?', { note: '知道问题在问什么，就能先排除答非所问的选项。' }),
      card('unit4-lesson-strategies-negative', '看清“不”', [{ english: "Ben doesn't like cake.", chinese: '本不喜欢蛋糕。' }, { english: 'He likes bananas.', chinese: '他喜欢香蕉。' }], '先找 doesn’t，再看他真正喜欢哪种食物。', "Ben doesn't like cake. He likes bananas.", { note: '不能只见到 cake 就选蛋糕，要把否定词一起读。' }),
      card('unit4-lesson-strategies-check', '先预测，再核对', [{ english: 'Ava has got a bowl and some fruit.', chinese: '艾娃有一个碗和一些水果。' }, { english: 'She makes a fruit salad.', chinese: '她做了一份水果沙拉。' }], '读第一句可以先猜；读到第二句后，用原文核对。', 'Ava has got a bowl and some fruit. She makes a fruit salad.', { note: '第一句不能确定她一定做什么；题目会提供后文，评分只看明确写出的事实。' }),
      card('unit4-lesson-strategies-evidence', '答案要有原句支持', [{ english: 'The juice is on the table.', chinese: '果汁在桌子上。' }, { english: 'The water is in the basket.', chinese: '水在篮子里。' }], '问题若问 juice，就找 juice 所在句；别用 water 的位置回答。', 'The juice is on the table. The water is in the basket.', { note: '核对同一个物品和位置；没有说明的信息不猜成事实。' })
    ],
    'review34-mixed': [
      card('review34-lesson-animals', '农场动物和特征', [{ english: 'The donkey has got long ears.', chinese: '这头驴有长耳朵。' }, { english: 'They are little ducks.', chinese: '它们是小鸭子。' }], '根据原创句子的明确描述，找动物和形容词。', 'The donkey has got long ears. They are little ducks.', { note: '复习动物词、形容词在名词前，以及 has got。' }),
      card('review34-lesson-food', '从农场到食物词', [{ english: 'Cows give us milk.', chinese: '奶牛为我们提供奶。' }, { english: 'I like apples.', chinese: '我喜欢苹果。' }], '把动物资源词和朋友的食物喜好分开理解。', 'Cows give us milk. I like apples.', { note: '尊重动物，也尊重不同人的食物选择。' }),
      card('review34-lesson-invitation', '邀请和礼貌回应', [{ english: 'Would you like some bread? No, thank you.', chinese: '你想来些面包吗？不了，谢谢。' }, { english: 'Can I have some water, please? Here you are.', chinese: '请给我一些水，好吗？给你。' }], '先分清邀请和请求，再按情境回答。', 'Would you like some bread? No, thank you. Can I have some water, please? Here you are.', { note: '接受或谢绝都可以；题目只根据明确情境选择。' }),
      card('review34-lesson-clues', '一起读原创小情境', [{ english: 'The toy duck is happy.', chinese: '这只玩具鸭很高兴。' }, { english: 'The grapes are in the basket.', chinese: '葡萄在篮子里。' }, { english: 'Mia likes grapes.', chinese: '米娅喜欢葡萄。' }], '找出动物心情、食物位置和人物喜好，逐句核对。', 'The toy duck is happy. The grapes are in the basket. Mia likes grapes.', { note: '心情是玩具故事设定；不靠图标猜心情。' })
    ]
  };

  function foodBank() {
    const topic = 'unit4-food';
    return foods.flatMap((entry, index) => [
      question(`unit4-food-meaning-${entry.key}`, topic, `食物词“${entry.english}”在本课是什么意思？`, entry.chinese, alternatives(foods, index, 'chinese'), entry.hint, `${entry.english} 在本食物单元表示${entry.chinese}。${entry.key === 'chicken' ? '这里是鸡肉，不是活的鸡。' : entry.key === 'orange' ? '这里是橙子，不是在说橙色。' : ''}`, { answerSpeech: entry.english }),
      question(`unit4-food-word-${entry.key}`, topic, `看文字“${entry.chinese}”和食物示意，选英文。`, entry.english, alternatives(foods, index, 'english'), entry.hint, `${entry.chinese}的英文是 ${entry.english}。图标只是示意，词义以文字为准。`, { visual: foodVisual(entry), answerSpeech: entry.english }),
      listening(`unit4-food-listen-${entry.key}`, topic, entry.chinese, alternatives(foods, index, 'chinese'), entry.english, `${entry.english} 在本课表示${entry.chinese}。`)
    ]);
  }

  function likesBank() {
    const topic = 'unit4-likes';
    const rows = [
      ['self-yes', '想说“我喜欢苹果”，补句：I ___ apples.', 'like', ['like', 'likes', 'does'], 'I 后面用 like。', 'I like apples. 表示我喜欢苹果。', 'I like apples.'],
      ['self-no', '想说“我不喜欢芒果”，选哪句？', "I don't like mangoes.", ["I don't like mangoes.", 'I like mangoes.', "She doesn't like mangoes."], '我用 I；不喜欢用 don’t like。', 'I don’t like mangoes. 同时表示我和不喜欢。', "I don't like mangoes."],
      ['she-yes', '补句“她喜欢面包”：She ___ bread.', 'likes', ['likes', 'like', "don't"], 'She 后的肯定句，like 要加 s。', 'She likes bread. 使用 likes，bread 在这里不加 s。', 'She likes bread.'],
      ['he-yes', '补句“他喜欢香蕉”：He ___ bananas.', 'likes', ['likes', 'like', 'do'], 'He 后的肯定句用 likes。', 'He likes bananas. 表示他喜欢香蕉。', 'He likes bananas.'],
      ['she-no', '补句“她不喜欢果汁”：She ___ like juice.', "doesn't", ["doesn't", "don't", 'is'], 'She 后面的否定用 doesn’t like。', 'She doesn’t like juice. 表示她不喜欢果汁。', "She doesn't like juice."],
      ['he-no-verb', '补句：He doesn’t ___ chocolate.', 'like', ['like', 'likes', 'liking'], 'doesn’t 后用原形 like。', 'He doesn’t like chocolate. 不再给 like 加 s。', "He doesn't like chocolate."],
      ['ask', '想问“你喜欢葡萄吗”，选哪句？', 'Do you like grapes?', ['Do you like grapes?', 'You like grapes.', 'Would you like some grapes?'], '询问平时喜好，用 Do you like …?；不是现在邀请吃一点。', 'Do you like grapes? 询问喜好；Would you like some grapes? 是邀请。', 'Do you like grapes?'],
      ['ask-do', '补出喜好问句：___ you like apples?', 'Do', ['Do', 'Does', 'Is'], 'you 的这个喜好问句用 Do。', 'Do you like apples? 表示你喜欢苹果吗。', 'Do you like apples?'],
      ['yes-context', '原创人物安明确喜欢苹果。回答 Do you like apples?，选哪句？', 'Yes, I do.', ['Yes, I do.', "No, I don't.", 'Yes, I am.'], '题干明确说喜欢；Do 问句用 do 简答。', '安喜欢苹果，所以回答 Yes, I do.。', 'Do you like apples? Yes, I do.'],
      ['no-context', '原创人物凯明确不喜欢葡萄。回答 Do you like grapes?，选哪句？', "No, I don't.", ["No, I don't.", 'Yes, I do.', "No, I haven't."], '题干明确说不喜欢；Do 问句用 don’t 否定回答。', '凯不喜欢葡萄，所以回答 No, I don’t.。', "Do you like grapes? No, I don't."],
      ['translate-dont', 'I don’t like bread. 的意思是？', '我不喜欢面包', ['我不喜欢面包', '我喜欢面包', '她不喜欢面包'], '看清 I 和 don’t。', 'I don’t like bread. 表示我不喜欢面包。', "I don't like bread."],
      ['translate-likes', 'She likes salad. 的意思是？', '她喜欢沙拉', ['她喜欢沙拉', '她不喜欢沙拉', '我喜欢沙拉'], 'She 是她；likes 表示喜欢。', 'She likes salad. 表示她喜欢沙拉。', 'She likes salad.'],
      ['translate-doesnt', 'He doesn’t like meatballs. 的意思是？', '他不喜欢肉丸', ['他不喜欢肉丸', '他喜欢肉丸', '他们不喜欢水'], 'He 是他；doesn’t like 表示不喜欢。', 'He doesn’t like meatballs. 表示他不喜欢肉丸。', "He doesn't like meatballs."],
      ['apples-plural', '这里谈整类食物，补句：I like ___.（苹果）', 'apples', ['apples', 'an apple', 'apple'], '本课表示喜欢苹果这类食物，用复数 apples。', 'I like apples. 使用可数食物的复数表示这一类。', 'I like apples.'],
      ['bread-mass', '补句：She likes ___.（面包）', 'bread', ['bread', 'breads', 'a breads'], '这里的 bread 是不可数食物，直接写 bread。', 'She likes bread. 这里不写 breads。', 'She likes bread.'],
      ['mangoes-form', '本课用哪个词补出“我喜欢芒果”：I like ___.', 'mangoes', ['mangoes', 'mangoing', 'a mangoes'], '本课词卡给出 mango 的标准复数 mangoes。', 'I like mangoes. 表达喜欢芒果这类食物；mangoes 是标准复数。', 'I like mangoes.'],
      ['negative-full', 'don’t 的完整形式是什么？', 'do not', ['do not', 'does not', 'is not'], 'don’t 来自 do 和 not。', 'don’t = do not；doesn’t 才是 does not。', "I don't like cake."],
      ['doesnt-full', 'doesn’t 的完整形式是什么？', 'does not', ['does not', 'do not', 'are not'], '看开头 does，后面 n’t 表示 not。', 'doesn’t = does not。', "He doesn't like cake."],
      ['different-likes', '两位原创人物喜好不同，怎样交流合适？', '听取各自喜好，尊重不同选择', ['听取各自喜好，尊重不同选择', '强迫朋友喜欢同一种食物', '因为口味不同就嘲笑朋友'], '喜欢什么可以不同，先听对方说完。', '喜好没有统一答案；互相倾听和尊重选择。', 'We listen to each other.'],
      ['they-yes', '补句“他们喜欢水果”：They ___ fruit.', 'like', ['like', 'likes', 'does'], 'They 后面的肯定句用 like。', 'They like fruit. 表示他们喜欢水果。', 'They like fruit.']
    ];
    const result = rowQuestions(topic, rows);
    [
      ['self', '我喜欢汉堡包', ['我喜欢汉堡包', '我不喜欢汉堡包', '她喜欢汉堡包'], 'I like burgers.'],
      ['negative', '我不喜欢香肠', ['我不喜欢香肠', '我喜欢香肠', '他不喜欢葡萄'], "I don't like sausages."],
      ['she', '她喜欢巧克力', ['她喜欢巧克力', '她不喜欢巧克力', '他喜欢橙子'], 'She likes chocolate.'],
      ['he', '他不喜欢鸡肉', ['他不喜欢鸡肉', '他喜欢鸡肉', '我不喜欢鸡肉'], "He doesn't like chicken."]
    ].forEach(row => result.push(listening(`${topic}-listen-${row[0]}`, topic, row[1], row[2], row[3], `${row[3]} 表示“${row[1]}”。`)));
    return result;
  }

  function requestsBank() {
    const topic = 'unit4-requests';
    const rows = [
      ['ask-water', '想礼貌请求一些水，选哪句？', 'Can I have some water, please?', ['Can I have some water, please?', 'Do you like water?', 'Where is the water?'], '请求自己想要的东西，用 Can I have …, please?。', 'Can I have some water, please? 是礼貌请求水。', 'Can I have some water, please?'],
      ['ask-bread', '补出请求：___ I have some bread, please?', 'Can', ['Can', 'Am', 'Would'], '本课请求句型开头是 Can I have。', 'Can I have some bread, please? 表示请给我一些面包，好吗。', 'Can I have some bread, please?'],
      ['please', '补出礼貌请求：Can I have some juice, ___?', 'please', ['please', 'green', 'under'], '请求时加上“请”。', 'please 表示请，使请求更礼貌。', 'Can I have some juice, please?'],
      ['giver', '朋友请求一些水，你正递给他，选哪句？', 'Here you are.', ['Here you are.', 'How old are you?', 'I am six.'], '递东西时可以说“给你”。', 'Here you are. 在这里表示给你。', 'Here you are.'],
      ['thanks', '朋友把水递给你，怎样道谢？', 'Thank you.', ['Thank you.', 'It is a cow.', 'What colour is it?'], '受到帮助，可以说谢谢。', 'Thank you. 表示谢谢你。', 'Thank you.'],
      ['offer', '想邀请朋友吃一些蛋糕，选哪句？', 'Would you like some cake?', ['Would you like some cake?', 'Can I have some cake, please?', 'Where is the cake?'], '邀请别人尝一尝，用 Would you like some …?。', 'Would you like some cake? 是邀请；Can I have …? 是自己提出请求。', 'Would you like some cake?'],
      ['offer-would', '补出邀请：___ you like some grapes?', 'Would', ['Would', 'Can', 'Are'], '本课的邀请句以 Would you like 开头。', 'Would you like some grapes? 是礼貌邀请吃些葡萄。', 'Would you like some grapes?'],
      ['accept', '情境：乐乐愿意接受蛋糕邀请，怎样回答？', 'Yes, please.', ['Yes, please.', 'No, thank you.', 'No, I am not.'], '愿意接受时，用 Yes，并加 please。', 'Yes, please. 是礼貌接受；题干已明确人物愿意。', 'Yes, please.'],
      ['decline', '情境：朵朵暂时不想吃蛋糕，怎样礼貌谢绝？', 'No, thank you.', ['No, thank you.', 'Yes, please.', 'Yes, I do.'], '不想接受也可以礼貌说不，再道谢。', 'No, thank you. 是礼貌谢绝，不需要勉强接受。', 'No, thank you.'],
      ['invitation-v-like', '朋友问 Would you like some juice?，你想接受邀请，选哪句？', 'Yes, please.', ['Yes, please.', 'Yes, I do.', 'Yes, it has.'], '这是现在邀请喝一点，不是 Do you like …? 的喜好问答。', '对食物邀请用 Yes, please. 接受；Yes, I do. 是 Do 问句的常见简答。', 'Would you like some juice? Yes, please.'],
      ['icecream', '邀请中的 ice cream 指什么？', '冰激凌', ['冰激凌', '柠檬水', '面包'], '这是本课句型里补充的食物词。', 'ice cream 表示冰激凌，是两个词组成的名称。', 'ice cream'],
      ['some-apples', '补出正确请求：Can I have some ___, please?（苹果）', 'apples', ['apples', 'a apple', 'an apples'], 'some 后要几个苹果，这里用复数 apples。', 'some apples 是一些苹果，不在 some 后加 a 或 an。', 'Can I have some apples, please?'],
      ['some-bread', '补出正确邀请：Would you like some ___?（面包）', 'bread', ['bread', 'breads', 'a bread'], '本课的 bread 是不可数食物，直接放在 some 后。', 'some bread 表示一些面包，这里不写 breads 或 a bread。', 'Would you like some bread?'],
      ['some-chicken', '这里在说鸡肉，补句：Can I have some ___, please?', 'chicken', ['chicken', 'a chickens', 'a chicken'], '这里是食物“鸡肉”，不是一只活的鸡。', 'some chicken 表示一些鸡肉；a chicken 可以指一只鸡，与这里的意思不同。', 'Can I have some chicken, please?'],
      ['some-meatballs', '补出“一些肉丸”：some ___', 'meatballs', ['meatballs', 'a meatball', 'a meatballs'], '这里是多个肉丸，可数词 meatball 要用复数。', 'some meatballs 表示一些肉丸。', 'some meatballs'],
      ['respect-no', '朋友对你的邀请说 No, thank you.，怎样合适？', '尊重朋友的选择', ['尊重朋友的选择', '强迫朋友吃完', '说朋友谢绝就是答错'], '邀请允许接受，也允许谢绝。', 'No, thank you. 是礼貌谢绝；分享要尊重对方意愿。', 'No, thank you.'],
      ['translate-request', 'Can I have some chocolate, please? 的意思是？', '请给我一些巧克力，好吗', ['请给我一些巧克力，好吗', '你喜欢巧克力吗', '巧克力在哪里'], 'Can I have some …? 是请求，不是询问喜好。', '这句是在礼貌请求一些巧克力。', 'Can I have some chocolate, please?'],
      ['translate-offer', 'Would you like some ice cream? 的意思是？', '你想来些冰激凌吗', ['你想来些冰激凌吗', '请给我一支铅笔', '你几岁了'], 'Would you like some …? 是给别人选择的邀请。', '这句是邀请对方吃一些冰激凌。', 'Would you like some ice cream?']
    ];
    const result = rowQuestions(topic, rows);
    [
      ['request', '请求一些水', ['请求一些水', '邀请别人吃蛋糕', '询问年龄'], 'Can I have some water, please?'],
      ['offer', '邀请别人吃些面包', ['邀请别人吃些面包', '请求一支铅笔', '说自己不喜欢面包'], 'Would you like some bread?'],
      ['accept', '礼貌接受邀请', ['礼貌接受邀请', '礼貌谢绝邀请', '询问物品在哪里'], 'Yes, please.'],
      ['decline', '礼貌谢绝邀请', ['礼貌谢绝邀请', '礼貌接受邀请', '说食物在桌上'], 'No, thank you.']
    ].forEach(row => result.push(listening(`${topic}-listen-${row[0]}`, topic, row[1], row[2], row[3], `${row[3]} 在这个食物情境里表示${row[1]}。`)));
    return result;
  }

  function phonicsBank() {
    const topic = 'unit4-phonics';
    const result = phonicsWords.flatMap(entry => [
      question(`${topic}-sound-${entry.word}`, topic, `看 ${entry.marked}，方括号里的 a 在这个词中对应哪个音？`, entry.sound, [entry.sound, entry.sound === '/æ/' ? '/eɪ/' : '/æ/', '/iː/'], '听完整示例词，再回想两张发音学习卡的分组。', `${entry.word}（${entry.chinese}）中标出的 a 对应 ${entry.sound}。${entry.word === 'salad' ? '这里仅指第一个 a，不把第二个 a 一起归类。' : '这里只归纳这个例词，不表示所有 a 都一样。'}`, { soundLetter: 'a', exampleWords: [entry.word], answerSpeech: entry.word }),
      question(`${topic}-word-${entry.word}`, topic, `哪个完整词是“${entry.chinese}”？本节标出的 a 对应 ${entry.sound}。`, entry.word, entry.sound === '/æ/' ? [entry.word, 'cake', 'paper'] : [entry.word, 'cat', 'bag'], '先找中文意思对应的完整词，再核对学习卡中的声音。', `${entry.word} 表示${entry.chinese}，标出的 a 在本节属于 ${entry.sound} 组。`, { soundLetter: 'a', exampleWords: [entry.word], answerSpeech: entry.word })
    ]);
    const rows = [
      ['salad-first', 's[a]lad 的方括号标出哪个 a？', '第一个 a', ['第一个 a', '第二个 a', '两个 a 都标出'], '从左到右找方括号，第二个 a 没有括号。', 's[a]lad 只标第一个 a，对应本节 /æ/；第二个 a 不是本题目标。', 'salad'],
      ['compare', '哪一对例词中，标出的 a 都对应 /eɪ/？', 'cake 和 paper', ['cake 和 paper', 'cat 和 bag', 'mango 和 salad 的第一个 a'], '回想 /eɪ/ 学习卡：cake、lemonade、paper。', 'cake 和 paper 中标出的 a 都属于本节 /eɪ/ 组。', 'cake. paper.'],
      ['short-pair', '哪一对例词中，标出的 a 都对应 /æ/？', 'cat 和 bag', ['cat 和 bag', 'cake 和 paper', 'lemonade 和 paper'], '回想短音组 cat、bag。', 'cat 和 bag 中的 a 对应本节 /æ/。', 'cat. bag.'],
      ['not-always', '学完这些例词，哪种说法正确？', 'a 在不同单词中可能有不同声音', ['a 在不同单词中可能有不同声音', '所有 a 都只能读字母名 A', 'salad 的两个 a 必须同音'], '比较 bag 和 cake，再想想 salad 的标记。', '本课给出 /æ/ 与 /eɪ/ 两组例词；不把字母名当成所有 a 的读音。', 'bag. cake.']
    ];
    return result.concat(rowQuestions(topic, rows));
  }

  function recipesBank() {
    const topic = 'unit4-recipes';
    const rows = [
      ['fruit-ingredients', '根据食谱，准备了哪三种水果？', '苹果、香蕉和葡萄', ['苹果、香蕉和葡萄', '芒果、橙子和柠檬', '苹果、豆和肉丸'], '看第一句列出的三个水果词。', 'We have got apples, bananas and grapes. 列出了三种水果。', 'We have got apples, bananas and grapes.'],
      ['juice', '根据食谱，拌水果时加入什么？', '果汁', ['果汁', '鸡肉', '巧克力'], '找 Then 开头一句里的 juice。', 'Then, add some juice and mix. 说加入果汁并拌一拌。', 'Then, add some juice and mix.'],
      ['bowl', '根据食谱，准备好的水果放进哪里？', '碗里', ['碗里', '书包里', '鞋子里'], '找 put 和 bowl 所在的一句。', 'Next, put the prepared fruit in a bowl. 说明水果放进碗里。', 'Next, put the prepared fruit in a bowl.'],
      ['first', '食谱中 First 指定先做哪一步？', '洗手', ['洗手', '分享成品', '加入果汁'], '找到 First 开头的整句，不只猜生活顺序。', 'First, wash your hands. 是本篇的第一步。', 'First, wash your hands.'],
      ['next', '按这篇食谱，洗手后的 Next 步骤是什么？', '把准备好的水果放进碗里', ['把准备好的水果放进碗里', '马上分享空碗', '先去喂动物'], '看紧接着 First 的 Next 句。', 'Next, put the prepared fruit in a bowl. 说明下一步放水果。', 'Next, put the prepared fruit in a bowl.'],
      ['then', '按这篇食谱，水果进碗后做什么？', '加入果汁并拌一拌', ['加入果汁并拌一拌', '把食物放进书包', '先拿走所有水果'], '找 Then 开头一句。', 'Then, add some juice and mix. 是水果放进碗之后的一步。', 'Then, add some juice and mix.'],
      ['last', '按这篇食谱，最后一步是什么？', '分享水果沙拉', ['分享水果沙拉', '把水果放入空碗', '洗手'], 'Last 表示最后，读它后面的动作。', 'Last, share the fruit salad. 明确写出最后分享成品。', 'Last, share the fruit salad.'],
      ['mix', '食谱里 mix 是什么意思？', '拌一拌', ['拌一拌', '打开书', '数窗户'], '查看小词典，mix 出现在加果汁之后。', 'mix 在这里表示把食材拌在一起。', 'Then, add some juice and mix.'],
      ['prepared', 'prepared fruit 指什么？', '已经准备好的水果', ['已经准备好的水果', '还没找到的椅子', '一张食谱图片'], '小词典直接解释 prepared fruit。', 'prepared fruit 是已经准备好的水果，本练习没有刀具步骤。', 'Next, put the prepared fruit in a bowl.'],
      ['ingredient-or-tool', '下列哪项是本食谱的食材，而不是容器？', 'grapes', ['grapes', 'bowl', 'basket'], '食材是会放进食物里的原料；碗和篮子是容器。', 'grapes 是葡萄；bowl 是碗，basket 是篮子。', 'grapes'],
      ['not-listed', '哪种食物没有在这篇水果沙拉食谱中列出？', 'meatballs', ['meatballs', 'apples', 'bananas'], '回到第一句，逐一核对列出的水果。', '食谱列出 apples、bananas、grapes 和 juice，没有 meatballs（肉丸）。', 'meatballs'],
      ['order', '按食谱，哪组步骤顺序正确？', '洗手 → 水果进碗 → 加果汁拌匀 → 分享', ['洗手 → 水果进碗 → 加果汁拌匀 → 分享', '分享 → 洗手 → 水果进碗 → 加果汁', '加果汁 → 分享 → 洗手 → 水果进碗'], '按 First、Next、Then、Last 四个顺序词对照。', '本篇四步按 First 洗手、Next 放水果、Then 加果汁拌匀、Last 分享排列。', 'First, wash your hands. Next, put the prepared fruit in a bowl. Then, add some juice and mix. Last, share the fruit salad.']
    ];
    const result = rowQuestions(topic, rows).map(entry => Object.assign(entry, { passage: recipe.passage, glossary: recipe.glossary }));
    result.push.apply(result, rowQuestions(topic, [
      ['recipe-meaning', 'recipe 是什么？', '食谱：说明食材和做法', ['食谱：说明食材和做法', '动物名称表', '每个人的年龄表'], '食谱帮助我们知道需要什么、怎样做。', 'recipe 表示食谱，通常介绍食材和制作方法。', 'recipe'],
      ['ingredients-meaning', 'ingredients 在食谱里指什么？', '食材', ['食材', '上课时间', '人物姓名'], '本课有 apples、bananas 等 ingredients。', 'ingredients 表示食材，也就是制作食物所需的原料。', 'ingredients'],
      ['first-word', '顺序词 First 在本课是什么意思？', '首先', ['首先', '最后', '从不'], '它通常带出本食谱的第一步。', 'First 是首先；Last 是最后。', 'First, wash your hands.'],
      ['last-word', '顺序词 Last 在本课是什么意思？', '最后', ['最后', '首先', '同时出生'], '本食谱最后分享水果沙拉。', 'Last 是最后，提示本篇步骤的结尾。', 'Last, share the fruit salad.'],
      ['culture-place', '原创说明：This pasta dish is from Italy. 这道意面来自哪里？', '意大利', ['意大利', '题目没有说', '每一个国家都一样'], '句子 from Italy 已明确地点；Italy 是意大利。', '这句只介绍这道意面来自意大利，不表示那里只有这一种食物。', 'This pasta dish is from Italy.'],
      ['culture-different', '不同地方有不同食物做法，怎样认识合适？', '了解不同做法，尊重不同饮食文化', ['了解不同做法，尊重不同饮食文化', '只允许所有人用同一做法', '因为食物不同就嘲笑别人'], '可以学习和比较信息，不用优劣评价不同人的饮食。', '了解食材和做法，尊重不同饮食文化，也尊重个人选择。', 'People make food in different ways.']
    ]));
    return result;
  }

  function readingBank() { return readings.flatMap(story => story.queries.map(row => question(`unit4-reading-${story.key}-${row[0]}`, 'unit4-reading', row[1], row[2], row[3], row[4], row[5], { passage: story.passage, glossary: story.glossary, answerSpeech: row[6] }))); }

  function strategiesBank() {
    const topic = 'unit4-strategies';
    const cases = [
      ['ask-food', ['Mia likes apples.', 'The apples are on the table.'], '问题 What food does Mia like? 应优先找哪类信息？', '食物', ['食物', '年龄', '颜色'], 'What food 问食物，不问几岁或颜色。', 'What food 明确询问食物，再找 Mia likes 后面的 apples。', 'What food does Mia like?'],
      ['ask-person', ['Ben has got the water.', 'The water is in a bottle.'], '问题 Who has got the water? 哪个答案切合问题？', 'Ben', ['Ben', 'on the table', 'blue'], 'Who 问谁，先排除地点和颜色。', 'Ben has got the water. 说明拿水的人是 Ben。', 'Ben has got the water.'],
      ['ask-place', ['The bread is in the basket.', 'Mia likes bread.'], '问题 Where is the bread? 哪个答案切合问题？', 'in the basket', ['in the basket', 'Mia', 'six'], 'Where 问地点，先排除人物和数字。', 'The bread is in the basket. 给出地点 in the basket。', 'The bread is in the basket.'],
      ['negative', ["Ben doesn't like cake.", 'He likes bananas.'], '根据两句原文，Ben 喜欢什么？', '香蕉', ['香蕉', '蛋糕', '原文说什么都不喜欢'], '别漏掉 doesn’t，第二句写出真正喜欢的食物。', '第一句是否定蛋糕，第二句 He likes bananas. 明确喜欢香蕉。', 'He likes bananas.'],
      ['check-prediction', ['Ava has got a bowl and some fruit.', 'She makes a fruit salad.'], '读完两句后，哪项有原文明确支持？', '她做了一份水果沙拉', ['她做了一份水果沙拉', '她在烤面包', '她在画小狗'], '第一句可先预测，第二句用于核对。', 'She makes a fruit salad. 明确说做水果沙拉；评分依据后文，不评分第一句的个人猜想。', 'She makes a fruit salad.'],
      ['not-enough', ['Ava has got a bowl and some fruit.'], '只读这一句，能确定 Ava 接下来一定做什么吗？', '不能确定，要继续读', ['不能确定，要继续读', '一定烤面包', '一定骑马'], '有物品还不能保证之后一定发生什么。', '原文只写有碗和水果，没有说明接下来的动作；先预测，再读后文核对。', 'Ava has got a bowl and some fruit.'],
      ['same-object', ['The juice is on the table.', 'The water is in the basket.'], '问题问 juice 在哪里，应选哪项？', '桌子上', ['桌子上', '篮子里', '原文没有地点'], '盯住 juice，不要把 water 的位置移过来。', 'The juice is on the table. 说明果汁在桌上；篮子里的是水。', 'The juice is on the table.'],
      ['not-like-offer', ['Nora says, "Do you like grapes?"', 'Eli says, "Yes, I do."'], '第一句是在做什么？', '询问喜好', ['询问喜好', '询问年龄', '询问葡萄位置'], 'Do you like …? 的关键词是 like，问的是喜欢吗。', 'Do you like grapes? 在问喜好，不是在问地点或年龄。', 'Do you like grapes?'],
      ['decline-clue', ['Lina says, "Would you like some cake?"', 'Owen says, "No, thank you."'], '哪条线索说明 Owen 谢绝邀请？', 'No, thank you.', ['No, thank you.', 'Would you like', 'cake'], 'No 是拒绝的关键，但整句仍然礼貌。', 'No, thank you. 明确表示礼貌谢绝；单独的 cake 不能说明接受还是谢绝。', 'No, thank you.'],
      ['ingredient-eliminate', ['Our recipe needs apples, bananas and juice.'], '找食材时，哪一项可以依据原文排除？', 'chair', ['chair', 'apples', 'juice'], '先看词义，再和列出的食材逐一核对；chair 是椅子。', 'chair 是椅子，不在这份食谱食材中；apples 和 juice 都明确列出。', 'Our recipe needs apples, bananas and juice.'],
      ['check-person', ['Mia likes mangoes.', 'Ben likes bread.'], '问题问 Mia 喜欢什么，怎样核对？', '回到 Mia 那一句找 mangoes', ['回到 Mia 那一句找 mangoes', '看到 bread 就选，不管人名', '按自己的喜好猜'], '同一个人名和同一个问题要对应起来。', 'Mia likes mangoes. 是与 Mia 对应的原句，不能拿 Ben 的喜好回答。', 'Mia likes mangoes.'],
      ['unknown-like', ['Ben has got a banana.'], '只根据这一句，能确定 Ben 喜欢香蕉吗？', '不能，拥有不等于喜欢', ['不能，拥有不等于喜欢', '能，有就一定喜欢', '能，有就一定不喜欢'], 'has got 表示有，like 才表示喜欢。', '原文只说有香蕉，没有说明喜好；不把猜测当成事实。', 'Ben has got a banana.']
    ];
    return cases.map(row => question(`${topic}-${row[0]}`, topic, row[2], row[3], row[4], row[5], row[6], { passage: row[1], glossary: [{ english: 'Who / Where / What food', chinese: '谁 / 在哪里 / 什么食物' }], answerSpeech: row[7] }));
  }

  function reviewBank() {
    const topic = 'review34-mixed';
    const rows = [
      ['animal-duck', '动物词 duck 表示什么？', '鸭', ['鸭', '山羊', '马'], '回想 Unit 3 的动物词卡。', 'duck 是鸭；多只用 ducks。', 'duck'],
      ['animal-sheep', '补出“两只绵羊”：two ___', 'sheep', ['sheep', 'sheeps', 'a sheep'], 'sheep 的单复数拼写相同。', 'two sheep 中 sheep 不加 s。', 'two sheep'],
      ['animal-donkey', '本题的动物“驴”用哪个词？', 'donkey', ['donkey', 'goat', 'cow'], '回想有 k 的这个动物词。', 'donkey 表示驴，goat 是山羊，cow 是奶牛。', 'donkey'],
      ['describe-order', '选出“一只小鸭”的词序。', 'a little duck', ['a little duck', 'a duck little', 'little a duck'], '形容词 little 放在动物名词 duck 前。', 'a little duck 的词序是冠词、形容词、名词。', 'a little duck'],
      ['describe-is', '玩具猫被设定为高兴，补句：It ___ happy.', 'is', ['is', 'are', 'have'], 'It 指一个，状态词 happy 前用 is。', 'It is happy. 描述玩具猫的设定心情。', 'It is happy.'],
      ['describe-are', '两只玩具鸭被设定为疲倦，补句：They ___ tired.', 'are', ['are', 'is', 'has'], 'They 指多个，用 are。', 'They are tired. 描述两只玩具鸭的设定状态。', 'They are tired.'],
      ['hasgot-yes', '图画设定：玩具驴有长耳朵。回答 Has it got long ears?，选哪句？', 'Yes, it has.', ['Yes, it has.', "No, it hasn't.", 'Yes, I do.'], '根据明确设定回答；Has 问句用 has。', '它有长耳朵，所以回答 Yes, it has.。', 'Has it got long ears? Yes, it has.'],
      ['hasgot-no', '图画设定：玩具猫没有翅膀。补句：It ___ got wings.', "hasn't", ["hasn't", 'has', 'is'], '没有用 hasn’t got。', 'It hasn’t got wings. 表示它没有翅膀。', "It hasn't got wings."],
      ['resource-milk', '在 Unit 3 的常见资源配对中，cows 对应什么？', 'milk', ['milk', 'honey', 'wool'], '回想奶牛与奶的配对。', 'Cows give us milk. 是奶牛与奶的常见配对，不表示只有奶牛能提供奶。', 'Cows give us milk.'],
      ['resource-wool', '在 Unit 3 的配对中，羊毛 wool 对应哪个动物词？', 'sheep', ['sheep', 'chickens', 'bees'], '绵羊与羊毛配对。', 'Sheep give us wool. 表示绵羊为我们提供羊毛。', 'Sheep give us wool.'],
      ['food-chicken', '在“some chicken for lunch”中，chicken 指什么？', '鸡肉', ['鸡肉', '一只活的鸡', '橙色'], '这里说明是午餐食物，some chicken 表示鸡肉。', 'chicken 既可以表示鸡，也可以表示鸡肉；本情境指午餐中的鸡肉。', 'some chicken for lunch'],
      ['food-orange', '在“an orange in the basket”中，orange 指什么？', '一个橙子', ['一个橙子', '橙色', '一头奶牛'], 'an orange 是一个可数的水果，这里在篮子里。', 'an orange 表示一个橙子；orange 也能在其他情境表示橙色。', 'an orange in the basket'],
      ['like-self', '补句“我喜欢葡萄”：I ___ grapes.', 'like', ['like', 'likes', 'does'], 'I 后用 like。', 'I like grapes. 表示我喜欢葡萄。', 'I like grapes.'],
      ['like-she', '补句“她喜欢水果”：She ___ fruit.', 'likes', ['likes', 'like', 'do'], 'She 后肯定句的 like 要加 s。', 'She likes fruit. 表示她喜欢水果。', 'She likes fruit.'],
      ['like-he-no', '补句“他不喜欢蛋糕”：He doesn’t ___ cake.', 'like', ['like', 'likes', 'liking'], 'doesn’t 后使用原形 like。', 'He doesn’t like cake. 不给 like 再加 s。', "He doesn't like cake."],
      ['like-answer', '原创人物露露不喜欢芒果。回答 Do you like mangoes?，选哪句？', "No, I don't.", ["No, I don't.", 'Yes, I do.', "No, it hasn't."], 'Do you like 问喜好，人物明确不喜欢。', '题干明确不喜欢，回答 No, I don’t.。', "Do you like mangoes? No, I don't."],
      ['request-water', '想请求一些水，选哪句？', 'Can I have some water, please?', ['Can I have some water, please?', 'Would you like some water?', 'Has it got wings?'], '请求自己想要的东西，用 Can I have …?。', 'Can I have some water, please? 是礼貌请求水。', 'Can I have some water, please?'],
      ['request-give', '朋友递给你食物时说 Here you are.，你可以怎样道谢？', 'Thank you.', ['Thank you.', 'How old are you?', 'It is tired.'], '收到帮助可以说谢谢。', 'Thank you. 是适合这里的道谢。', 'Thank you.'],
      ['invitation-yes', '角色明确愿意接受面包邀请，选哪句回应？', 'Yes, please.', ['Yes, please.', 'No, thank you.', 'No, I am not.'], '接受食物邀请时礼貌回答 Yes, please.。', '人物愿意接受，所以回答 Yes, please.；谢绝也是礼貌选择，但不符合本题设定。', 'Would you like some bread? Yes, please.'],
      ['invitation-no', '角色明确想谢绝果汁邀请，选哪句回应？', 'No, thank you.', ['No, thank you.', 'Yes, please.', 'Yes, I do.'], '不想接受邀请时，礼貌说 No, thank you.。', 'No, thank you. 是礼貌谢绝，选择应受到尊重。', 'Would you like some juice? No, thank you.'],
      ['phonics-ck', 'du[ck] 中标出的 ck 写出来有几个字母？', '2 个', ['2 个', '1 个', '3 个'], '分别数 c 和 k，不把字母数和声音数混在一起。', 'ck 写出来有两个字母，在 duck 中对应 /k/。', 'duck'],
      ['phonics-a', 'c[a]ke 中标出的 a 属于本课哪一组？', '/eɪ/', ['/eɪ/', '/æ/', '/iː/'], '回想 cake、lemonade、paper 这一组。', 'cake 中 a 对应本课 /eɪ/ 组；不表示所有 a 都一样。', 'cake'],
      ['recipe-last', '原创食谱明确写 Last, share the fruit salad.，最后做什么？', '分享水果沙拉', ['分享水果沙拉', '先洗手', '喂玩具小鸭'], 'Last 表示最后，share 是分享。', '原句明确要求最后分享水果沙拉，答案以这份食谱为准。', 'Last, share the fruit salad.'],
      ['care-choice', '朋友谢绝食物，农场动物需要照顾，哪种做法合适？', '尊重朋友选择，也友善照顾动物', ['尊重朋友选择，也友善照顾动物', '强迫朋友吃并追赶动物', '只尊重与自己口味一样的人'], '想想两个单元共同练习的友善与尊重。', '对朋友尊重意愿，对动物友善照顾；学习表达也学习倾听。', 'We listen to each other. Be kind to animals.']
    ];
    return rowQuestions(topic, rows);
  }

  const questions = {
    'unit4-food': foodBank(), 'unit4-likes': likesBank(), 'unit4-requests': requestsBank(),
    'unit4-phonics': phonicsBank(), 'unit4-recipes': recipesBank(), 'unit4-reading': readingBank(),
    'unit4-strategies': strategiesBank(), 'review34-mixed': reviewBank()
  };
  const picnic = {
    title: '组织我的小野餐',
    note: '这是虚拟野餐。选 3 种不同食物和一种饮料，邀请故事朋友；每次都能接受或礼貌谢绝。不填写姓名，不评价真实喜好，不自动评分。',
    foods: [
      { key: 'bread', english: 'bread', chinese: '面包', icon: '🍞' }, { key: 'banana', english: 'bananas', chinese: '香蕉', icon: '🍌' },
      { key: 'apple', english: 'apples', chinese: '苹果', icon: '🍎' }, { key: 'grape', english: 'grapes', chinese: '葡萄', icon: '🍇' },
      { key: 'burger', english: 'burgers', chinese: '汉堡包', icon: '🍔' }, { key: 'cake', english: 'cake', chinese: '蛋糕', icon: '🍰' },
      { key: 'chicken', english: 'chicken', chinese: '鸡肉', icon: '🍗' }, { key: 'salad', english: 'salad', chinese: '沙拉', icon: '🥗' }
    ],
    drinks: [{ key: 'water', english: 'water', chinese: '水', icon: '💧' }, { key: 'juice', english: 'juice', chinese: '果汁', icon: '🥤' }, { key: 'lemonade', english: 'lemonade', chinese: '柠檬水', icon: '🥤' }]
  };
  function picnicLines(selection) {
    if (!selection || typeof selection !== 'object' || !Array.isArray(selection.foods) || selection.foods.length !== 3) return [];
    const drink = picnic.drinks.find(entry => entry.key === selection.drink), seen = [], chosen = [];
    if (!drink) return [];
    for (let index = 0; index < selection.foods.length; index += 1) {
      const slot = selection.foods[index];
      if (!slot || typeof slot !== 'object' || (slot.reply !== 'yes' && slot.reply !== 'no') || seen.indexOf(slot.key) !== -1) return [];
      const entry = picnic.foods.find(food => food.key === slot.key);
      if (!entry) return [];
      seen.push(slot.key);
      chosen.push({ entry, reply: slot.reply });
    }
    const result = [];
    chosen.forEach(slot => {
      result.push({ english: `We have got some ${slot.entry.english}.`, chinese: `我们有一些${slot.entry.chinese}。` });
      result.push({ english: `Would you like some ${slot.entry.english}?`, chinese: `你想来些${slot.entry.chinese}吗？` });
      if (slot.reply === 'yes') {
        result.push({ english: 'Yes, please.', chinese: '好的，请给我一些。' });
        result.push({ english: 'Here you are.', chinese: '给你。' });
        result.push({ english: 'Thank you.', chinese: '谢谢你。' });
      } else result.push({ english: 'No, thank you.', chinese: '不了，谢谢。' });
    });
    result.push({ english: `Can I have some ${drink.english}, please?`, chinese: `请给我一些${drink.chinese}，好吗？` });
    result.push({ english: 'Here you are.', chinese: '给你。' });
    result.push({ english: 'Thank you.', chinese: '谢谢你。' });
    return result;
  }
  function picnicSentences(selection) { return picnicLines(selection).map(line => line.english); }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function lesson(topic) { return copy(lessons[topic] || []); }
  function bank(topic) { return copy(questions[topic] || []); }
  const api = { topics: copy(topics), reviewTopic: copy(reviewTopic), lesson, bank, picnic: copy(picnic), picnicSentences, picnicLines };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GardenUnit4 = api;
})(typeof window !== 'undefined' ? window : globalThis);
