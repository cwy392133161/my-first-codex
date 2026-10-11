/*
 * Unit 1 Our new school：按用户提供的学习目标、学习重点照片整理。
 * 20 个重点校园词、位置、单复数、p/b、校园阅读和友善规则分别练习。
 * 学习卡、题目、阅读情境与海报由本项目原创，不复制教材故事或音视频。
 * 编号固定，题库独立保存；不修改已发布的词条、学习卡或练习编号。
 */
(function (root) {
  'use strict';

  const topics = [
    { id: 'unit1-school', subject: 'english', name: 'Unit 1 · 校园物品', icon: '🎒', description: '认识学校、教室里的 20 个重点词。', goal: '能理解并说出学校、家具和学习用品的英文。', focus: 'bag, book, chair, classroom, crayon, desk, pen, pencil, pencil case, rubber, teacher, board, bookcase, cupboard, door, paper, playground, ruler, wall, window' },
    { id: 'unit1-position', subject: 'english', name: 'Unit 1 · 物品在哪里', icon: '📍', description: '看位置图，用 Where 问答。', goal: '能询问物品在哪里，用 on、in、under、next to 描述位置。', focus: "Where's the …? / It's on, in, under, next to the …" },
    { id: 'unit1-plurals', subject: 'english', name: 'Unit 1 · 一个和多个', icon: '📚', description: '分清 this、these，练习单复数问答。', goal: '能用 What’s this? / What are these? 提问，并用 It’s a … / They’re … 回答。', focus: "What's this? It's a book. / What are these? They're books." },
    { id: 'unit1-phonics', subject: 'english', name: 'Unit 1 · p 和 b', icon: '🔤', description: '听示例词，认识 p、b 开头的词。', goal: '能辨认 p、b 的词首音和拼写，并跟着示例词练说。', focus: 'p: pen, pencil / b: bag, book, boy' },
    { id: 'unit1-reading', subject: 'english', name: 'Unit 1 · 校园小阅读', icon: '📖', description: '读原创小故事，找出人物、物品和位置。', goal: '能从简短校园阅读中找到正确的信息。', focus: '读关键词，找人物、数量、位置和合作行为。' },
    { id: 'unit1-kindness', subject: 'english', name: 'Unit 1 · 友善和规则', icon: '🤝', description: '学习帮助、倾听、分享、合作和道谢。', goal: '能理解友善行为，练说校园规则，知道整理学习用品。', focus: 'Help. / Listen. / Share. / Work together. / Thank you.' }
  ];

  const schoolWords = [
    { key: 'bag', english: 'bag', chinese: '包；书包', sentence: 'This is my bag.', chineseSentence: '这是我的书包。', hint: '上学时，可以用它把书和文具带走。' },
    { key: 'book', english: 'book', chinese: '书', sentence: 'This is a book.', chineseSentence: '这是一本书。', hint: '翻开它，可以读文字、看图画。' },
    { key: 'chair', english: 'chair', chinese: '椅子', sentence: 'This is a chair.', chineseSentence: '这是一把椅子。', hint: '想想上课时坐的家具。' },
    { key: 'classroom', english: 'classroom', chinese: '教室', sentence: 'This is our classroom.', chineseSentence: '这是我们的教室。', hint: '这是同学们一起上课的房间。' },
    { key: 'crayon', english: 'crayon', chinese: '蜡笔', sentence: 'This is a crayon.', chineseSentence: '这是一支蜡笔。', hint: '它是能涂出颜色的画画工具。' },
    { key: 'desk', english: 'desk', chinese: '书桌', sentence: 'The book is on the desk.', chineseSentence: '书在书桌上。', hint: '学习时，可以在这件家具上放书、写字。' },
    { key: 'pen', english: 'pen', chinese: '墨水笔', sentence: 'This is a pen.', chineseSentence: '这是一支墨水笔。', hint: '这种笔用墨水写字。' },
    { key: 'pencil', english: 'pencil', chinese: '铅笔', sentence: 'This is a pencil.', chineseSentence: '这是一支铅笔。', hint: '它有笔芯，写错后能用橡皮擦。' },
    { key: 'pencil_case', english: 'pencil case', chinese: '笔袋', sentence: 'The pencil is in the pencil case.', chineseSentence: '铅笔在笔袋里。', hint: '它专门装铅笔、橡皮等小文具。' },
    { key: 'rubber', english: 'rubber', chinese: '橡皮', sentence: 'This is a rubber.', chineseSentence: '这是一块橡皮。', hint: '在英国英语里，用它擦掉铅笔写错的字。' },
    { key: 'teacher', english: 'teacher', chinese: '老师', sentence: 'This is our teacher.', chineseSentence: '这是我们的老师。', hint: '这是教我们知识的人。' },
    { key: 'board', english: 'board', chinese: '白板', sentence: 'This is a board.', chineseSentence: '这是一块白板。', hint: '老师可以在上面写字，然后擦掉。' },
    { key: 'bookcase', english: 'bookcase', chinese: '书架；书柜', sentence: 'The books are in the bookcase.', chineseSentence: '书在书柜里。', hint: '这是专门摆放书本的家具。' },
    { key: 'cupboard', english: 'cupboard', chinese: '柜子', sentence: 'This is a cupboard.', chineseSentence: '这是一个柜子。', hint: '打开柜门，可以把东西收进去。' },
    { key: 'door', english: 'door', chinese: '门', sentence: 'This is a door.', chineseSentence: '这是一扇门。', hint: '进出教室时，常要打开它。' },
    { key: 'paper', english: 'paper', chinese: '纸', sentence: 'This is paper.', chineseSentence: '这是纸。', hint: '写字和画画常常需要它。' },
    { key: 'playground', english: 'playground', chinese: '操场', sentence: 'This is our playground.', chineseSentence: '这是我们的操场。', hint: '课间可以去这个地方跑步、做游戏。' },
    { key: 'ruler', english: 'ruler', chinese: '尺子', sentence: 'This is a ruler.', chineseSentence: '这是一把尺子。', hint: '它能量长度，也能帮你画直线。' },
    { key: 'wall', english: 'wall', chinese: '墙', sentence: 'The board is on the wall.', chineseSentence: '白板在墙上。', hint: '它围住房间，可以在上面挂画。' },
    { key: 'window', english: 'window', chinese: '窗', sentence: 'This is a window.', chineseSentence: '这是一扇窗。', hint: '透过它，可以看到房间外面。' }
  ];

  const relations = [
    { id: 'on', english: 'on', chinese: '在……上面', hint: '物品有没有放在表面上，让表面托着它？', anchor: 'desk', object: 'book', title: '放在上面', sentence: 'The book is on the desk.', translation: '书在书桌上。' },
    { id: 'in', english: 'in', chinese: '在……里面', hint: '看看物品有没有装进容器的内部。', anchor: 'bag', object: 'pen', title: '装在里面', sentence: 'The pen is in the bag.', translation: '墨水笔在书包里。' },
    { id: 'under', english: 'under', chinese: '在……下面', hint: '看看物品是在家具上方，还是在家具的下方。', anchor: 'chair', object: 'crayon', title: '在下面', sentence: 'The crayon is under the chair.', translation: '蜡笔在椅子下面。' },
    { id: 'next to', english: 'next to', chinese: '紧挨着', hint: '看看两样东西是不是并排靠在一起。', anchor: 'pencil case', object: 'rubber', title: '紧挨着', sentence: 'The rubber is next to the pencil case.', translation: '橡皮紧挨着笔袋。' }
  ];

  const pluralWords = [
    { word: 'book', plural: 'books', chinese: '书', icon: '📕' },
    { word: 'window', plural: 'windows', chinese: '窗', icon: '🪟' },
    { word: 'chair', plural: 'chairs', chinese: '椅子', icon: '🪑' },
    { word: 'pencil', plural: 'pencils', chinese: '铅笔', icon: '✏️' },
    { word: 'crayon', plural: 'crayons', chinese: '蜡笔', icon: '🖍️' },
    { word: 'bookcase', plural: 'bookcases', chinese: '书柜', icon: '🗄️' }
  ];

  const phonicsWords = [
    { word: 'pen', letter: 'p', chinese: '墨水笔' },
    { word: 'pencil', letter: 'p', chinese: '铅笔' },
    { word: 'bag', letter: 'b', chinese: '包' },
    { word: 'book', letter: 'b', chinese: '书' },
    { word: 'boy', letter: 'b', chinese: '男孩' }
  ];

  const readings = [
    {
      key: 'tidy-room', title: '东西在哪里',
      passage: ['This is our classroom.', 'The book is on the desk.', 'The bag is under the chair.'],
      glossary: [{ english: 'our', chinese: '我们的' }],
      translation: ['这是我们的教室。', '书在书桌上。', '书包在椅子下面。'],
      queries: [
        { key: 'book', prompt: '读小故事：书在哪里？', answer: '在书桌上', choices: ['在书桌上', '在椅子下面', '在书包里'], hint: '找含有 book 的句子，注意后面的位置信息。', explanation: 'The book is on the desk. 说明书在书桌上。', speech: 'The book is on the desk.' },
        { key: 'bag', prompt: '读小故事：书包在哪里？', answer: '在椅子下面', choices: ['在椅子下面', '在书桌上', '紧挨着窗'], hint: '找含有 bag 的句子，再找它和什么家具在一起。', explanation: 'The bag is under the chair. 说明书包在椅子下面。', speech: 'The bag is under the chair.' },
        { key: 'place', prompt: '读小故事：这是一个什么地方？', answer: '教室', choices: ['教室', '操场', '厨房'], hint: '第一句会告诉你这是哪里。', explanation: 'This is our classroom. 说明这是我们的教室。', speech: 'This is our classroom.' }
      ]
    },
    {
      key: 'share-crayons', title: '一起用蜡笔',
      passage: ['Mia has two crayons.', 'The crayons are in her pencil case.', 'Mia shares her crayons with Ben.'],
      glossary: [{ english: 'has', chinese: '有' }, { english: 'her', chinese: '她的' }, { english: 'shares … with …', chinese: '和……分享……' }],
      translation: ['米娅有两支蜡笔。', '蜡笔在她的笔袋里。', '米娅和本分享她的蜡笔。'],
      queries: [
        { key: 'number', prompt: '读小故事：米娅有几支蜡笔？', answer: '2 支', choices: ['2 支', '1 支', '3 支'], hint: '找 crayons 前面的数字。', explanation: 'two crayons 是两支蜡笔。', speech: 'Mia has two crayons.' },
        { key: 'place', prompt: '读小故事：蜡笔装在哪里？', answer: '在笔袋里', choices: ['在笔袋里', '在椅子下面', '在书桌上'], hint: '找 The crayons 开头的句子。', explanation: 'The crayons are in her pencil case. 说明蜡笔在她的笔袋里。', speech: 'The crayons are in her pencil case.' },
        { key: 'kind', prompt: '读小故事：米娅做了哪件友善的事？', answer: '和本分享蜡笔', choices: ['和本分享蜡笔', '帮老师擦白板', '替同学捡书'], hint: '最后一句说了米娅和本做的事。', explanation: 'Mia shares her crayons with Ben. 说明米娅和本分享蜡笔。', speech: 'Mia shares her crayons with Ben.' }
      ]
    },
    {
      key: 'books-and-ruler', title: '书柜上的书',
      passage: ['This is a bookcase.', 'Three books are on it.', 'A ruler is next to the books.'],
      glossary: [{ english: 'it', chinese: '它；这里指书柜' }],
      translation: ['这是一个书柜。', '三本书在它上面。', '一把尺子紧挨着这些书。'],
      queries: [
        { key: 'furniture', prompt: '读小故事：第一句介绍了什么？', answer: '书柜', choices: ['书柜', '书桌', '椅子'], hint: '看第一句 a 后面的物品名称。', explanation: 'This is a bookcase. 介绍的是书柜。', speech: 'This is a bookcase.' },
        { key: 'number', prompt: '读小故事：书柜上有几本书？', answer: '3 本', choices: ['3 本', '1 本', '2 本'], hint: '找 books 前面的数字。', explanation: 'Three books 是三本书。', speech: 'Three books are on it.' },
        { key: 'ruler', prompt: '读小故事：尺子在哪里？', answer: '紧挨着书', choices: ['紧挨着书', '在书包里', '在椅子下面'], hint: '找含有 ruler 的句子，注意它和书的位置关系。', explanation: 'A ruler is next to the books. 说明尺子紧挨着这些书。', speech: 'A ruler is next to the books.' }
      ]
    },
    {
      key: 'listen-together', title: '一起听故事',
      passage: ['Leo is our teacher.', 'He reads a book.', 'We listen to him.', 'We work together.'],
      glossary: [{ english: 'reads', chinese: '读' }, { english: 'him', chinese: '他；这里指 Leo' }, { english: 'we', chinese: '我们' }],
      translation: ['里奥是我们的老师。', '他读一本书。', '我们倾听他。', '我们一起合作。'],
      queries: [
        { key: 'name', prompt: '读小故事：老师叫什么名字？', answer: 'Leo', choices: ['Leo', 'Mia', 'Ben'], hint: '找 teacher 所在的句子。', explanation: 'Leo is our teacher. 说明老师叫 Leo。', speech: 'Leo is our teacher.' },
        { key: 'teacher', prompt: '读小故事：老师在做什么？', answer: '读书', choices: ['读书', '画画', '跑步'], hint: 'He 指老师，找 He 开头的句子。', explanation: 'He reads a book. 说明老师在读书。', speech: 'He reads a book.' },
        { key: 'children', prompt: '读小故事：孩子们在怎样对待老师的讲读？', answer: '认真倾听', choices: ['认真倾听', '大声打断', '跑到操场'], hint: '找 We listen 开头的句子。', explanation: 'We listen to him. 说明孩子们在倾听老师。', speech: 'We listen to him.' }
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
    return [items[index][field], items[(index + 5) % items.length][field], items[(index + 11) % items.length][field]];
  }

  const lessons = {
    'unit1-school': schoolWords.map(entry => card(
      `unit1-lesson-school-${entry.key}`, `认识${entry.chinese}`,
      [{ english: entry.english, chinese: entry.chinese }, { english: entry.sentence, chinese: entry.chineseSentence }],
      '看看身边的学校用品，试着说出这个词；再听句子示范。', entry.sentence
    )),
    'unit1-position': relations.map(entry => card(
      `unit1-lesson-position-${entry.id.replace(/ /g, '-')}`, entry.title,
      [{ english: `Where's the ${entry.object}?`, chinese: '问：这个物品在哪里？' }, { english: `It's ${entry.english} the ${entry.anchor}.`, chinese: entry.translation.replace(/^(书|墨水笔|蜡笔|橡皮)/, '它') }, { english: entry.sentence, chinese: entry.translation }, ...(entry.id === 'under' ? [{ english: "It isn't on the chair.", chinese: '它不在椅子上。' }] : entry.id === 'in' ? [{ english: "It isn't next to the bag.", chinese: '它不在书包旁边。' }] : [])],
      '和家人轮流问“在哪里”，看位置图用 It’s 回答，也可以说出完整的物品名称。', `Where's the ${entry.object}? It's ${entry.english} the ${entry.anchor}.`,
      { visual: { type: 'position', relation: entry.id, object: entry.object, anchor: entry.anchor } }
    )),
    'unit1-plurals': pluralWords.map(entry => card(
      `unit1-lesson-plurals-${entry.word}`, `${entry.chinese}：一个和多个`,
      [{ english: `What's this? It's a ${entry.word}.`, chinese: `问一个：这是什么？它是${entry.chinese}。` }, { english: `What are these? They're ${entry.plural}.`, chinese: `问多个：这些是什么？它们是${entry.chinese}。` }],
      '先用一件物品练问答，再拿两件同样的物品练问答。', `What's this? It's a ${entry.word}. What are these? They're ${entry.plural}.`,
      { visual: { type: 'objects', word: entry.word, count: 2, icon: entry.icon, label: `两件${entry.chinese}` } }
    )),
    'unit1-phonics': [
      card('unit1-lesson-phonics-p', 'p 开头的词', [{ english: 'pen, pencil', chinese: '墨水笔、铅笔' }], '听示例词，把开头说得短一些，再读整个词。', 'pen, pencil', { soundLetter: 'p', exampleWords: ['pen', 'pencil'], note: 'p 的词首音：嘴唇先合拢，再轻轻放开，送出短短的气流；不要在后面拖长“呃”。这里听的是示例词，字母名 P 不是这个词首音。' }),
      card('unit1-lesson-phonics-b', 'b 开头的词', [{ english: 'bag, book, boy', chinese: '包、书、男孩' }], '听示例词，轻轻摸摸喉咙，感觉开头发声，再读整个词。', 'bag, book, boy', { soundLetter: 'b', exampleWords: ['bag', 'book', 'boy'], note: 'b 的词首音：嘴唇先合拢，再放开，喉咙有轻微振动；不要加上多余的元音。这里听的是示例词，字母名 B 不是这个词首音。' }),
      card('unit1-lesson-phonics-look', '看开头的字母', [{ english: 'pen → p; bag → b', chinese: 'pen 的第一个字母是 p，bag 的第一个字母是 b。' }], '先读整个词，再找开头的第一个字母。', 'pen, bag', { note: '先把“词怎么读”和“词怎么写”联系起来；不用把单独的字母名当作发音示范。' }),
      card('unit1-lesson-phonics-complete', '补上开头字母', [{ english: '_en → pen; _ook → book', chinese: '墨水笔：补 p；书：补 b。' }], '遮住第一个字母，想想词的开头，再补上。', 'pen, book', { note: '可以跟着读示例词；由孩子或家人自己练说，不做自动发音评分。' })
    ],
    'unit1-reading': readings.map(story => card(
      `unit1-lesson-reading-${story.key}`, `原创小阅读：${story.title}`,
      story.passage.map((english, index) => ({ english, chinese: story.translation[index] })),
      '先读一遍，找出物品和位置，再用一句英语说说你读到的内容。', story.passage.join(' '),
      { note: '这是学习小乐园原创的校园小故事，用来练习本单元重点。' }
    )),
    'unit1-kindness': [
      card('unit1-lesson-kindness-help', '帮助朋友', [{ english: 'Help your friends.', chinese: '帮助你的朋友。' }], '想想朋友遇到什么困难时，你可以帮忙。', 'Help your friends.'),
      card('unit1-lesson-kindness-listen', '认真倾听', [{ english: 'Listen to your teacher.', chinese: '认真听老师说话。' }], '家人说一句话，你先安静听完，再回应。', 'Listen to your teacher.'),
      card('unit1-lesson-kindness-share', '一起分享', [{ english: 'Share your crayons.', chinese: '分享你的蜡笔。' }, { english: 'Here you are. Thank you.', chinese: '给你。谢谢。' }], '假装把一支蜡笔递给家人，再轮流道谢。', 'Share your crayons. Here you are. Thank you.'),
      card('unit1-lesson-kindness-together', '大家合作', [{ english: 'Work together.', chinese: '一起合作。' }], '和家人一起整理两样学习用品，每个人都出一份力。', 'Work together.'),
      card('unit1-lesson-kindness-tidy', '整理好自己的物品', [{ english: 'Put your books in your bag.', chinese: '把书放进你的书包。' }], '整理书包，再用英语说出一条你愿意做到的校园规则。', 'Put your books in your bag.', { note: '可以把友善规则放进自己的教室海报。开口练说与做海报不计成绩。' })
    ]
  };

  function schoolBank() {
    const topic = 'unit1-school';
    return schoolWords.flatMap((entry, index) => [
      question(`unit1-school-word-${entry.key}`, topic, `“${entry.chinese}”用英语怎么说？`, entry.english,
        alternatives(schoolWords, index, 'english'), entry.hint, `${entry.english} 表示${entry.chinese}。例句：${entry.sentence}`,
        { answerSpeech: entry.sentence }),
      question(`unit1-school-listen-${entry.key}`, topic, '听一个校园词，选出它的意思。', entry.chinese,
        alternatives(schoolWords, index, 'chinese'), '可以再听一遍，回想这个词表示物品、人物，还是地方。', `${entry.english} 表示${entry.chinese}。`,
        { kind: 'listening', speech: entry.english, fallbackPrompt: `文字提示：${entry.english}`, answerSpeech: entry.english })
    ]);
  }

  function positionBank() {
    const topic = 'unit1-position';
    const result = [];
    const objects = ['book', 'pen', 'ruler'];
    relations.forEach((relation, index) => {
      objects.forEach(object => {
        const text = `The ${object} is ${relation.english} the ${relation.anchor}.`;
        const choices = [relation.english, relations[(index + 1) % 4].english, relations[(index + 2) % 4].english];
        result.push(question(
          `unit1-position-picture-${relation.id.replace(/ /g, '-')}-${object}`, topic,
          `看位置图，补句：The ${object} is ___ the ${relation.anchor}.`, relation.english, choices,
          relation.hint, `${relation.english} 表示${relation.chinese}。${text}`,
          { visual: { type: 'position', relation: relation.id, object, anchor: relation.anchor }, answerSpeech: `Where's the ${object}? It's ${relation.english} the ${relation.anchor}.` }
        ));
        result.push(question(
          `unit1-position-listen-${relation.id.replace(/ /g, '-')}-${object}`, topic,
          '听一句物品位置的话，选出位置关系。', relation.chinese,
          [relation.chinese, relations[(index + 1) % 4].chinese, relations[(index + 2) % 4].chinese],
          '留意 is 后面和 the 前面表示位置的词，可以再听一次。', `${text} 中的 ${relation.english} 表示${relation.chinese}。`,
          { kind: 'listening', speech: text, fallbackPrompt: `文字提示：${text}`, answerSpeech: text }
        ));
      });
    });
    return result;
  }

  function pluralBank() {
    const topic = 'unit1-plurals';
    const result = [];
    pluralWords.forEach(entry => [1, 2].forEach(count => {
      const singular = count === 1;
      const text = singular ? `It's a ${entry.word}.` : `They're ${entry.plural}.`;
      const visual = { type: 'objects', word: entry.word, count, icon: entry.icon, label: `${count} 件${entry.chinese}` };
      result.push(question(
        `unit1-plurals-answer-${entry.word}-${count}`, topic,
        `看物品图，回答：${singular ? "What's this?" : 'What are these?'}`, text,
        [text, singular ? `They're ${entry.plural}.` : `It's a ${entry.word}.`, singular ? `It's ${entry.plural}.` : `They're a ${entry.word}.`],
        '先数一数：只有一个，还是有多个？再选对应的问答。',
        singular ? `一个用 It's a ${entry.word}. 回答；${entry.word} 是单数。` : `多个用 They're ${entry.plural}. 回答；${entry.word} 的复数是 ${entry.plural}。`,
        { visual, answerSpeech: text }
      ));
      const ask = singular ? "What's this?" : 'What are these?';
      result.push(question(
        `unit1-plurals-ask-${entry.word}-${count}`, topic,
        `想问图中${singular ? '这个东西' : '这些东西'}是什么，应该说哪句？`, ask,
        [ask, singular ? 'What are these?' : "What's this?", `Where's the ${entry.word}?`],
        'this 指一个，these 指多个；这次是问“是什么”。',
        singular ? "问一个东西是什么，用 What's this?。Where 问的是在哪里。" : '问多个东西是什么，用 What are these?。Where 问的是在哪里。',
        { visual, answerSpeech: `${ask} ${text}` }
      ));
    }));
    return result;
  }

  function phonicsBank() {
    const topic = 'unit1-phonics';
    const result = phonicsWords.flatMap(entry => [
      question(`unit1-phonics-first-${entry.word}`, topic, `看单词 ${entry.word}，它的第一个字母是？`, entry.letter,
        [entry.letter, entry.letter === 'p' ? 'b' : 'p', 'd'], '从左边开始，找最前面的字母。', `${entry.word} 的第一个字母是 ${entry.letter}。听示例词，再跟着读。`,
        { soundLetter: entry.letter, exampleWords: [entry.word], answerSpeech: entry.word }),
      question(`unit1-phonics-spell-${entry.word}`, topic, `补出“${entry.chinese}”的英文开头：_${entry.word.slice(1)}`, entry.letter,
        [entry.letter, entry.letter === 'p' ? 'b' : 'p', 'd'], '先想想这个词怎么读，再想开头的字母。', `补上 ${entry.letter}，完整单词是 ${entry.word}（${entry.chinese}）。`,
        { soundLetter: entry.letter, exampleWords: [entry.word], answerSpeech: entry.word })
    ]);
    [['p', ['pen', 'pencil']], ['b', ['bag', 'book', 'boy']]].forEach(([letter, words]) => {
      const text = words.join(', ');
      result.push(question(`unit1-phonics-listen-${letter}`, topic, '听这几个示例词，选它们共同的开头字母。', letter,
        [letter, letter === 'p' ? 'b' : 'p', 'd'], '留意每个词最开始的声音，想想学过的开头字母。',
        `${words.join('、')} 都以 ${letter} 开头。这里朗读整个词，不把字母名当作词首音。`,
        { kind: 'listening', soundLetter: letter, exampleWords: words, speech: text, fallbackPrompt: `文字提示：${text}`, answerSpeech: text }));
    });
    return result;
  }

  function readingBank() {
    const topic = 'unit1-reading';
    return readings.flatMap(story => story.queries.map(row => question(
      `unit1-reading-${story.key}-${row.key}`, topic, row.prompt, row.answer, row.choices, row.hint, row.explanation,
      { passage: story.passage, glossary: story.glossary, answerSpeech: row.speech }
    )));
  }

  function kindnessBank() {
    const topic = 'unit1-kindness';
    const rows = [
      ['share', '朋友没有蜡笔，你愿意一起用，哪句最合适？', 'Share your crayons.', ['Share your crayons.', 'Close the door.', 'This is a chair.'], '想想怎样和朋友一起使用学习用品。', 'Share your crayons. 表示分享你的蜡笔。', 'Share your crayons.'],
      ['help', '朋友的书掉了一地，你帮忙捡起来，这是哪种行为？', 'Help.', ['Help.', 'Listen.', 'Read.'], '朋友遇到了困难，你伸出了援手。', 'Help. 表示帮助；帮朋友捡书是在帮助他。', 'Help your friends.'],
      ['listen', '老师正在讲解，哪条规则最合适？', 'Listen to your teacher.', ['Listen to your teacher.', 'Run in the classroom.', 'Shout at your friends.'], '先认真听别人说完，才能理解内容。', 'Listen to your teacher. 表示认真听老师说话。', 'Listen to your teacher.'],
      ['together', '几位同学一起画一张海报，每人完成一部分，这是？', 'Work together.', ['Work together.', 'Close the window.', 'Open your bag.'], '大家一起做同一件事，每个人都出一份力。', 'Work together. 表示一起合作。', 'Work together.'],
      ['thanks', '朋友帮你找到了尺子，你应该怎样道谢？', 'Thank you.', ['Thank you.', "Where's the ruler?", "What's this?"], '得到帮助后，用一句礼貌的话感谢对方。', 'Thank you. 表示谢谢。', 'Thank you.'],
      ['here-you-are', '朋友递给你一支蜡笔，说 Here you are.，你怎样礼貌回应？', 'Thank you.', ['Thank you.', 'These are windows.', 'This is a desk.'], '对方把东西递给你，可以感谢他。', 'Here you are. 表示给你；Thank you. 是合适的感谢。', 'Here you are. Thank you.'],
      ['are-you-ok', '朋友关心地问 Are you OK?，你没事并想感谢他，选哪句？', 'Yes, thank you.', ['Yes, thank you.', "It's a book.", "They're chairs."], '先回应自己的情况，再礼貌道谢。', 'Yes, thank you. 可以回答“是的，我没事，谢谢”。', 'Are you OK? Yes, thank you.'],
      ['tidy', '准备回家时，要把书收进书包，哪句表示这个规则？', 'Put your books in your bag.', ['Put your books in your bag.', 'Put your books under the chair.', 'Put your books next to the window.'], '收拾好自己的用品，出门时才能把它们带走。', 'Put your books in your bag. 表示把书放进你的书包。', 'Put your books in your bag.']
    ];
    const result = rows.map(row => question(`unit1-kindness-${row[0]}`, topic, row[1], row[2], row[3], row[4], row[5], { answerSpeech: row[6] }));
    [
      { key: 'share', speech: "Let's share the crayons.", answer: '一起分享蜡笔', choices: ['一起分享蜡笔', '一起关门', '一起找尺子'], explanation: 'share the crayons 表示分享蜡笔。' },
      { key: 'together', speech: "Let's work together.", answer: '一起合作', choices: ['一起合作', '只顾自己做', '大声打断别人'], explanation: 'work together 表示一起合作。' },
      { key: 'listen', speech: "Let's listen to our teacher.", answer: '一起听老师说话', choices: ['一起听老师说话', '一起跑到操场', '一起收起尺子'], explanation: 'listen to our teacher 表示听我们的老师说话。' },
      { key: 'help', speech: "Let's help our friends.", answer: '一起帮助朋友', choices: ['一起帮助朋友', '一起打开书', '一起画窗户'], explanation: 'help our friends 表示帮助我们的朋友。' }
    ].forEach(row => result.push(question(
      `unit1-kindness-listen-${row.key}`, topic, '听一句友善的话，选出它的意思。', row.answer, row.choices,
      '留意表达动作的词，可以再听一次。', row.explanation,
      { kind: 'listening', speech: row.speech, fallbackPrompt: `文字提示：${row.speech}`, answerSpeech: row.speech }
    )));
    return result;
  }

  const questions = {
    'unit1-school': schoolBank(),
    'unit1-position': positionBank(),
    'unit1-plurals': pluralBank(),
    'unit1-phonics': phonicsBank(),
    'unit1-reading': readingBank(),
    'unit1-kindness': kindnessBank()
  };

  const poster = {
    title: '我的教室海报',
    objects: [
      { key: 'book', label: '书', english: 'book', plural: 'books', icon: '📕', validInAnchors: ['bag'] },
      { key: 'pen', label: '墨水笔', english: 'pen', plural: 'pens', icon: '🖊️', validInAnchors: ['bag', 'pencil_case'] },
      { key: 'pencil', label: '铅笔', english: 'pencil', plural: 'pencils', icon: '✏️', validInAnchors: ['bag', 'pencil_case'] },
      { key: 'crayon', label: '蜡笔', english: 'crayon', plural: 'crayons', icon: '🖍️', validInAnchors: ['bag', 'pencil_case'] },
      { key: 'rubber', label: '橡皮', english: 'rubber', plural: 'rubbers', icon: '◻️', validInAnchors: ['bag', 'pencil_case'] },
      { key: 'ruler', label: '尺子', english: 'ruler', plural: 'rulers', icon: '📏', validInAnchors: ['bag', 'pencil_case'] }
    ],
    anchors: [
      { key: 'desk', english: 'desk', chinese: '书桌' },
      { key: 'chair', english: 'chair', chinese: '椅子' },
      { key: 'bag', english: 'bag', chinese: '书包' },
      { key: 'pencil_case', english: 'pencil case', chinese: '笔袋' }
    ],
    relations: [
      { id: 'on', english: 'on', chinese: '在……上面', anchors: ['desk', 'chair'] },
      { id: 'in', english: 'in', chinese: '在……里面', anchors: ['bag', 'pencil_case'] },
      { id: 'under', english: 'under', chinese: '在……下面', anchors: ['desk', 'chair'] },
      { id: 'next to', english: 'next to', chinese: '紧挨着', anchors: ['desk', 'chair', 'bag', 'pencil_case'] }
    ],
    rules: [
      { key: 'share', english: 'Share your crayons.', chinese: '分享你的蜡笔。' },
      { key: 'listen', english: 'Listen to your teacher.', chinese: '认真听老师说话。' },
      { key: 'help', english: 'Help your friends.', chinese: '帮助你的朋友。' },
      { key: 'together', english: 'Work together.', chinese: '一起合作。' },
      { key: 'tidy', english: 'Put your books in your bag.', chinese: '把书放进你的书包。' }
    ]
  };

  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function lesson(topic) { return copy(lessons[topic] || []); }
  function bank(topic) { return copy(questions[topic] || []); }

  const api = { topics, lesson, bank, poster };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GardenUnit1 = api;
})(typeof window !== 'undefined' ? window : globalThis);
