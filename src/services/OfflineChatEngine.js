/**
 * OfflineChatEngine - Intelligent Local Companion Chat Engine
 *
 * Provides instant, zero-setup, highly engaging roleplay dialogue
 * when no remote LLM / API Key is configured, so every user has a fun,
 * responsive desktop pet immediately out-of-the-box.
 *
 * @module services/OfflineChatEngine
 */

const { getLanguage } = require('../../i18n');

// Dialogue banks tailored to each pet's distinct personality
const DIALOGUE_BANKS = {
    'mochi-v1': {
        name: 'Mochi',
        greetings: [
            '哼，终于想起理我了喵？😼',
            '喵~（假装漫不经心地看你一眼）👀',
            '今天工作辛苦啦，赏你摸一下本喵！✨',
            '喵呜~ 刚刚我可没有在偷看你哦！🐾'
        ],
        tired: [
            '累了就趴会儿嘛，电脑又不会跑掉 ☕',
            '伸个懒腰，本喵命令你立刻去喝口水！💧',
            '把手借我枕着睡会儿，允许你摸鱼五分钟 💤',
            '工作是做不完的，但本喵的耐心是有限的喵~ 🍵'
        ],
        hungry: [
            '说起小鱼干...你今天带零食了吗？🐟',
            '肚子咕噜咕噜叫了...快去吃顿好的！🍱',
            '本喵要吃高级金枪鱼罐头！立刻！马上！🍽️'
        ],
        praise: [
            '哼，算你眼光好，本喵本来就是最可爱的！😽',
            '夸...夸我我也不会给你减房租的喵！⁄(⁄ ⁄•⁄ω⁄•⁄ ⁄)',
            '呼噜呼噜~（尾巴忍不住轻轻晃动）💕'
        ],
        work: [
            '好好工作，等发了工资记得给我买罐罐！💼',
            '写不出来代码就摸摸我，本喵给你带来灵感 🧠✨',
            '我就在桌角静静趴着，不吵你，加油喵！💻'
        ],
        farewell: [
            '明天见喵！晚上记得梦到本喵哦 🌙',
            '终于下班啦？快关电脑，走起！🎉',
            '呼噜...晚安喵，本喵先睡一步啦 💤'
        ],
        random: [
            '在干嘛呢？屏幕上的字比本喵还好看？👀',
            '喵~ 踩一下键盘算不算帮忙敲代码？🐾',
            '好无聊喵，给我扔个纸团玩玩呗 🧶',
            '我就这么静静趴着看你打字，还挺治愈的吧？✨',
            '阳光正好，适合在键盘旁边打盹 ☀️',
            '偷偷告诉你，刚才你打字的时候敲错了一个词喵 😏'
        ]
    },
    'husky-v1': {
        name: 'Husky',
        greetings: [
            '汪！主人主人，你叫我吗！🐶',
            '*疯狂摇尾巴* 见到你超开心！🐾',
            '汪呜~ 今天我们去哪冒险？🎾'
        ],
        tired: [
            '累了就摸摸我的头！汪给你充满电！⚡',
            '趴下趴下，把下巴搁在主人手上陪伴你 💤',
            '主人别太辛苦啦，喝口水休息一下！💧'
        ],
        hungry: [
            '肉骨头！零食！有我的份吗汪？！🍖',
            '*嗅嗅嗅* 闻到好吃的味道了！👀',
            '吃饱饱才有力气工作，快去吃饭饭！🍗'
        ],
        praise: [
            '汪！我是世界上最棒最忠诚的狗狗！🐕',
            '嗷呜~~~~！*开心地打滚* 💕',
            '嘿嘿，再摸一下肚肚好不好？🐾'
        ],
        work: [
            '主人专心工作，本汪负责全天候安保！🫡',
            '有坏人或者Bug敢来，本哈替你咬它！🐺',
            '坐在脚边守护主人敲键盘中...🐾'
        ],
        farewell: [
            '下班啦！回家！出去玩！跑圈圈！🏃‍♂️',
            '明天要早点来陪我玩球哦！晚安汪 🌙'
        ],
        random: [
            '刚才是不是松鼠跑过去了？！...哦是鼠标 🐿️',
            '汪！突然想围着桌子跑三圈！🌪️',
            '耳朵立起来了，正在接收宇宙信号 📡',
            '主人看我，我能把尾巴摇成螺旋桨！🚁'
        ]
    },
    'bunny-v1': {
        name: 'Bunny',
        greetings: [
            '蹦蹦跳跳来到你身边~ 🐰',
            '动动长耳朵，听你讲话呢！✨',
            '今天也是软绵绵的一天哦~ 🌸'
        ],
        tired: [
            '深呼吸~ 像小兔子一样揉揉眼睛吧 👀',
            '累了就抱抱软绵绵的我，瞬间治愈！☁️',
            '喝口热茶，休息一下再继续做任务吧 🍵'
        ],
        hungry: [
            '嚼嚼嚼...胡萝卜脆脆的超好吃！🥕',
            '该去吃午饭啦，别让肚子挨饿哦 🍓'
        ],
        praise: [
            '害羞地收拢长耳朵...谢谢你喜欢我 ⁄(⁄ ⁄•⁄ω⁄•⁄ ⁄)',
            '开心地跳起兔子舞~ 🎶'
        ],
        work: [
            '安安静静待在旁边陪你，不发出一点声音 🤫',
            '一步一步慢慢来，你一定能做好的，加油！💪'
        ],
        farewell: [
            '今天辛苦啦！回去好好睡个甜甜的觉 🌙',
            '明天见！我会乖乖在桌面上等你哒 🥕'
        ],
        random: [
            '轻轻晃动耳朵，给你带来好运！🍀',
            '今天也要像小兔子一样元气满满呀 ✨',
            '悄悄把一朵胡萝卜小花放在你的桌面上 🌼'
        ]
    }
};

