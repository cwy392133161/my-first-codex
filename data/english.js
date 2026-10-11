/*
 * 独立英语题库：按用户提供的 Power Up 词表照片整理 Hello、Unit 1–4。
 * 词条可独立调整；题干、提示和讲解为本项目原创，不表示与整册教材完全同步。
 * 图片中的 * 标记保存为 extended；同义词斜杠组保留为一个词条。
 */
(function (root) {
  'use strict';

  function word(key, english, meaning, hint, options) {
    const extra = options || {};
    return {
      key, english, meaning, hint,
      extended: Boolean(extra.extended),
      speech: english.replace(/\//g, ', '),
      semantic: extra.semantic || key,
      ...(extra.context ? { context: extra.context } : {})
    };
  }

  const units = [
    {
      id: 'englishhello', label: 'Hello', name: '颜色与数字', icon: '🌈',
      words: [
        word('black', 'black', '黑色', '想想夜里看不见灯光时的颜色。'),
        word('blue', 'blue', '蓝色', '晴天的天空常常是这个颜色。'),
        word('brown', 'brown', '棕色', '树干常常是这个颜色。'),
        word('eight', 'eight', '八', '它在七的后面、九的前面。'),
        word('five', 'five', '五', '一只手张开，数一数有几根手指。'),
        word('four', 'four', '四', '它在三的后面、五的前面。'),
        word('green', 'green', '绿色', '新长出的叶子常常是这个颜色。'),
        word('grey', 'grey', '灰色', '阴天的云常常是这个颜色。'),
        word('nine', 'nine', '九', '它比十少一。'),
        word('one', 'one', '一', '从头开始数数，这是最先数到的数。'),
        word('orange', 'orange', '橙色', '想想橙子外皮的颜色。', { context: '谈颜色时' }),
        word('pink', 'pink', '粉红色', '它像红色加一点白色，浅浅的。'),
        word('purple', 'purple', '紫色', '想想许多葡萄外皮的颜色。'),
        word('red', 'red', '红色', '国旗上的主要颜色是什么？'),
        word('seven', 'seven', '七', '它在六的后面、八的前面。'),
        word('six', 'six', '六', '它比五多一。'),
        word('ten', 'ten', '十', '把两只手的手指都张开，数一数。'),
        word('three', 'three', '三', '它在二的后面、四的前面。'),
        word('two', 'two', '二', '一双鞋有几只？'),
        word('white', 'white', '白色', '干净的雪常常是这个颜色。'),
        word('yellow', 'yellow', '黄色', '熟香蕉的外皮常常是这个颜色。')
      ]
    },
    {
      id: 'english1', label: 'Unit 1', name: '学校与学习', icon: '🎒',
      words: [
        word('always', 'always', '总是', '想想每一次都这样，没有一次例外。', { extended: true }),
        word('bag', 'bag', '包', '上学时，可以用它装书和文具。', { semantic: 'carry_bag' }),
        word('board', 'board', '白板', '老师能在上面写字，再擦掉。'),
        word('book', 'book', '书', '翻开它，可以读到文字和故事。'),
        word('bookcase', 'bookcase', '书架；书柜', '书本可以一排一排放在上面。', { semantic: 'storage' }),
        word('chair', 'chair', '椅子', '上课时，我们坐在它上面。'),
        word('classroom', 'classroom', '教室', '同学们一起上课的房间。'),
        word('crayon', 'crayon', '蜡笔', '彩色的画画工具，能涂出鲜艳的颜色。'),
        word('cupboard', 'cupboard', '柜子', '可以打开柜门，把东西放进去。', { semantic: 'storage' }),
        word('desk', 'desk', '书桌', '学习时，把书和文具放在它上面。'),
        word('door', 'door', '门', '进出房间时，要打开它。'),
        word('help', 'help', '帮助', '朋友遇到困难，你可以伸出援手。'),
        word('hurry', 'hurry', '赶紧', '快要迟到了，做事要快一点。', { extended: true }),
        word('in', 'in', '在……里面', '玩具放进盒子后，它和盒子是什么位置关系？'),
        word('late', 'late', '迟的；晚的', '上课铃响了才到，这样到达就不准时。', { extended: true }),
        word('listen', 'listen', '倾听', '老师说话时，认真用耳朵听。'),
        word('next_to', 'next to', '紧挨着', '两把椅子并排放，中间没有别的东西。'),
        word('on', 'on', '在……上面', '书平放在桌面上，想想书的位置。'),
        word('paper', 'paper', '纸', '写字、画画常常需要一张它。'),
        word('pen', 'pen', '墨水笔', '它用墨水写字，不是靠铅笔芯。'),
        word('pencil', 'pencil', '铅笔', '它的笔芯能削尖，写错后能用橡皮擦。'),
        word('pencil_case', 'pencil case', '笔袋', '把铅笔和橡皮装进去，再放进书包。', { semantic: 'carry_bag' }),
        word('playground', 'playground', '操场', '课间，我们可以在那里跑步、做游戏。'),
        word('read', 'read', '阅读', '打开书，用眼睛看文字，理解里面的故事。', { extended: true }),
        word('rubber', 'rubber', '橡皮', '铅笔写错字时，可以用它擦一擦。', { context: '英国英语的文具词' }),
        word('ruler', 'ruler', '尺子', '它能帮你画直线、量长度。'),
        word('share', 'share', '分享', '把自己的东西拿出来，和朋友一起用。'),
        word('story', 'story', '故事', '可以听，也可以读，里面常有人物和发生的事。', { extended: true }),
        word('teacher', 'teacher', '老师', '在学校教我们知识的人。'),
        word('under', 'under', '在……下面', '小球滚到桌子底下，想想它的位置。'),
        word('wall', 'wall', '墙', '房间周围立着它，上面可以挂画。'),
        word('way', 'way', '方式', '做同一件事，可以有不同的做法。', { extended: true, context: '谈怎么做一件事时' }),
        word('window', 'window', '窗', '从房间里透过它，可以看到外面。'),
        word('work_together', 'work together', '合作', '大家一起做一件事，每个人都出一份力。')
      ]
    },
    {
      id: 'english2', label: 'Unit 2', name: '家人与身体', icon: '🖐️',
      words: [
        word('arm', 'arm', '手臂', '它从肩膀连到手，弯一弯能抱住东西。'),
        word('body', 'body', '躯干', '这是身体中间的主要部分，头和四肢连着它。', { context: '说身体部位时' }),
        word('brother', 'brother', '哥哥；弟弟', '和你有同样父母的男孩，可能比你大，也可能比你小。'),
        word('close', 'close', '关；闭合', '门开着，把它合上，要做什么动作？', { extended: true, context: '把门合上时' }),
        word('cousin', 'cousin', '堂兄弟姐妹；表兄弟姐妹', '叔叔、姑姑、舅舅或阿姨家的孩子，和你是什么关系？', { extended: true }),
        word('ear', 'ear', '耳朵', '它长在头的两侧，可以听声音。'),
        word('eye', 'eye', '眼睛', '我们用它看书、看风景。'),
        word('face', 'face', '脸', '眼睛、鼻子和嘴巴都长在这里。'),
        word('family', 'family', '家庭；家人', '爸爸、妈妈和孩子们生活在一起。'),
        word('father_dad', 'father/dad', '爸爸', '他和妈妈一起照顾你，是家里的男性家长。'),
        word('foot', 'foot', '脚', '它在腿的下面，走路时踩在地上。'),
        word('grandfather_grandpa', 'grandfather/grandpa', '爷爷；外公', '爸爸的爸爸、妈妈的爸爸，都可以这样称呼。'),
        word('grandmother_grandma', 'grandmother/grandma', '奶奶；外婆', '爸爸的妈妈、妈妈的妈妈，都可以这样称呼。'),
        word('hair', 'hair', '头发', '它长在头上，可以用梳子梳。'),
        word('hand', 'hand', '手', '它上面有手指，能拿东西、拍一拍。'),
        word('head', 'head', '头', '它在脖子上面，眼睛和耳朵都在这里。'),
        word('hear', 'hear', '听见', '小铃铛响了，你的耳朵接收到了声音。'),
        word('interesting', 'interesting', '有趣的', '一本书让你很想继续看，它可能就是这样的。', { extended: true, semantic: 'enjoyable' }),
        word('leg', 'leg', '腿', '走路、跑步时，身体下面的它们轮流向前迈。'),
        word('meet', 'meet', '认识；结识', '第一次见到新朋友，互相介绍自己。', { extended: true }),
        word('mother_mum', 'mother/mum', '妈妈', '她和爸爸一起照顾你，是家里的女性家长。'),
        word('mouth', 'mouth', '嘴', '吃饭、说话时都要用它。'),
        word('music', 'music', '音乐', '唱歌或弹琴时，会听到有节奏的声音。', { extended: true }),
        word('nose', 'nose', '鼻子', '它在脸上，可以闻到花香。'),
        word('party', 'party', '聚会', '生日时，大家一起庆祝、做游戏。', { extended: true }),
        word('see', 'see', '看见', '小鸟飞过来，你的眼睛发现了它。'),
        word('sister', 'sister', '姐姐；妹妹', '和你有同样父母的女孩，可能比你大，也可能比你小。'),
        word('smell', 'smell', '闻到', '花香飘过来，鼻子发现了气味。'),
        word('tail', 'tail', '尾巴', '小猫身后有它，可以摆来摆去。'),
        word('taste', 'taste', '品尝', '把食物放进嘴里，试试它是什么味道。'),
        word('touch', 'touch', '触摸', '用手轻轻碰一碰，感受东西的表面。'),
        word('world', 'world', '世界', '地球上许多国家、许多人共同生活的地方。', { extended: true })
      ]
    },
    {
      id: 'english3', label: 'Unit 3', name: '动物与感受', icon: '🐑',
      words: [
        word('afternoon', 'afternoon', '下午', '午饭之后、晚上之前的一段时间。', { extended: true }),
        word('angry', 'angry', '生气的', '不高兴时，可能会皱眉头、鼓起腮帮子。'),
        word('beautiful', 'beautiful', '美丽的', '花儿很好看，我们可以这样夸它。', { semantic: 'pleasant' }),
        word('bee', 'bee', '蜜蜂', '它会飞到花朵上采蜜。'),
        word('big', 'big', '大的', '想想大象和小蚂蚁，哪一个占的地方更多？'),
        word('call', 'call', '把……叫作', '给小猫起一个名字，以后用这个名字称呼它。', { extended: true, context: '给小动物取名字时' }),
        word('cat', 'cat', '猫', '它会喵喵叫，嘴边有胡须。'),
        word('chicken', 'chicken', '鸡', '它会咯咯叫，有羽毛，也有两条腿。', { context: '说动物时' }),
        word('cow', 'cow', '奶牛', '农场里常养它，它能产奶。'),
        word('cut', 'cut', '切；割；剪', '用剪刀把纸分成两片，是在做这个动作。', { extended: true }),
        word('dog', 'dog', '狗', '它会汪汪叫，开心时会摇尾巴。'),
        word('donkey', 'donkey', '驴', '它像马，耳朵长长的，能帮人驮东西。'),
        word('duck', 'duck', '鸭', '它会嘎嘎叫，常常在水里游。'),
        word('egg', 'egg', '蛋', '它外面有壳，打开后常能看到蛋黄。'),
        word('funny', 'funny', '滑稽的', '有些样子或事情会逗得大家笑。', { semantic: 'enjoyable' }),
        word('glass', 'glass', '一玻璃杯的量', '不是饮料的名字，而是用杯子量出来的一份。', { extended: true, context: '说饮料的份量时' }),
        word('goat', 'goat', '山羊', '它常有胡子，喜欢爬坡。'),
        word('happy', 'happy', '高兴的', '遇到开心的事情，会露出笑容。'),
        word('honey', 'honey', '蜂蜜', '小蜜蜂酿出的甜甜食物。'),
        word('horse', 'horse', '马', '它能让人骑，奔跑时四只蹄子哒哒响。'),
        word('letter', 'letter', '字母', '组成英文单词的一个个小符号。', { extended: true, context: '认读 A、B、C 时' }),
        word('little', 'little', '小的', '想想玩具汽车和真汽车，哪个更小巧？', { semantic: 'small', context: '说物品的大小时' }),
        word('long', 'long', '长的', '两根绳子放在一起，哪根从头到尾更远？'),
        word('milk', 'milk', '奶', '小朋友常喝的白色饮品，奶牛能产出它。'),
        word('nice', 'nice', '友善的', '对朋友亲切，会关心、帮助别人。', { semantic: 'pleasant', context: '说待人态度时' }),
        word('old', 'old', '年老的', '已经生活了很多年，年龄比较大。', { context: '说年龄时' }),
        word('park', 'park', '公园', '有树、有花，大家可以在那里散步。', { extended: true }),
        word('sad', 'sad', '伤心的', '难过时，有时会想哭。'),
        word('sheep', 'sheep', '绵羊', '身上的毛卷卷的，能给我们羊毛。'),
        word('short', 'short', '短的', '两根绳子比一比，哪根从头到尾距离更小？', { context: '说长度时' }),
        word('small', 'small', '小的', '想想一颗小豆子，它占的地方不多。', { semantic: 'small', context: '说物品的大小时' }),
        word('spider', 'spider', '蜘蛛', '它有八条腿，有的会织网。'),
        word('tea', 'tea', '茶', '把茶叶放进热水里，可以泡出这种饮品。', { extended: true }),
        word('then', 'then', '然后', '先洗手，再吃饭，说的是接下来做什么。', { extended: true }),
        word('tired', 'tired', '困倦的', '活动了很久，想休息、打哈欠。'),
        word('ugly', 'ugly', '丑陋的', '这是形容外表不好看的词；我们不拿它取笑别人。'),
        word('wool', 'wool', '羊毛', '绵羊身上的毛，可以织成暖和的衣服。'),
        word('young', 'young', '年幼的；年轻的', '年龄不大，像小宝宝一样。', { context: '说年龄时' })
      ]
    },
    {
      id: 'english4', label: 'Unit 4', name: '食物与饮品', icon: '🍓',
      words: [
        word('apple', 'apple', '苹果', '圆圆的水果，外皮常是红色或绿色。', { semantic: 'fruit' }),
        word('banana', 'banana', '香蕉', '弯弯的水果，熟了以后外皮常是黄色。', { semantic: 'fruit' }),
        word('bean', 'bean', '豆', '小小的，一粒一粒，有的长在豆荚里。'),
        word('bread', 'bread', '面包', '用面粉烤成，可以切成一片一片。'),
        word('burger', 'burger', '汉堡包', '两片圆面包中间夹着肉和蔬菜。'),
        word('cake', 'cake', '蛋糕', '生日时常会吃，上面可以插蜡烛。'),
        word('carrot', 'carrot', '胡萝卜', '常常是橙色、长长的根，顶上有绿叶。'),
        word('cheese', 'cheese', '奶酪', '它是用奶做成的食品，有时夹在汉堡里。'),
        word('chicken', 'chicken', '鸡肉', '这次说的是鸡做成的食物，不是活的动物。', { semantic: 'meat', context: '说食物时' }),
        word('chip', 'chip', '炸薯条', '把土豆切成长条，再炸成的食物。', { extended: true, context: '英国英语的食物词' }),
        word('chocolate', 'chocolate', '巧克力', '用可可做成的甜食，常常是一小块一小块。'),
        word('cook', 'cook', '煮；烧', '把食物加热，做成能吃的饭菜。', { extended: true, context: '说做饭的动作时' }),
        word('dinner', 'dinner', '晚餐', '晚上吃的一顿饭。', { extended: true }),
        word('fruit', 'fruit', '水果', '苹果、香蕉和葡萄，都属于这一类。', { semantic: 'fruit' }),
        word('grape', 'grape', '葡萄', '小小圆圆的一颗颗，常常连成一串。', { semantic: 'fruit' }),
        word('ice_cream', 'ice cream', '冰激凌', '冷冷甜甜的，可以装在蛋筒里。', { extended: true }),
        word('juice', 'juice', '果汁', '把水果榨一榨，能得到这种饮品。'),
        word('lemonade', 'lemonade', '柠檬水', '用一种酸酸的黄色水果做成的饮品。'),
        word('like', 'like', '喜欢', '觉得它很好，愿意多看看、多玩玩。'),
        word('mango', 'mango', '芒果', '热带水果，果肉金黄色，中间有扁扁的果核。', { semantic: 'fruit' }),
        word('meat', 'meat', '肉', '从动物身上得到的食物，常用来做菜。', { semantic: 'meat' }),
        word('meatball', 'meatball', '肉丸', '把肉做成一个个小圆球。', { semantic: 'meat' }),
        word('minute', 'minute', '分钟', '钟表上的分针走一个小格，是这样一段时间。', { extended: true }),
        word('onion', 'onion', '洋葱', '圆圆的蔬菜，一层一层，切开有时会让人流眼泪。'),
        word('orange', 'orange', '橙子', '圆圆的水果，有橙色的皮和多汁的果肉。', { semantic: 'fruit', context: '说水果时' }),
        word('pasta', 'pasta', '意大利面食', '可以是长面条，也可以是小弯管等形状。'),
        word('potato', 'potato', '土豆', '它长在地下，可以煮，也能做成炸薯条。'),
        word('rice', 'rice', '米', '它是一粒一粒的粮食，煮熟能做成米饭。'),
        word('salad', 'salad', '沙拉', '把蔬菜或水果拌在一起，常会加一点酱。'),
        word('sausage', 'sausage', '香肠', '常常是长条状的肉食品。', { semantic: 'meat' }),
        word('tomato', 'tomato', '西红柿', '圆圆红红、多汁的蔬菜，也叫番茄。'),
        word('top', 'top', '顶部', '一个东西最上面的部分。', { extended: true }),
        word('water', 'water', '水', '口渴时能喝，透明、没有颜色。')
      ]
    }
  ];

  const topics = units.map(unit => ({
    id: unit.id, subject: 'english', name: `${unit.label} · ${unit.name}`,
    icon: unit.icon, description: `词表 ${unit.words.length} 个词条 · 原创双向练习`
  }));

  function vocabulary(topic) {
    const unit = units.find(item => item.id === topic);
    return unit ? unit.words.map(item => ({ ...item })) : [];
  }

  // 稳定排序保证同一题号内容可复核；应用负责随机抽题、打乱选项。
  function hash(text) {
    let result = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      result = Math.imul(result ^ text.charCodeAt(i), 16777619);
    }
    return result >>> 0;
  }

  function question(unit, entry, direction) {
    const meaningDirection = direction === 'meaning';
    const answer = meaningDirection ? entry.meaning : entry.english;
    const candidates = unit.words.filter(other =>
      other.key !== entry.key && other.english !== entry.english &&
      other.meaning !== entry.meaning && other.semantic !== entry.semantic &&
      // 基础题的干扰项也只用基础词，关闭拓展词后不会暗中出现拓展词。
      (entry.extended || !other.extended)
    ).sort((a, b) =>
      hash(`${entry.key}|${direction}|${a.key}`) - hash(`${entry.key}|${direction}|${b.key}`)
    );
    if (candidates.length < 2) throw new Error(`${unit.id}/${entry.key} 缺少不含歧义的干扰项`);
    const choices = candidates.slice(0, 2).map(item => meaningDirection ? item.meaning : item.english);
    choices.splice(hash(`${unit.id}|${entry.key}|${direction}`) % 3, 0, answer);
    const context = entry.context ? `（${entry.context}）` : '';
    return {
      id: `${unit.id}-${entry.key}-${direction}`,
      topic: unit.id, wordKey: entry.key, direction,
      prompt: meaningDirection
        ? `“${entry.english}”${context}是什么意思？`
        : `哪个选项表示“${entry.meaning}”？`,
      answer, choices, hint: entry.hint,
      explanation: `${entry.english}${context}表示“${entry.meaning}”。${entry.key === 'foot' ? '一只脚是 foot，多只脚是 feet。' : ''}${entry.semantic === 'small' ? 'little 和 small 都可以形容物品小；本题选项中这个词符合意思。' : ''}`,
      extended: entry.extended,
      ...(meaningDirection ? { speech: entry.speech } : {}),
      answerSpeech: entry.speech
    };
  }

  function bank(topic) {
    const unit = units.find(item => item.id === topic);
    return unit ? unit.words.flatMap(entry => [
      question(unit, entry, 'meaning'), question(unit, entry, 'word')
    ]) : [];
  }

  const api = { units, topics, vocabulary, bank };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.GardenEnglish = api;
}(typeof window !== 'undefined' ? window : globalThis));
