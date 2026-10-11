/*
 * Hello 学习目标：根据用户提供的学习目标、学习重点照片整理。
 * 学习卡和练习情境由本项目原创；角色姓名来自照片，不设定教材人物年龄。
 * 所有题目在这里独立保存，编号稳定，便于错题、记录和备份持续使用。
 */
(function (root) {
  'use strict';

  const topics = [
    {
      id: 'hello-greetings', subject: 'english', name: 'Hello · 打招呼', icon: '👋',
      description: '用 Hello 和 Hi 向朋友问好。',
      goal: '见到朋友，能用英语打招呼并回应。',
      focus: 'Hello! / Hi!'
    },
    {
      id: 'hello-numbers', subject: 'english', name: 'Hello · 数字 1–10', icon: '🔢',
      description: '看数字、数星星、听英语数字。',
      goal: '能理解并说出 one 到 ten，把英文和数量对应起来。',
      focus: 'one, two, three, four, five, six, seven, eight, nine, ten'
    },
    {
      id: 'hello-name-age', subject: 'english', name: 'Hello · 姓名与年龄', icon: '💬',
      description: '分清“你叫什么”和“你几岁了”。',
      goal: '能询问姓名、年龄，并用简单英语回答。',
      focus: "What's your name? / I'm … / How old are you? / I'm six."
    },
    {
      id: 'hello-colours', subject: 'english', name: 'Hello · 认识颜色', icon: '🎨',
      description: '看色块、听颜色，认识 11 种常见颜色。',
      goal: '能理解并说出常见颜色的英文名称。',
      focus: 'black, blue, brown, green, grey, orange, pink, purple, red, white, yellow'
    }
  ];

  const characters = [
    { id: 'jenny', name: 'Jenny', chinese: '珍妮', icon: '👧' },
    { id: 'jim', name: 'Jim', chinese: '吉姆', icon: '👦' },
    { id: 'cameron', name: 'Cameron', chinese: '卡梅伦', icon: '🐯' },
    { id: 'gracie', name: 'Gracie', chinese: '格蕾西', icon: '🐐' },
    { id: 'harry', name: 'Harry', chinese: '哈里', icon: '🐴' },
    { id: 'henrietta', name: 'Henrietta', chinese: '亨丽埃塔', icon: '🐔' },
    { id: 'rocky', name: 'Rocky', chinese: '罗基', icon: '🐓' },
    { id: 'shelly', name: 'Shelly', chinese: '谢莉', icon: '🐑' }
  ];

  const numbers = [
    { value: 1, english: 'one', chinese: '一' },
    { value: 2, english: 'two', chinese: '二' },
    { value: 3, english: 'three', chinese: '三' },
    { value: 4, english: 'four', chinese: '四' },
    { value: 5, english: 'five', chinese: '五' },
    { value: 6, english: 'six', chinese: '六' },
    { value: 7, english: 'seven', chinese: '七' },
    { value: 8, english: 'eight', chinese: '八' },
    { value: 9, english: 'nine', chinese: '九' },
    { value: 10, english: 'ten', chinese: '十' }
  ];

  const colours = [
    { english: 'black', chinese: '黑色', value: '#20242a', hint: '想想夜晚没有灯光时的颜色。' },
    { english: 'blue', chinese: '蓝色', value: '#267bd8', hint: '晴天的天空常常是这个颜色。' },
    { english: 'brown', chinese: '棕色', value: '#88512f', hint: '树干常常是这个颜色。' },
    { english: 'green', chinese: '绿色', value: '#278645', hint: '新长出的叶子常常是这个颜色。' },
    { english: 'grey', chinese: '灰色', value: '#8e949b', hint: '它比黑色浅一些，比白色深一些。' },
    { english: 'orange', chinese: '橙色', value: '#f58220', hint: '想想橙子外皮的颜色。' },
    { english: 'pink', chinese: '粉红色', value: '#ef94bd', hint: '浅浅的，像红色加了一点白色。' },
    { english: 'purple', chinese: '紫色', value: '#853eaa', hint: '许多葡萄的外皮是这个颜色。' },
    { english: 'red', chinese: '红色', value: '#df343f', hint: '想想国旗上的主要颜色。' },
    { english: 'white', chinese: '白色', value: '#ffffff', hint: '干净的雪常常是这个颜色。' },
    { english: 'yellow', chinese: '黄色', value: '#f4cd27', hint: '熟香蕉的外皮常常是这个颜色。' }
  ];

  function alternatives(items, index, field) {
    // 按固定位置选两个不同的干扰项；题库本身不使用随机数。
    return [items[index][field], items[(index + 3) % items.length][field], items[(index + 6) % items.length][field]];
  }

  function card(id, title, lines, sayPrompt, sayModel, visual) {
    return { id, title, lines, sayPrompt, sayModel, ...(visual ? { visual } : {}) };
  }

  const lessons = {
    'hello-greetings': [
      card('hello-lesson-greet-hello', '见面说 Hello', [
        { english: 'Hello!', chinese: '你好！' }
      ], '想象面前有一位新朋友，向他问好。', 'Hello!'),
      card('hello-lesson-greet-hi', '也可以说 Hi', [
        { english: 'Hi!', chinese: '你好！' }
      ], '见到熟悉的朋友，试着说一声 Hi。', 'Hi!'),
      card('hello-lesson-greet-reply', '朋友问好，我也问好', [
        { english: 'Hello!', chinese: '朋友：你好！' },
        { english: 'Hi!', chinese: '我：你好！' }
      ], '请家人先说 Hello，你用 Hi 回应。', 'Hi!')
    ],
    'hello-numbers': numbers.map(number => card(
      `hello-lesson-number-${number.value}`, `认识数字 ${number.value}`,
      [{ english: number.english, chinese: `${number.value} · ${number.chinese}` }],
      '看着数字，先自己说一遍，再听示范。', number.english,
      { type: 'number', value: number.value }
    )),
    'hello-name-age': [
      card('hello-lesson-ask-name', '问姓名', [
        { english: "What's your name?", chinese: '你叫什么名字？' },
        { english: "I'm Jenny.", chinese: '我叫珍妮。' }
      ], '和家人轮流问姓名，可以选一个图片角色的名字来回答。', "What's your name? I'm Jenny."),
      card('hello-lesson-answer-name', '介绍名字', [
        { english: "I'm Jim.", chinese: '我叫吉姆。' },
        { english: "I'm Shelly.", chinese: '我叫谢莉。' }
      ], '选一个角色名字，试着说：I’m 加上名字。', "I'm Shelly."),
      card('hello-lesson-ask-age', '问年龄', [
        { english: 'How old are you?', chinese: '你几岁了？' },
        { english: "I'm six.", chinese: '例子中的回答：我六岁了。' }
      ], '假装扮演例子中六岁的小朋友，说一遍年龄。不需要填写真实年龄。', "How old are you? I'm six."),
      card('hello-lesson-name-or-age', '姓名和年龄要分清', [
        { english: "What's your name? I'm Jim.", chinese: '问名字，就回答名字。' },
        { english: "How old are you? I'm six.", chinese: '问年龄，就回答年龄；这里是示例回答。' }
      ], '听家人分别问姓名和年龄，用角色名字或例子里的数字回答。', "What's your name? I'm Jim. How old are you? I'm six.")
    ],
    'hello-colours': colours.map(colour => card(
      `hello-lesson-colour-${colour.english}`, `认识${colour.chinese}`,
      [{ english: colour.english, chinese: colour.chinese }],
      '看看色块，试着说出它的英文。', colour.english,
      { type: 'colour', value: colour.value, label: `${colour.chinese}色块` }
    ))
  };

  function question(id, topic, prompt, answer, choices, hint, explanation, extra) {
    return { id, topic, prompt, answer, choices, hint, explanation, ...(extra || {}) };
  }

  function greetingBank() {
    const topic = 'hello-greetings';
    const rows = [
      ['hello-meaning', 'Hello! 是什么意思？', '你好！', ['你好！', '再见！', '谢谢！'], '想想见到朋友时，第一句常说什么。', 'Hello! 是见面打招呼的“你好”。', 'Hello!'],
      ['hi-meaning', 'Hi! 是什么意思？', '你好！', ['你好！', '晚安！', '我六岁。'], '这个短短的词也能用来向朋友问好。', 'Hi! 也表示“你好”，可以向朋友打招呼。', 'Hi!'],
      ['meet-friend', '见到新朋友，选一句打招呼的话。', 'Hello!', ['Hello!', "I'm six.", 'Thank you.'], '先向朋友问好，再介绍自己。', 'Hello! 可以用来打招呼；I’m six. 说的是年龄。', 'Hello!'],
      ['reply-hello', '朋友说 Hello!，你也想问好，选哪句？', 'Hi!', ['Hi!', 'Goodbye!', "I'm three."], '朋友向你问好，你也可以回一句“你好”。', '朋友说 Hello!，可以用 Hi! 回应。', 'Hi!'],
      ['reply-hi', '朋友说 Hi!，你也想问好，选哪句？', 'Hello!', ['Hello!', 'Goodbye!', 'Thank you.'], '见面时回应一句“你好”。', 'Hi! 和 Hello! 都能打招呼，Hello! 是合适的回应。', 'Hello!'],
      ['greeting-or-question', '哪一句是在向朋友问好？', 'Hi!', ['Hi!', "What's your name?", 'How old are you?'], '问好是“你好”，和问姓名、年龄不同。', 'Hi! 是问好；另外两句分别问姓名和年龄。', 'Hi!'],
      ['complete-introduction', '开头先问好：___! I’m Jenny.', 'Hello', ['Hello', 'Six', 'Red'], '开头放一句见面时的问候。', 'Hello! I’m Jenny. 表示“你好！我叫珍妮”。', "Hello! I'm Jenny."],
      ['greet-before-name', '先说“你好”，再介绍名字，选哪句？', "Hi! I'm Jim.", ["Hi! I'm Jim.", "I'm six.", 'How old are you?'], '先找问好的词，再找名字。', 'Hi! I’m Jim. 先打招呼，再说“我叫吉姆”。', "Hi! I'm Jim."]
    ];
    const result = rows.map(row => question(
      `hello-greetings-${row[0]}`, topic, row[1], row[2], row[3], row[4], row[5], { answerSpeech: row[6] }
    ));
    [
      { key: 'hello', speech: 'Hello!', answer: '你好！', choices: ['你好！', '我六岁。', '谢谢！'], explanation: '听到的是 Hello!，用来向朋友问好。' },
      { key: 'hi', speech: 'Hi!', answer: '你好！', choices: ['你好！', '再见！', '我叫吉姆。'], explanation: '听到的是 Hi!，也表示“你好”。' },
      { key: 'hello-name', speech: "Hello! I'm Jim.", answer: '先问好，再说名字', choices: ['先问好，再说名字', '只问别人年龄', '只说一种颜色'], explanation: 'Hello! 是问好，I’m Jim. 是介绍名字。' },
      { key: 'hi-name', speech: "Hi! I'm Jenny.", answer: '先问好，再说名字', choices: ['先问好，再说名字', '只说自己的年龄', '只说一个数字'], explanation: 'Hi! 是问好，I’m Jenny. 是介绍名字。' }
    ].forEach(row => result.push(question(
      `hello-greetings-listen-${row.key}`, topic, '听一听，选出这句话的意思。', row.answer, row.choices,
      '想想开头的词是在问好、问问题，还是说数字。', row.explanation,
      { kind: 'listening', speech: row.speech, fallbackPrompt: `文字提示：${row.speech}`, answerSpeech: row.speech }
    )));
    return result;
  }

  function numberBank() {
    const topic = 'hello-numbers';
    const result = [];
    numbers.forEach((number, index) => {
      const explanation = `${number.value} 用英语说 ${number.english}。`;
      result.push(question(
        `hello-numbers-digit-${number.value}`, topic, '看数字，选出它的英文。', number.english,
        alternatives(numbers, index, 'english'), '可以从 one 开始，按顺序数到这个数字。', explanation,
        { visual: { type: 'number', value: number.value }, answerSpeech: number.english }
      ));
      result.push(question(
        `hello-numbers-count-${number.value}`, topic, '数数星星，选出数量的英文。', number.english,
        alternatives(numbers, index, 'english'), '一颗一颗数，每颗星星只数一次。', `一共有 ${number.value} 颗星星，英语说 ${number.english}。`,
        { visual: { type: 'count', count: number.value, icon: '⭐' }, answerSpeech: number.english }
      ));
      result.push(question(
        `hello-numbers-listen-${number.value}`, topic, '听一听，选出你听到的数字。', String(number.value),
        alternatives(numbers, index, 'value').map(String), '可以再听一次，想想它在 one 到 ten 中的位置。', explanation,
        { kind: 'listening', speech: number.english, fallbackPrompt: `文字提示：${number.english}`, answerSpeech: number.english }
      ));
    });
    return result;
  }

  function nameAgeBank() {
    const topic = 'hello-name-age';
    const result = [];
    characters.forEach((person, index) => {
      const text = `What's your name? I'm ${person.name}.`;
      result.push(question(
        `hello-name-age-name-${person.id}`, topic,
        `对话：What's your name? — I'm ${person.name}.\n对话中的名字是？`, person.name,
        alternatives(characters, index, 'name'), '问名字时，找 I’m 后面的名字。', `I’m ${person.name}. 表示“我叫${person.chinese}”。`,
        { answerSpeech: text }
      ));
    });
    numbers.forEach((number, index) => {
      result.push(question(
        `hello-name-age-age-${number.value}`, topic,
        `原创例子：How old are you? — I'm ${number.english}.\n对话中的小朋友几岁？`, String(number.value),
        alternatives(numbers, index, 'value').map(String), '问几岁时，找 I’m 后面的数字。',
        `How old are you? 问“你几岁了”；I’m ${number.english}. 表示例子里的小朋友 ${number.value} 岁。`,
        { answerSpeech: `How old are you? I'm ${number.english}.` }
      ));
    });
    [
      ['ask-name', '想知道对方的名字，应该问哪句？', "What's your name?", ["What's your name?", 'How old are you?', 'Hello!'], '找问“名字”的句子。', 'What’s your name? 表示“你叫什么名字”。'],
      ['ask-age', '想知道对方几岁了，应该问哪句？', 'How old are you?', ['How old are you?', "What's your name?", 'Hi!'], '年龄是几岁，和名字不同。', 'How old are you? 表示“你几岁了”。'],
      ['reply-name', '别人问 What’s your name?，哪句是在回答名字？', "I'm Jim.", ["I'm Jim.", "I'm six.", 'Hello!'], '回答里应该出现一个名字。', '问姓名时，用 I’m Jim. 回答“我叫吉姆”。'],
      ['reply-age', '别人问 How old are you?，哪句是在回答年龄？', "I'm six.", ["I'm six.", "I'm Jenny.", 'Hi!'], '回答里应该出现一个表示年龄的数字。', '问年龄时，I’m six. 表示“我六岁了”。这里是示例回答。'],
      ['name-question-meaning', 'What’s your name? 是在问什么？', '名字', ['名字', '年龄', '颜色'], '回想问姓名的学习卡，这句话需要用一个人的称呼来回答。', 'What’s your name? 是在问“你叫什么名字”。'],
      ['age-question-meaning', 'How old are you? 是在问什么？', '年龄', ['年龄', '名字', '颜色'], '想想“你几岁了”是在问什么。', 'How old are you? 是在问年龄。'],
      ['finish-name', '回答姓名：What’s your name? — I’m ___.', 'Jenny', ['Jenny', 'seven', 'blue'], '空格里需要放一个名字。', 'I’m Jenny. 表示“我叫珍妮”；seven 是数字，blue 是颜色。'],
      ['finish-age', '原创例子：回答年龄：How old are you? — I’m ___.', 'three', ['three', 'Jim', 'green'], '空格里需要放一个表示几岁的数字。', 'I’m three. 表示例子里的小朋友三岁；Jim 是名字，green 是颜色。']
    ].forEach(row => result.push(question(
      `hello-name-age-dialogue-${row[0]}`, topic, row[1], row[2], row[3], row[4], row[5],
      { answerSpeech: row[0] === 'finish-name' ? "I'm Jenny." : row[0] === 'finish-age' ? "I'm three." : row[0].includes('meaning') ? (row[0].startsWith('name') ? "What's your name?" : 'How old are you?') : row[2] }
    )));
    [
      { key: 'ask-name', speech: "What's your name?", answer: '问名字', choices: ['问名字', '问年龄', '说颜色'], explanation: 'What’s your name? 是在问名字。' },
      { key: 'ask-age', speech: 'How old are you?', answer: '问年龄', choices: ['问年龄', '问名字', '打招呼'], explanation: 'How old are you? 是在问年龄。' },
      { key: 'reply-name', speech: "I'm Jim.", answer: '介绍名字', choices: ['介绍名字', '介绍年龄', '问颜色'], explanation: 'I’m Jim. 表示“我叫吉姆”，是在介绍名字。' },
      { key: 'reply-age', speech: "I'm six.", answer: '说自己的年龄', choices: ['说自己的年龄', '介绍名字', '问别人姓名'], explanation: '原创示例里的 I’m six. 表示“我六岁了”，是在说年龄。' }
    ].forEach(row => result.push(question(
      `hello-name-age-listen-${row.key}`, topic, '听原创示例，选出这句话在做什么。', row.answer, row.choices,
      '留意听到的是名字、数字，还是一个问题。', row.explanation,
      { kind: 'listening', speech: row.speech, fallbackPrompt: `文字提示：${row.speech}`, answerSpeech: row.speech }
    )));
    return result;
  }

  function colourBank() {
    const topic = 'hello-colours';
    const result = [];
    colours.forEach((colour, index) => {
      const explanation = `${colour.english} 表示${colour.chinese}。`;
      result.push(question(
        `hello-colours-swatch-${colour.english}`, topic, '看色块，选出颜色的英文。', colour.english,
        alternatives(colours, index, 'english'), colour.hint, explanation,
        { visual: { type: 'colour', value: colour.value, label: `${colour.chinese}色块` }, answerSpeech: colour.english }
      ));
      result.push(question(
        `hello-colours-listen-${colour.english}`, topic, '听一听，选出你听到的颜色。', colour.chinese,
        alternatives(colours, index, 'chinese'), '可以再听一次，回想学习卡里的颜色英文。', explanation,
        { kind: 'listening', speech: colour.english, fallbackPrompt: `文字提示：${colour.english}`, answerSpeech: colour.english }
      ));
    });
    return result;
  }

  const questions = {
    'hello-greetings': greetingBank(),
    'hello-numbers': numberBank(),
    'hello-name-age': nameAgeBank(),
    'hello-colours': colourBank()
  };

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function lesson(topic) {
    return copy(lessons[topic] || []);
  }

  function bank(topic) {
    return copy(questions[topic] || []);
  }

  const api = { topics, characters, lesson, bank };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GardenHello = api;
})(typeof window !== 'undefined' ? window : globalThis);