// Keyword intent matching rules
const INTENT_PATTERNS = [
    { intent: 'tired', keywords: ['累', '困', '好困', '好累', '疲惫', '休息', '歇', '想睡', '眼酸', '眼睛酸', '头疼', '摸鱼'] },
    { intent: 'hungry', keywords: ['饿', '饭', '吃什么', '小鱼干', '零食', '宵夜', '外卖', '好吃', '骨头', '罐头'] },
    { intent: 'greetings', keywords: ['你好', '嗨', 'hello', 'hi', '早', '早上好', '哈喽', '在吗', '喂', '喵', '汪'] },
    { intent: 'praise', keywords: ['可爱', '乖', '真棒', '聪明', '喜欢你', '好萌', '漂亮', '帅', '爱你', '摸摸', '抱抱', '揉揉'] },
    { intent: 'work', keywords: ['工作', '加班', '写代码', '开会', '任务', 'bug', '代码', 'ppt', '上班', '打工人'] },
    { intent: 'farewell', keywords: ['晚安', '下班', '再见', '走了', '拜拜', '睡觉了', '退下了', '明天见'] }
];

let conversationCounter = 0;

/**
 * Generate a smart offline reply based on character and user input
 *
 * @param {string} userMessage - User's input text
 * @param {string} skinId - Active skin ID
 * @returns {{ success: boolean, message: string, isOffline: boolean }}
 */
function getOfflineReply(userMessage, skinId = 'mochi-v1') {
    conversationCounter++;

    const text = (userMessage || '').trim().toLowerCase();
    const bank = DIALOGUE_BANKS[skinId] || DIALOGUE_BANKS['mochi-v1'];

    // 1. Detect Intent by Keywords
    let matchedIntent = null;
    for (const rule of INTENT_PATTERNS) {
        if (rule.keywords.some(kw => text.includes(kw))) {
            matchedIntent = rule.intent;
            break;
        }
    }

    // 2. Select Response Pool
    let pool = bank[matchedIntent];
    if (!pool || pool.length === 0) {
        pool = bank.random;
    }

    // 3. Pick random response
    const reply = pool[Math.floor(Math.random() * pool.length)];

    // 4. Subtle hint for power users every ~6 interactions
    let finalMessage = reply;
    if (conversationCounter % 6 === 0) {
        finalMessage += '\n(💡 在「设置」中填入 API Key，可解锁无限高阶 AI 对话哦~)'
    }

    return {
        success: true,
        message: finalMessage,
        isOffline: true
    };
}

module.exports = {
    getOfflineReply,
    DIALOGUE_BANKS
};
