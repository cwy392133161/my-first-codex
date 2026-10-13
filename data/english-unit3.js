/*
 * Unit 3 Fun on the farm：按用户提供的学习目标、学习重点照片整理。
 * 学习卡、题目、阅读和农场任务为本项目原创，不复制教材故事、插图或音视频。
 * 题目由固定词表和固定情境构成，不随机生成；新增编号不替换旧题号。
 * 外貌词用于理解语言，不用来评价真实的人或动物。
 */
(function (root) {
  'use strict';

  const topics = [
    { id: 'unit3-animals', subject: 'english', name: 'Unit 3 · 农场动物', icon: '🐄', description: '认识 10 个动物词，分清 chicken 和 sheep。', goal: '能理解并说出常见动物的英文名称。', focus: 'cat, chicken, cow, dog, donkey, duck, goat, horse, sheep, spider' },
    { id: 'unit3-describe', subject: 'english', name: 'Unit 3 · 描述和心情', icon: '😊', description: '认识 8 个形容词，练习 is、are 和词序。', goal: '能用 is/are + 形容词描述状态，用形容词 + 名词描述原创图画中的动物。', focus: 'angry, beautiful, funny, happy, little, sad, tired, ugly；It is happy. / They are little ducks.' },
    { id: 'unit3-hasgot', subject: 'english', name: 'Unit 3 · 动物有些什么', icon: '🐾', description: '用 has got 问答，分清“有”和“没有”。', goal: '能理解 has/hasn’t got，提出 Has it got …? 并作简短回答。', focus: "It has got long ears. / It hasn't got a long tail. / Has it got wings? Yes, it has. / No, it hasn't." },
    { id: 'unit3-phonics', subject: 'english', name: 'Unit 3 · c、k 和 ck', icon: '🔤', description: '听完整动物词，找出表示 /k/ 的拼写。', goal: '能将示例词中的 /k/ 音与 c、k、ck 拼写联系起来，不把字母名当作音素。', focus: 'c: cat, cow；k: donkey；ck: chicken, duck。chicken 开头的 ch 与中间的 ck 不同。' },
    { id: 'unit3-gifts', subject: 'english', name: 'Unit 3 · 动物与我们', icon: '🥛', description: '认识奶、蛋、羊毛、蜂蜜，学习照顾动物。', goal: '能配对动物与常见资源，理解人和动物互相依存，友善照顾动物。', focus: 'cows — milk；chickens — eggs；sheep — wool；bees — honey；Be kind to animals.' },
    { id: 'unit3-reading', subject: 'english', name: 'Unit 3 · 动物宝宝阅读', icon: '📖', description: '读 4 篇原创短文，比较宝宝的成长。', goal: '能从短文找到信息，理解鸡鸭宝宝从蛋孵出、羊牛宝宝从妈妈身体里出生；发现它们与人类宝宝都需要照顾。', focus: 'chick, duckling, lamb, calf；eggs、出生、成长和照顾。补充词均有中文小词典。' },
    { id: 'unit3-spelling', subject: 'english', name: 'Unit 3 · 动物词拼写', icon: '✏️', description: '数一数字母，再补出动物单词。', goal: '能辨认动物单词的字母数量和缺失拼写，将动物名称与完整词形联系起来。', focus: '10 个动物词的字母数量；固定缺字题；sheep 的单复数形式相同。' }
  ];

  const animals = [
    { key: 'cat', english: 'cat', plural: 'cats', chinese: '猫', icon: '🐈', hint: '它会喵喵叫。' },
    { key: 'chicken', english: 'chicken', plural: 'chickens', chinese: '鸡', icon: '🐔', hint: '它是农场里常见的鸟；本课说动物，不是鸡肉。' },
    { key: 'cow', english: 'cow', plural: 'cows', chinese: '奶牛', icon: '🐄', hint: '本课用它配对 milk（奶）。' },
    { key: 'dog', english: 'dog', plural: 'dogs', chinese: '狗', icon: '🐕', hint: '它会汪汪叫。' },
    { key: 'donkey', english: 'donkey', plural: 'donkeys', chinese: '驴', icon: '🫏', hint: '回想学习卡中“驴”的英文，词中有 k。' },
    { key: 'duck', english: 'duck', plural: 'ducks', chinese: '鸭', icon: '🦆', hint: '它会嘎嘎叫，常见鸭子喜欢游泳。' },
    { key: 'goat', english: 'goat', plural: 'goats', chinese: '山羊', icon: '🐐', hint: '本课用这个词表示山羊，和 sheep（绵羊）分开。' },
    { key: 'horse', english: 'horse', plural: 'horses', chinese: '马', icon: '🐎', hint: '回想学习卡中“马”的英文。' },
    { key: 'sheep', english: 'sheep', plural: 'sheep', chinese: '绵羊', icon: '🐑', hint: '本课用它配对 wool（羊毛）；多只时拼写也不变。' },
    { key: 'spider', english: 'spider', plural: 'spiders', chinese: '蜘蛛', icon: '🕷️', hint: '它有八条腿，会织网。' }
  ];

  const adjectives = [
    { key: 'angry', chinese: '生气的', model: 'The toy cat is angry.', translation: '故事里的玩具猫生气了。', hint: '想想“生气”的心情。' },
    { key: 'beautiful', chinese: '美丽的', model: 'This is a beautiful picture.', translation: '这是一幅美丽的图画。', hint: '这个词用来表示“美丽”。' },
    { key: 'funny', chinese: '滑稽的', model: 'The toy dog is funny.', translation: '故事里的玩具狗很滑稽。', hint: '它表示滑稽逗趣，不是生气或疲倦。' },
    { key: 'happy', chinese: '高兴的', model: 'The toy duck is happy.', translation: '故事里的玩具鸭很高兴。', hint: '想想“高兴”的心情。' },
    { key: 'little', chinese: '小的', model: 'They are little ducks.', translation: '它们是小鸭子。', hint: '这个词在本课形容大小，表示小的。' },
    { key: 'sad', chinese: '伤心的', model: 'The toy goat is sad.', translation: '故事里的玩具山羊很伤心。', hint: '想想难过、伤心时的心情。' },
    { key: 'tired', chinese: '疲倦的', model: 'The toy horse is tired.', translation: '故事里的玩具马很疲倦。', hint: '忙了一会儿，需要休息时可能有这种感觉。' },
    { key: 'ugly', chinese: '丑陋的', model: 'The story has an ugly toy.', translation: '故事里有一个被描述为丑陋的玩具。', hint: '这个词表示“丑陋”，这里仅学习词义。' }
  ];

  const phonicsWords = [
    { word: 'cat', group: 'c', marked: '[c]at', missing: '__at', chinese: '猫', position: '开头' },
    { word: 'cow', group: 'c', marked: '[c]ow', missing: '__ow', chinese: '奶牛', position: '开头' },
    { word: 'donkey', group: 'k', marked: 'don[k]ey', missing: 'don__ey', chinese: '驴', position: '中间' },
    { word: 'chicken', group: 'ck', marked: 'chi[ck]en', missing: 'chi__en', chinese: '鸡', position: '中间' },
    { word: 'duck', group: 'ck', marked: 'du[ck]', missing: 'du__', chinese: '鸭', position: '末尾' }
  ];

  const products = [
    { key: 'milk', chinese: '奶', animal: 'cow', animalPlural: 'cows', animalChinese: '奶牛', icon: '🐄', model: 'Cows give us milk.', translation: '奶牛为我们提供奶。' },
    { key: 'eggs', chinese: '蛋', animal: 'chicken', animalPlural: 'chickens', animalChinese: '鸡', icon: '🐔', model: 'Chickens give us eggs.', translation: '鸡为我们提供蛋。' },
    { key: 'wool', chinese: '羊毛', animal: 'sheep', animalPlural: 'sheep', animalChinese: '绵羊', icon: '🐑', model: 'Sheep give us wool.', translation: '绵羊为我们提供羊毛。' },
    { key: 'honey', chinese: '蜂蜜', animal: 'bee', animalPlural: 'bees', animalChinese: '蜜蜂', icon: '🐝', model: 'Bees give us honey.', translation: '蜜蜂为我们提供蜂蜜。' }
  ];

  const readings = [
    { key: 'chick', title: '鸡宝宝和蛋', passage: ['This is a chicken.', 'A baby chicken is a chick.', 'A chick comes out of an egg.', 'It needs care.'], translation: ['这是一只鸡。', '鸡宝宝叫 chick。', '小鸡从蛋里孵出来。', '它需要照顾。'], glossary: [{ english: 'baby', chinese: '宝宝；幼小的' }, { english: 'chick', chinese: '小鸡' }, { english: 'comes out of an egg', chinese: '从蛋里孵出来' }, { english: 'needs care', chinese: '需要照顾' }], queries: [
      ['name', '短文中，鸡宝宝叫什么？', 'chick', ['chick', 'lamb', 'calf'], '找 A baby chicken 开头的句子。', 'A baby chicken is a chick. 告诉我们鸡宝宝叫 chick。', 'A baby chicken is a chick.'],
      ['egg', '短文中，小鸡从哪里孵出来？', '蛋里', ['蛋里', '树叶里', '石头里'], '找含有 egg 的句子。', 'A chick comes out of an egg. 表示小鸡从蛋里孵出来。', 'A chick comes out of an egg.'],
      ['care', '短文最后说，小鸡需要什么？', '照顾', ['照顾', '一支铅笔', '一扇窗'], '最后一句中，care 是“照顾”。', 'It needs care. 说明小鸡需要照顾。', 'It needs care.']
    ] },
    { key: 'duckling', title: '鸭宝宝会成长', passage: ['A baby duck is a duckling.', 'A duckling comes out of an egg.', 'The duckling is little.', 'It grows.'], translation: ['鸭宝宝叫 duckling。', '小鸭从蛋里孵出来。', '这只鸭宝宝很小。', '它会成长。'], glossary: [{ english: 'duckling', chinese: '小鸭；鸭宝宝' }, { english: 'comes out of an egg', chinese: '从蛋里孵出来' }, { english: 'grows', chinese: '成长；长大' }], queries: [
      ['name', '短文中，鸭宝宝叫什么？', 'duckling', ['duckling', 'chick', 'lamb'], '看第一句 A baby duck。', 'A baby duck is a duckling. 说明鸭宝宝叫 duckling。', 'A baby duck is a duckling.'],
      ['egg', '根据短文，小鸭的出生方式是？', '从蛋里孵出来', ['从蛋里孵出来', '从书包里出来', '从石头里出来'], '找 duckling 和 egg 在一起的句子。', 'A duckling comes out of an egg. 说明小鸭从蛋里孵出来。', 'A duckling comes out of an egg.'],
      ['size', '短文用哪个词描述这只鸭宝宝的大小？', 'little', ['little', 'angry', 'tired'], '找 The duckling is 后面的词。', 'The duckling is little. 这里的 little 表示小的。', 'The duckling is little.']
    ] },
    { key: 'lamb', title: '绵羊宝宝', passage: ['A baby sheep is a lamb.', 'A lamb is born from its mother.', 'It does not come out of an egg.', 'The lamb grows.'], translation: ['绵羊宝宝叫 lamb。', '羊宝宝从妈妈身体里出生。', '它不是从蛋里孵出来的。', '羊宝宝会成长。'], glossary: [{ english: 'lamb', chinese: '羊宝宝；羔羊' }, { english: 'is born from its mother', chinese: '从妈妈身体里出生' }, { english: 'does not', chinese: '不；表示否定' }, { english: 'grows', chinese: '成长；长大' }], queries: [
      ['name', '短文中，绵羊宝宝叫什么？', 'lamb', ['lamb', 'chick', 'duckling'], '看 A baby sheep 后面的名称。', 'A baby sheep is a lamb. 说明绵羊宝宝叫 lamb。', 'A baby sheep is a lamb.'],
      ['born', '根据短文，羊宝宝怎样出生？', '从妈妈身体里出生', ['从妈妈身体里出生', '从蛋里孵出来', '从书本里出生'], '第二句明确告诉你出生方式。', 'A lamb is born from its mother. 表示羊宝宝从妈妈身体里出生。', 'A lamb is born from its mother.'],
      ['different', '根据短文，羊宝宝和前面的鸡宝宝有什么不同？', '羊宝宝不从蛋里孵出来', ['羊宝宝不从蛋里孵出来', '羊宝宝从蛋里孵出来', '羊宝宝不会成长'], '看 It does not 开头的句子；not 表示不。', 'It does not come out of an egg. 说明羊宝宝不是从蛋里孵出来的。', 'It does not come out of an egg.']
    ] },
    { key: 'calf-and-baby', title: '不同宝宝，都要照顾', passage: ['A baby cow is a calf.', 'A calf is born from its mother.', 'A human baby is born from a mother, too.', 'Calves and babies need care.'], translation: ['奶牛宝宝叫 calf。', '牛宝宝从妈妈身体里出生。', '人类宝宝也从妈妈身体里出生。', '牛宝宝和人类宝宝都需要照顾。'], glossary: [{ english: 'calf / calves', chinese: '牛宝宝；calves 是复数' }, { english: 'human baby', chinese: '人类宝宝' }, { english: 'is born from a mother', chinese: '从妈妈身体里出生' }, { english: 'too', chinese: '也' }, { english: 'need care', chinese: '需要照顾' }], queries: [
      ['name', '短文中，奶牛宝宝叫什么？', 'calf', ['calf', 'lamb', 'chick'], '看 A baby cow 后面的词。', 'A baby cow is a calf. 说明奶牛宝宝叫 calf。', 'A baby cow is a calf.'],
      ['same', '短文说牛宝宝和人类宝宝有什么共同点？', '都从妈妈身体里出生', ['都从妈妈身体里出生', '都从蛋里孵出来', '都不会成长'], '第二、三句说了出生方式；too 表示也。', '短文明确说明牛宝宝和人类宝宝都从妈妈身体里出生。', 'A human baby is born from a mother, too.'],
      ['care', '短文最后告诉我们什么？', '不同的宝宝都需要照顾', ['不同的宝宝都需要照顾', '宝宝不需要照顾', '只有牛宝宝需要照顾'], '最后一句中的 and 表示两类宝宝都包括在内。', 'Calves and babies need care. 说明不同的宝宝都需要照顾。', 'Calves and babies need care.']
    ] }
  ];

  function card(id, title, lines, sayPrompt, sayModel, extra) {
    return { id, title, lines, sayPrompt, sayModel, ...(extra || {}) };
  }
  function question(id, topic, prompt, answer, choices, hint, explanation, extra) {
    return { id, topic, prompt, answer, choices, hint, explanation, ...(extra || {}) };
  }
  function listening(id, topic, prompt, answer, choices, hint, explanation, speech, extra) {
    return question(id, topic, prompt, answer, choices, hint, explanation, { kind: 'listening', speech, fallbackPrompt: `文字提示：${speech}`, answerSpeech: speech, ...(extra || {}) });
  }
  function alternatives(items, index, field) {
    return [items[index][field], items[(index + 1) % items.length][field], items[(index + 3) % items.length][field]];
  }
  function animalVisual(entry, extra) {
    return { type: 'farm-animal', animal: entry.key, icon: entry.icon, count: 1, label: `动物示意：${entry.chinese}`, ...(extra || {}) };
  }

  const lessons = {
    'unit3-animals': animals.map(entry => card(`unit3-lesson-animals-${entry.key}`, `认识${entry.chinese}`, [{ english: entry.english, chinese: entry.chinese }, { english: `This is a ${entry.english}.`, chinese: `这是一只${entry.chinese}。` }], '看动物示意，听完整词，再说一遍。', `This is a ${entry.english}.`, { visual: animalVisual(entry), note: entry.key === 'chicken' ? '本课 chicken 是动物“鸡”，不是食物“鸡肉”。' : entry.key === 'sheep' ? '一只绵羊是 one sheep，多只绵羊是 two sheep；不加 s。' : '图标只是示意，动物名称以词卡和中文说明为准。' })),
    'unit3-describe': [
      ...adjectives.map(entry => card(`unit3-lesson-describe-${entry.key}`, `认识“${entry.chinese}”`, [{ english: entry.key, chinese: entry.chinese }, { english: entry.model, chinese: entry.translation }], '读词义，再跟读原创示例。可以指词，不要求表演心情。', entry.model, { note: entry.key === 'ugly' ? '只理解故事里描述玩具的词义，不用 ugly 评价真人、朋友或真实动物。' : '动物的心情在示例文字中明确给出，不只凭图标猜测。beautiful 和 ugly 都是描述性词汇，不能决定谁值得尊重。' })),
      card('unit3-lesson-describe-is', '一只：is + 形容词', [{ english: 'The toy cat is happy.', chinese: '故事里的玩具猫很高兴。' }, { english: 'It is happy.', chinese: '它很高兴。' }], '按文字中给出的心情，试着用 It is 说一句。', 'It is happy.', { visual: animalVisual(animals[0], { mood: 'happy', label: '原创玩具猫：文字设定它很高兴' }), note: 'It 是一个，接 is。心情是原创故事设定。' }),
      card('unit3-lesson-describe-are', '多只：are + 形容词', [{ english: 'The toy ducks are tired.', chinese: '故事里的玩具鸭们很疲倦。' }, { english: 'They are tired.', chinese: '它们很疲倦。' }], '按文字设定，试着用 They are 描述两只玩具鸭。', 'They are tired.', { visual: animalVisual(animals[5], { count: 2, mood: 'tired', label: '两只原创玩具鸭：文字设定它们很疲倦' }), note: 'They 是多个，接 are。' }),
      card('unit3-lesson-describe-order', '形容词放在名词前', [{ english: 'a little duck', chinese: '一只小鸭' }, { english: 'They are little ducks.', chinese: '它们是小鸭子。' }], '读一读 little duck，把描述词放在动物词前。', 'a little duck. They are little ducks.', { visual: animalVisual(animals[5], { count: 2, size: 'little', label: '示例图画：两只小鸭' }), note: 'little 在 duck 前面；多个用 ducks。' }),
      card('unit3-lesson-describe-not', '分清肯定和否定', [{ english: 'It is not a small dog.', chinese: '它不是一只小狗。' }, { english: 'They are not little ducks.', chinese: '它们不是小鸭子。' }], '留意 not，读出“不”的意思。', 'It is not a small dog. They are not little ducks.', { note: 'is not 可缩写成 isn’t；are not 可缩写成 aren’t。否定不等于说所有动物都不小。' })
    ],
    'unit3-hasgot': [
      card('unit3-lesson-hasgot-yes', '它有：has got', [{ english: 'It has got long ears.', chinese: '它有长耳朵。' }, { english: "It's got long ears.", chinese: '同样表示它有长耳朵。' }], '这是画上的虚构玩具驴，文字设定耳朵长；按设定描述。', 'It has got long ears.', { visual: animalVisual(animals[4], { label: '原创玩具驴：设定有长耳朵' }), note: 'It’s got 在这里是 It has got；It’s happy 里的 It’s 是 It is。不要混淆。' }),
      card('unit3-lesson-hasgot-not', '它没有：hasn’t got', [{ english: "It hasn't got a long tail.", chinese: '它没有长尾巴。' }], '同一只虚构玩具驴被设定为短尾巴，练说“没有长尾巴”。', "It hasn't got a long tail.", { note: 'hasn’t = has not。虚构玩具的设定不能当作每一种真实动物的特征。' }),
      card('unit3-lesson-hasgot-question', '问“它有吗”', [{ english: 'Has it got long ears?', chinese: '它有长耳朵吗？' }], '对设定有长耳朵的玩具驴提问。', 'Has it got long ears?', { note: '提问时 Has 放到 It 前面。' }),
      card('unit3-lesson-hasgot-answer-yes', '回答“有”', [{ english: 'Has it got long ears? Yes, it has.', chinese: '它有长耳朵吗？是的，它有。' }], '题干明确说玩具驴有长耳朵，先问再肯定回答。', 'Has it got long ears? Yes, it has.'),
      card('unit3-lesson-hasgot-answer-no', '回答“没有”', [{ english: "Has it got a long tail? No, it hasn't.", chinese: '它有长尾巴吗？不，它没有。' }], '题干明确说玩具驴没有长尾巴，先问再否定回答。', "Has it got a long tail? No, it hasn't."),
      card('unit3-lesson-hasgot-feet', '一只脚和多只脚', [{ english: 'one foot; two feet', chinese: '一只脚；两只脚' }, { english: "It hasn't got small feet.", chinese: '它没有小脚。' }], '虚构玩具鸭被设定为大脚，听 foot 和 feet，再读否定句。', "one foot. two feet. It hasn't got small feet.", { note: 'feet 是 foot 的复数；不写 foots。这个大小是玩具设定。' })
    ],
    'unit3-phonics': [
      card('unit3-lesson-phonics-c', 'c：cat、cow', [{ english: '[c]at, [c]ow', chinese: '猫、奶牛；c 在词首' }], '先听完整词，再找方括号中的 c。', 'cat, cow', { soundLetter: 'c', exampleWords: ['cat', 'cow'], note: '这些示例词中的 c 发 /k/。这里读完整单词，不读字母名 C；不是所有 c 都发 /k/。' }),
      card('unit3-lesson-phonics-k', 'k：donkey', [{ english: 'don[k]ey', chinese: '驴；k 在词中' }], '听完整 donkey，再找中间的 k。', 'donkey', { soundLetter: 'k', exampleWords: ['donkey'], note: 'donkey 中的 k 对应 /k/；不能把 donkey 说成 k 开头的单词。' }),
      card('unit3-lesson-phonics-ck', 'ck：chicken、duck', [{ english: 'chi[ck]en, du[ck]', chinese: '鸡、鸭；ck 是两个字母的组合' }], '听完整单词，再找 chicken 中间和 duck 末尾的 ck。', 'chicken, duck', { soundLetter: 'ck', exampleWords: ['chicken', 'duck'], note: 'ck 在这些词中表示 /k/。chicken 开头 ch 的声音 /tʃ/ 与中间 ck 不同，不把 ch 当成 ck。' }),
      card('unit3-lesson-phonics-together', '不同拼写，相同 /k/ 音', [{ english: 'cat, cow, donkey, chicken, duck', chinese: 'c、k、ck 在这些例词中对应 /k/' }], '听完整词，在纸上圈拼写；开口练说由孩子或家人自己完成。', 'cat, cow, donkey, chicken, duck', { note: '不做自动发音评分，不用字母名代替音素。示例限定在本课这些词。' })
    ],
    'unit3-gifts': [
      ...products.map(entry => card(`unit3-lesson-gifts-${entry.key}`, `${entry.animalChinese}和${entry.chinese}`, [{ english: entry.key, chinese: entry.chinese }, { english: entry.model, chinese: entry.translation }], '看词卡，把动物与这项常见资源连起来，再跟读示例。', entry.model, { visual: { type: 'farm-animal', animal: entry.animal, icon: entry.icon, count: 1, label: `资源配对：${entry.animalChinese}与${entry.chinese}` }, note: entry.key === 'honey' ? 'bee（蜜蜂）是本节补充动物词，bees 是复数；honey 表示蜂蜜。动物也需要我们保护。' : '这是本节的常见资源配对，不表示只有这一种动物能提供它，也不要求孩子取用动物产品。' })),
      card('unit3-lesson-gifts-care', '友善照顾动物', [{ english: 'Be kind to animals.', chinese: '友善地对待动物。' }, { english: 'Animals need food and water.', chinese: '动物需要食物和水。' }], '说说怎样友善照顾动物；观察也能完成任务。', 'Be kind to animals. Animals need food and water.', { note: '不追赶、不伤害动物；喂养和清洁由懂得照顾它们的大人安排，不独自喂陌生动物。' }),
      card('unit3-lesson-gifts-together', '人和动物互相依存', [{ english: 'Animals give us many things.', chinese: '动物为我们提供许多东西。' }, { english: 'We care for animals.', chinese: '我们照顾动物。' }], '把“动物帮助我们”和“我们照顾动物”连起来说。', 'Animals give us many things. We care for animals.', { note: '理解互相依存，尊重生命；不用“有用或没用”决定动物是否值得保护。' })
    ],
    'unit3-reading': readings.map(story => card(`unit3-lesson-reading-${story.key}`, story.title, story.passage.map((english, index) => ({ english, chinese: story.translation[index] })), '先读英文和小词典，再说出找到的一条信息；可以听、读或指句子。', story.passage.join(' '), { glossary: story.glossary, note: '原创阅读，围绕照片里的学习目标编写，不是教材原文或教材录音。比较出生和成长，不比较谁更好。' })),
    'unit3-spelling': [
      card('unit3-lesson-spelling-count', '数字母，每个只数一次', [{ english: 'cat', chinese: '字母是 c、a、t，一共 3 个' }, { english: 'sheep', chinese: '字母是 s、h、e、e、p，一共 5 个；两个 e 各数一次' }], '指着每个字母数一数；听按钮读完整单词，不把逐字母读法当作发音。', 'cat. sheep.', { note: '本节数的是书写字母：ck 算两个字母；字母数量和声音数量可能不同。' }),
      card('unit3-lesson-spelling-chicken', 'chicken 的 ch 和 ck', [{ english: 'chicken', chinese: '共 7 个字母；开头是 ch，中间是 ck；看拼写块：ch-i-ck-e-n' }], '看完整词，把开头 ch 和中间 ck 分开找。', 'chicken', { note: '拆块是看拼写的提示。朗读播放完整 chicken，不把这些块的字母名当作词音。' }),
      card('unit3-lesson-spelling-sheep', '多只绵羊也写 sheep', [{ english: 'one sheep; two sheep; three sheep', chinese: '一只、两只、三只绵羊；sheep 拼写不变' }], '看数量改变，读一读不变的 sheep。', 'one sheep. two sheep. three sheep.', { visual: animalVisual(animals[8], { count: 3, label: '三只绵羊：three sheep' }), note: '不写 sheeps。其他动物的复数要分别学习，如 chicken — chickens。' })
    ]
  };

  function animalsBank() {
    const topic = 'unit3-animals';
    return animals.flatMap((entry, index) => [
      question(`unit3-animals-meaning-${entry.key}`, topic, `“${entry.english}”在本课表示哪种动物？`, entry.chinese, alternatives(animals, index, 'chinese'), entry.hint, `${entry.english} 在这里表示${entry.chinese}。${entry.key === 'chicken' ? '这里是动物“鸡”，不是鸡肉。' : entry.key === 'sheep' ? 'sheep 的单复数形式相同。' : ''}`, { answerSpeech: entry.english }),
      question(`unit3-animals-word-${entry.key}`, topic, `看动物示意和文字“${entry.chinese}”，选出英文。`, entry.english, alternatives(animals, index, 'english'), entry.hint, `${entry.chinese}的英文是 ${entry.english}。图标只是示意，文字明确了动物种类。`, { visual: animalVisual(entry), answerSpeech: entry.english }),
      listening(`unit3-animals-listen-${entry.key}`, topic, '听动物词，选出意思。', entry.chinese, alternatives(animals, index, 'chinese'), '回想动物学习卡，也可以再听一次。', `${entry.english} 在本课表示${entry.chinese}。`, entry.english)
    ]);
  }

  function describeBank() {
    const topic = 'unit3-describe';
    const result = adjectives.flatMap((entry, index) => [
      question(`unit3-describe-meaning-${entry.key}`, topic, `单词 ${entry.key} 的意思是？`, entry.chinese, alternatives(adjectives, index, 'chinese'), entry.hint, `${entry.key} 表示${entry.chinese}。${entry.key === 'ugly' ? '这里只学习词义，不用它评价朋友或真实动物。' : ''}`, { answerSpeech: entry.key }),
      listening(`unit3-describe-listen-${entry.key}`, topic, '听形容词，选出意思。', entry.chinese, alternatives(adjectives, index, 'chinese'), '回想形容词卡的中文意思，不需要猜图里的心情。', `${entry.key} 表示${entry.chinese}。`, entry.key)
    ]);
    const rows = [
      ['is-happy', '原创故事设定：一只玩具猫很高兴。补句：It ___ happy.', 'is', ['is', 'are', 'am'], 'It 指一只，配 is。', 'It is happy. 表示它很高兴。', 'It is happy.'],
      ['are-tired', '原创故事设定：两只玩具鸭很疲倦。补句：They ___ tired.', 'are', ['are', 'is', 'am'], 'They 指多个，配 are。', 'They are tired. 表示它们很疲倦。', 'They are tired.'],
      ['singular-sad', '原创故事里一只玩具山羊很伤心，选哪句？', 'It is sad.', ['It is sad.', 'They are sad.', 'It is happy.'], '一只用 It；伤心对应 sad。', 'It is sad. 同时对应一只和伤心。', 'It is sad.'],
      ['plural-happy', '原创故事里三只玩具鸡很高兴，选哪句？', 'They are happy.', ['They are happy.', 'It is happy.', 'They are tired.'], '多只用 They；高兴对应 happy。', 'They are happy. 表示它们很高兴。', 'They are happy.'],
      ['order-little', '补出“一只小鸭”：a ___ duck', 'little', ['little', 'duck', 'ducks'], '描述词放在动物词前；小的对应 little。', 'a little duck 是一只小鸭，little 在 duck 前。', 'a little duck'],
      ['order-funny', '想说“一只滑稽的玩具狗”，选哪种词序？', 'a funny toy dog', ['a funny toy dog', 'a toy dog funny', 'a sad toy dog'], 'funny 是描述词，放在 toy dog 前面。', 'a funny toy dog 表示一只滑稽的玩具狗。', 'a funny toy dog'],
      ['order-plural', '想说“它们是小鸭子”，选哪句？', 'They are little ducks.', ['They are little ducks.', 'They are ducks little.', 'They are a little duck.'], 'little 在 ducks 前；They 对应多个。', 'They are little ducks. 使用形容词在名词前的词序，ducks 是复数。', 'They are little ducks.'],
      ['negative-is', 'It is not a small dog. 的意思是？', '它不是一只小狗', ['它不是一只小狗', '它是一只小狗', '它们是小狗'], 'not 表示不；It 指一个。', 'It is not a small dog. 表示它不是一只小狗。small 表示小的。', 'It is not a small dog.'],
      ['negative-are', 'They are not little ducks. 的意思是？', '它们不是小鸭子', ['它们不是小鸭子', '它们是小鸭子', '它是一只小鸭'], 'They 指多个；not 表示不。', 'They are not little ducks. 表示它们不是小鸭子。', 'They are not little ducks.'],
      ['respect', '学习 ugly 的词义时，哪种做法合适？', '理解词义，不用它嘲笑朋友', ['理解词义，不用它嘲笑朋友', '用这个词嘲笑朋友', '按外貌决定是否帮助朋友'], '每个人都值得尊重。', '词义学习与友善相伴，不用 ugly 评价或嘲笑真人、朋友和真实动物。', 'Be kind.']
    ];
    rows.forEach(row => result.push(question(`unit3-describe-language-${row[0]}`, topic, row[1], row[2], row[3], row[4], row[5], { answerSpeech: row[6] })));
    return result;
  }

  function hasGotBank() {
    const topic = 'unit3-hasgot';
    const rows = [
      ['complete-has', '描述一只画上的动物：It ___ got long ears.', 'has', ['has', 'have', 'are'], 'It 指一个，用 has got。', 'It has got long ears. 表示它有长耳朵。这只是图画设定。', 'It has got long ears.'],
      ['negative', '虚构玩具驴没有长尾巴，选哪句？', "It hasn't got a long tail.", ["It hasn't got a long tail.", 'It has got a long tail.', 'It has got long ears.'], '没有，用 hasn’t got；还要找尾巴。', 'It hasn’t got a long tail. 表示它没有长尾巴。', "It hasn't got a long tail."],
      ['ask', '想问“它有长耳朵吗”，选哪句？', 'Has it got long ears?', ['Has it got long ears?', 'It has got long ears.', 'How old are you?'], '询问它有没有，用 Has it got …?。', 'Has it got long ears? 是“它有长耳朵吗”。', 'Has it got long ears?'],
      ['yes', '文字设定：玩具鸭有翅膀。回答 Has it got wings?，选哪句？', 'Yes, it has.', ['Yes, it has.', "No, it hasn't.", 'Yes, it is.'], '题干明确说有；Has 提问用 has 回答。', '有翅膀，简短回答 Yes, it has.。', 'Has it got wings? Yes, it has.'],
      ['no', '文字设定：玩具驴没有翅膀。回答 Has it got wings?，选哪句？', "No, it hasn't.", ["No, it hasn't.", 'Yes, it has.', "No, it isn't."], '题干明确说没有；Has 提问用 hasn’t 回答。', '没有翅膀，简短回答 No, it hasn’t.。', "Has it got wings? No, it hasn't."],
      ['ask-order', '补一句提问：___ it got a tail?', 'Has', ['Has', 'Is', 'Are'], 'got 前面的有没有问句用 Has it。', 'Has it got a tail? 表示它有尾巴吗。', 'Has it got a tail?'],
      ['short-has', 'It’s got long ears. 中的 It’s got 完整写法是？', 'It has got', ['It has got', 'It is got', 'It have got'], 'got 提醒你：这里的 ’s 是 has。', 'It’s got = It has got。不要和 It’s happy. 中的 It is 混淆。', 'It has got long ears.'],
      ['short-not', 'hasn’t 的完整写法是？', 'has not', ['has not', 'have not', 'is not'], 'n’t 表示 not，前面是 has。', 'hasn’t = has not，用 hasn’t got 表达没有。', "It hasn't got a tail."],
      ['ears', '图画设定有两只长耳朵。补句：It has got long ___.', 'ears', ['ears', 'ear', 'an ear'], '两只耳朵用复数，单词末尾有 s。', '两只耳朵说 long ears；这里要用 ears。', 'It has got long ears.'],
      ['feet', '图画设定没有小脚。补句：It hasn’t got small ___.', 'feet', ['feet', 'foots', 'a foot'], '多只脚的特殊复数是 feet。', 'It hasn’t got small feet. 使用 foot 的复数 feet。', "It hasn't got small feet."],
      ['tail', '图画设定有一条长尾巴。补句：It has got ___ long tail.', 'a', ['a', 'two', 'three'], '一条尾巴是 a tail。', 'It has got a long tail. 表示它有一条长尾巴。', 'It has got a long tail.'],
      ['it-meaning', 'It has got blue eyes. 的意思是？', '它有蓝色眼睛', ['它有蓝色眼睛', '它没有蓝色眼睛', '它们有长耳朵'], 'has got 表示有；blue eyes 表示蓝色眼睛。', 'It has got blue eyes. 表示它有蓝色眼睛，这是虚构玩具的设定。', 'It has got blue eyes.'],
      ['no-meaning', 'It hasn’t got long ears. 的意思是？', '它没有长耳朵', ['它没有长耳朵', '它有长耳朵', '它有短尾巴'], 'hasn’t got 表示没有，ears 是耳朵。', 'It hasn’t got long ears. 表示它没有长耳朵。', "It hasn't got long ears."],
      ['has-versus-is', '想表达“它很高兴”，补句：It ___ happy.', 'is', ['is', 'has got', 'have got'], 'happy 是形容词，前面用 is；不是一件“拥有”的东西。', 'It is happy. 描述状态；It has got a tail. 描述有某个特征。', 'It is happy.']
    ];
    const result = rows.map(row => question(`unit3-hasgot-language-${row[0]}`, topic, row[1], row[2], row[3], row[4], row[5], { answerSpeech: row[6] }));
    [
      { key: 'ears', speech: 'It has got long ears.', answer: '它有长耳朵', choices: ['它有长耳朵', '它没有长耳朵', '它有长尾巴'] },
      { key: 'no-tail', speech: "It hasn't got a long tail.", answer: '它没有长尾巴', choices: ['它没有长尾巴', '它有长尾巴', '它没有长耳朵'] },
      { key: 'yes', speech: 'Has it got wings? Yes, it has.', answer: '问有没有翅膀，回答有', choices: ['问有没有翅膀，回答有', '问有没有翅膀，回答没有', '问动物年龄'] },
      { key: 'no', speech: "Has it got a tail? No, it hasn't.", answer: '问有没有尾巴，回答没有', choices: ['问有没有尾巴，回答没有', '问有没有尾巴，回答有', '问有没有长耳朵，回答有'] }
    ].forEach(row => result.push(listening(`unit3-hasgot-listen-${row.key}`, topic, '听一句问答或描述，选出意思。', row.answer, row.choices, '注意身体词，也听清 has got、hasn’t got 或 Yes、No。', `${row.speech} 的意思是“${row.answer}”。`, row.speech)));
    return result;
  }

  function phonicsBank() {
    const topic = 'unit3-phonics';
    const result = phonicsWords.flatMap(entry => [
      question(`unit3-phonics-group-${entry.word}`, topic, `看 ${entry.marked}，方括号中的拼写是什么？`, entry.group, [entry.group, ...['c', 'k', 'ck'].filter(group => group !== entry.group)], '只看方括号中标出的字母；两个字母的组合也可以表示一个音。', `${entry.word} ${entry.position}标出的 ${entry.group} 在这里对应 /k/。听完整词，不把字母名当音素。`, { soundLetter: entry.group, exampleWords: [entry.word], answerSpeech: entry.word }),
      question(`unit3-phonics-complete-${entry.word}`, topic, `补出“${entry.chinese}”的英文：${entry.missing}`, entry.group, [entry.group, ...['c', 'k', 'ck'].filter(group => group !== entry.group)], '回想完整词的标准拼写，不只看是否发出相似声音。', `补上 ${entry.group} 得到 ${entry.word}。这些题检查固定词的拼写。`, { soundLetter: entry.group, exampleWords: [entry.word], answerSpeech: entry.word }),
      listening(`unit3-phonics-listen-${entry.word}`, topic, '听完整示例词，选出本课标出的 /k/ 拼写组。', entry.group, [entry.group, ...['c', 'k', 'ck'].filter(group => group !== entry.group)], '先辨认整个词，再回想学习卡中标出的拼写。相同 /k/ 音可以有不同拼写。', `${entry.word} 是本课的 ${entry.group} 组示例。${entry.word === 'chicken' ? '这里看中间 ck，开头 ch 不是这个音。' : ''}`, entry.word, { soundLetter: entry.group, exampleWords: [entry.word] })
    ]);
    result.push(question('unit3-phonics-chicken-parts', topic, 'chicken 中表示本课 /k/ 音的字母组合是？', 'ck', ['ck', 'ch', 'sh'], '找 chi[ck]en 中间标出的组合，不是开头。', 'chicken 中间的 ck 表示 /k/，开头 ch 表示 /tʃ/。', { soundLetter: 'ck', exampleWords: ['chicken'], answerSpeech: 'chicken' }));
    result.push(question('unit3-phonics-donkey-position', topic, 'don[k]ey 中的 k 在哪里？', '单词中间', ['单词中间', '单词开头', '单词末尾'], '看看 k 前后是不是都有字母。', 'donkey 的 k 在中间；这个词并不是 k 开头。', { soundLetter: 'k', exampleWords: ['donkey'], answerSpeech: 'donkey' }));
    result.push(question('unit3-phonics-duck-letter-count', topic, 'duck 末尾的 ck 写出来有几个字母？', '2 个', ['2 个', '1 个', '3 个'], '分别数 c 和 k，两者组成 ck。', 'ck 写出来有 c、k 两个字母，在这个词中对应 /k/ 音。字母数和声音数可以不同。', { soundLetter: 'ck', exampleWords: ['duck'], answerSpeech: 'duck' }));
    return result;
  }

  function giftsBank() {
    const topic = 'unit3-gifts';
    const result = products.flatMap((entry, index) => [
      question(`unit3-gifts-match-${entry.key}`, topic, `在本课配对中，${entry.animalChinese}对应哪种资源？`, entry.key, alternatives(products, index, 'key'), '回想“动物与我们”学习卡的固定资源配对。', `${entry.model} ${entry.translation}这是本课的常见配对，不表示只有这一类动物能提供它。`, { glossary: entry.key === 'honey' ? [{ english: 'bee / bees', chinese: '蜜蜂；bees 是复数' }] : [], answerSpeech: entry.model }),
      question(`unit3-gifts-word-${entry.key}`, topic, `资源词 ${entry.key} 的意思是？`, entry.chinese, alternatives(products, index, 'chinese'), '回想资源词卡，不用猜动物图。', `${entry.key} 表示${entry.chinese}。`, { answerSpeech: entry.key }),
      listening(`unit3-gifts-listen-${entry.key}`, topic, '听资源配对句，选出它的意思。', entry.translation, alternatives(products, index, 'translation'), '先听动物词，再听句末资源词。', `${entry.model} 的意思是“${entry.translation}”。`, entry.model)
    ]);
    result.push(question('unit3-gifts-care-kind', topic, '观察农场动物时，哪种做法友善？', '安静观察，不追赶或伤害动物', ['安静观察，不追赶或伤害动物', '追着动物吓它们', '用石头扔动物'], '尊重生命，让动物安心。', '友善地对待动物；不追赶、不伤害，不独自喂陌生动物。', { answerSpeech: 'Be kind to animals.' }));
    result.push(question('unit3-gifts-care-depend', topic, '哪句话体现了人与动物互相依存？', '动物提供资源，我们也照顾动物', ['动物提供资源，我们也照顾动物', '动物不需要食物或水', '只有提供产品的动物才值得保护'], '想想动物对我们有帮助，而我们也有照顾和保护的责任。', '动物提供许多资源，人类也应照顾和保护动物；不同动物都值得尊重。', { answerSpeech: 'Animals give us many things. We care for animals.' }));
    return result;
  }

  function readingBank() {
    const topic = 'unit3-reading';
    return readings.flatMap(story => story.queries.map(row => question(`unit3-reading-${story.key}-${row[0]}`, topic, row[1], row[2], row[3], row[4], row[5], { passage: story.passage, glossary: story.glossary, answerSpeech: row[6] })));
  }

  const spellingChunks = [
    { word: 'cat', missing: 'c_t', answer: 'a' }, { word: 'chicken', missing: 'chi__en', answer: 'ck' },
    { word: 'cow', missing: 'c_w', answer: 'o' }, { word: 'dog', missing: 'd_g', answer: 'o' },
    { word: 'donkey', missing: 'don__y', answer: 'ke' }, { word: 'duck', missing: 'du__', answer: 'ck' },
    { word: 'goat', missing: 'g__t', answer: 'oa' }, { word: 'horse', missing: 'ho__e', answer: 'rs' },
    { word: 'sheep', missing: 'sh__p', answer: 'ee' }, { word: 'spider', missing: 'spi__r', answer: 'de' }
  ];
  function spellingBank() {
    const topic = 'unit3-spelling';
    const result = animals.map(entry => question(`unit3-spelling-count-${entry.key}`, topic, `单词 ${entry.english} 有几个字母？`, `${entry.english.length} 个`, [`${entry.english.length} 个`, `${entry.english.length - 1} 个`, `${entry.english.length + 1} 个`], '从左到右，每个书写字母只数一次；相同字母也分别数。', `${entry.english} 的字母是 ${entry.english.split('').join('、')}，一共 ${entry.english.length} 个。数的是字母，不是声音。`, { answerSpeech: entry.english }));
    spellingChunks.forEach((row, index) => {
      const entry = animals[index], other = ['a', 'o', 'ck', 'ke', 'oa', 'rs', 'ee', 'de'].filter(chunk => chunk !== row.answer).slice(0, 2);
      result.push(question(`unit3-spelling-complete-${entry.key}`, topic, `补出“${entry.chinese}”的英文：${row.missing}`, row.answer, [row.answer, ...other], '想想这个动物的完整词，空白可以填一个字母或固定字母组合。', `补上 ${row.answer}，完整单词是 ${row.word}（${entry.chinese}）。`, { answerSpeech: row.word }));
    });
    result.push(question('unit3-spelling-plural-sheep', topic, '补出“两只绵羊”：two ___', 'sheep', ['sheep', 'sheeps', 'a sheep'], 'sheep 的单数和复数拼写一样。', 'two sheep 表示两只绵羊，不写 sheeps。', { visual: animalVisual(animals[8], { count: 2, label: '两只绵羊' }), answerSpeech: 'two sheep' }));
    result.push(question('unit3-spelling-plural-chicken', topic, '补出“三只鸡”：three ___', 'chickens', ['chickens', 'chicken', 'a chicken'], '这里是三只动物，要用复数。', 'three chickens 表示三只鸡，chicken 在这里加 s。', { answerSpeech: 'three chickens' }));
    return result;
  }

  const questions = {
    'unit3-animals': animalsBank(), 'unit3-describe': describeBank(), 'unit3-hasgot': hasGotBank(),
    'unit3-phonics': phonicsBank(), 'unit3-gifts': giftsBank(), 'unit3-reading': readingBank(),
    'unit3-spelling': spellingBank()
  };

  const farm = {
    title: '创建我的小农场',
    animals: ['cow', 'sheep', 'chicken', 'duck', 'donkey', 'goat'].map(key => {
      const entry = animals.find(animal => animal.key === key), product = products.find(item => item.animal === key);
      const wings = key === 'chicken' || key === 'duck';
      return {
        key, english: entry.english, plural: entry.plural, chinese: entry.chinese, icon: entry.icon,
        traitSentence: wings ? 'It has got wings.' : 'It has got a tail.',
        traitChinese: wings ? '它有翅膀。' : '它有尾巴。',
        ...(product ? { product: product.key, productChinese: product.chinese, productSentence: product.model } : {})
      };
    }),
    counts: [1, 2, 3],
    descriptions: [{ key: 'small', english: 'small', chinese: '小的' }, { key: 'big', english: 'big', chinese: '大的' }, { key: 'happy', english: 'happy', chinese: '高兴的' }],
    care: { key: 'kind', english: 'We are kind to animals.', chinese: '我们友善地对待动物。' },
    note: '这是原创图画农场，大小和心情是孩子给图画的设定。介绍动物后说出一条照顾它们的规则；不填写姓名，不自动评分。'
  };

  function farmSentences(selection) {
    if (!selection || typeof selection !== 'object' || !Array.isArray(selection.animals)) return [];
    const result = [], numbers = { 1: 'one', 2: 'two', 3: 'three' };
    selection.animals.slice(0, 3).forEach(slot => {
      if (!slot || typeof slot !== 'object') return;
      const animal = farm.animals.find(entry => entry.key === slot.key), description = farm.descriptions.find(entry => entry.key === slot.description);
      if (!animal || !description || !Number.isInteger(slot.count) || !farm.counts.includes(slot.count)) return;
      const singular = slot.count === 1;
      result.push(`Our farm has got ${numbers[slot.count]} ${singular ? animal.english : animal.plural}.`);
      result.push(`${singular ? 'It is' : 'They are'} ${description.english}.`);
      result.push(singular ? animal.traitSentence : animal.traitSentence === 'It has got wings.' ? 'They have got wings.' : 'They have got tails.');
      if (animal.productSentence) result.push(animal.productSentence);
    });
    if (result.length && selection.care === farm.care.key) result.push(farm.care.english);
    return result;
  }

  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function lesson(topic) { return copy(lessons[topic] || []); }
  function bank(topic) { return copy(questions[topic] || []); }
  const api = { topics: copy(topics), lesson, bank, farm: copy(farm), farmSentences };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GardenUnit3 = api;
})(typeof window !== 'undefined' ? window : globalThis);
