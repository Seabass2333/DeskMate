/**
 * Internationalization (i18n) Module
 * Supports auto-detection and manual language selection
 */

const { app } = require('electron');

// Supported languages
const SUPPORTED_LANGUAGES = ['zh-CN', 'en', 'ja', 'ko', 'es', 'fr', 'de'];

// Language translations
const translations = {
    'zh-CN': {
        // Menu
        talkToMe: '💬 和我聊天',
        startFocus: '🍅 开始专注',
        focusing: '🍅 专注中...',
        stopFocus: '⏹ 停止专注',
        minutes: '分钟',
        reminders: '⏰ 定时提醒',
        drinkWater: '💧 喝水',
        restEyes: '👀 休息眼睛',
        stretch: '🧘 伸展',
        settings: '⚙️ 设置',
        autoStart: '🚀 开机自启',
        showHide: '🐱 显示/隐藏',
        exit: '❌ 退出',

        // Onboarding
        welcomeBack: '哼，你终于来了喵~ 😼',
        setupApiKey: '右键点我，配置你的大脑(API Key)喵！🧠',
        apiKeyError: '右键点我，去设置里填好 API Key 喵！🔑',
        somethingWrong: '喵？好像哪里不对... 右键看看设置？',

        // Reminders
        reminderWater: '该喝水啦！💧 保持水分哦~',
        reminderRest: '看看远处，让眼睛休息一下~ 👀',
        reminderStretch: '起来活动活动筋骨吧！🧘',
        reminderEnabled: '提醒已开启 ✅',
        reminderDisabled: '提醒已关闭',
        reminderConfirmed: '收到！✅',

        // Errors
        errorNetwork: '断网了... 检查一下网络吧 🌐',
        errorTimeout: '服务器太慢了... 等会再试试 ⏰',
        errorAuth: 'API Key 好像不对哦，去设置里看看？ 🔑',
        errorRateLimit: '问太多啦！让我喘口气 😮‍💨',
        errorQuota: 'API 余额不足，去充值吧 💰',
        errorServer: 'AI 服务器出问题了，稍后再试 🔧',
        errorUnknown: '出错了... 但我也不知道为啥 🤔',

        // Settings
        settingsTitle: '设置',
        region: '区域',
        provider: '供应商',
        apiKey: 'API 密钥',
        model: '模型',
        language: '语言',
        testConnection: '测试连接',
        save: '保存',
        cancel: '取消',
        preferences: '偏好设置',
        soundEffects: '音效',

        // Random idle messages
        randomMessages: [
            "...喵zzZ 💤",
            "*打哈欠* 好无聊喵~ 🥱",
            "哼，又在偷懒？😏",
            "*伸懒腰* 本喵需要休息 😸",
            "喵~（才不是想你摸我）🐱",
            "好无聊...陪我玩嘛！",
            "*呼噜呼噜* 😻",
            "你在干嘛？...随便问问 👀",
            "有小鱼干吗？🐟",
            "该休息了吧？本喵说的 ☕"
        ]
    },

    'en': {
        // Menu
        talkToMe: '💬 Talk to Me',
        startFocus: '🍅 Start Focus',
        focusing: '🍅 Focusing...',
        stopFocus: '⏹ Stop Focus',
        minutes: 'min',
        reminders: '⏰ Reminders',
        drinkWater: '💧 Drink Water',
        restEyes: '👀 Rest Eyes',
        stretch: '🧘 Stretch',
        settings: '⚙️ Settings',
        autoStart: '🚀 Auto Start',
        showHide: '🐱 Show/Hide',
        exit: '❌ Exit',

        // Onboarding
        welcomeBack: 'Hmph, you finally showed up~ 😼',
        setupApiKey: 'Right-click me to set up your API Key! 🧠',
        apiKeyError: 'Right-click me to fix the API Key! 🔑',
        somethingWrong: 'Meow? Something seems off... check settings?',

        // Reminders
        reminderWater: 'Time to drink water! 💧 Stay hydrated~',
        reminderRest: 'Look away and rest your eyes~ 👀',
        reminderStretch: 'Get up and stretch! 🧘',
        reminderEnabled: 'Reminder enabled ✅',
        reminderDisabled: 'Reminder disabled',
        reminderConfirmed: 'Got it! ✅',

        // Errors
        errorNetwork: 'No network... check your connection 🌐',
        errorTimeout: 'Server too slow... try again later ⏰',
        errorAuth: 'API Key seems wrong, check settings? 🔑',
        errorRateLimit: 'Too many requests! Let me breathe 😮‍💨',
        errorQuota: 'API credits depleted, time to top up 💰',
        errorServer: 'AI server issues, try again later 🔧',
        errorUnknown: 'Something went wrong... not sure what 🤔',

        // Settings
        settingsTitle: 'Settings',
        region: 'Region',
        provider: 'Provider',
        apiKey: 'API Key',
        model: 'Model',
        language: 'Language',
        testConnection: 'Test Connection',
        save: 'Save',
        cancel: 'Cancel',
        preferences: 'Preferences',
        soundEffects: 'Sound Effects',

        // Random idle messages
        randomMessages: [
            "...zzZ 💤",
            "*yawn* So bored~ 🥱",
            "Hmph, slacking off again? 😏",
            "*stretching* I need a break 😸",
            "Meow~ (not that I want pets) 🐱",
            "So bored... play with me!",
            "*purring* 😻",
            "What are you doing? ...just asking 👀",
            "Got any treats? 🐟",
            "Time for a break, I said so ☕"
        ]
    },

    'ja': {
        // Menu
        talkToMe: '💬 話しかける',
        startFocus: '🍅 集中開始',
        focusing: '🍅 集中中...',
        stopFocus: '⏹ 集中終了',
        minutes: '分',
        reminders: '⏰ リマインダー',
        drinkWater: '💧 水を飲む',
        restEyes: '👀 目を休める',
        stretch: '🧘 ストレッチ',
        settings: '⚙️ 設定',
        autoStart: '🚀 自動起動',
        showHide: '🐱 表示/非表示',
        exit: '❌ 終了',

        // Onboarding
        welcomeBack: 'ふん、やっと来たにゃ~ 😼',
        setupApiKey: '右クリックでAPI Keyを設定するにゃ！🧠',
        apiKeyError: 'API Keyが間違ってるにゃ！設定を確認して 🔑',
        somethingWrong: 'にゃ？何かおかしい...設定を見て？',

        // Reminders
        reminderWater: 'お水を飲む時間だにゃ！💧',
        reminderRest: '遠くを見て目を休めるにゃ~ 👀',
        reminderStretch: '立ち上がってストレッチするにゃ！🧘',
        reminderEnabled: 'リマインダーON ✅',
        reminderDisabled: 'リマインダーOFF',
        reminderConfirmed: '了解にゃ！✅',

        // Errors
        errorNetwork: 'ネットワークエラー... 接続を確認して 🌐',
        errorTimeout: 'サーバーが遅い... 後で試して ⏰',
        errorAuth: 'API Keyが変にゃ、設定を確認? 🔑',
        errorRateLimit: '質問しすぎにゃ！休ませて 😮‍💨',
        errorQuota: 'API残高不足、チャージして 💰',
        errorServer: 'AIサーバーの問題、後で試して 🔧',
        errorUnknown: '何かエラーにゃ... 原因不明 🤔',

        // Settings
        settingsTitle: '設定',
        region: '地域',
        provider: 'プロバイダー',
        apiKey: 'API キー',
        model: 'モデル',
        language: '言語',
        testConnection: '接続テスト',
        save: '保存',
        cancel: 'キャンセル'
    },

    'ko': {
        talkToMe: '💬 대화하기',
        startFocus: '🍅 집중 시작',
        focusing: '🍅 집중 중...',
        stopFocus: '⏹ 집중 종료',
        minutes: '분',
        reminders: '⏰ 알림',
        drinkWater: '💧 물 마시기',
        restEyes: '👀 눈 쉬기',
        stretch: '🧘 스트레칭',
        settings: '⚙️ 설정',
        autoStart: '🚀 자동 시작',
        showHide: '🐱 보이기/숨기기',
        exit: '❌ 종료',
        welcomeBack: '흥, 드디어 왔냥~ 😼',
        setupApiKey: '우클릭해서 API Key 설정하라냥! 🧠',
        reminderWater: '물 마실 시간이다냥! 💧',
        reminderConfirmed: '알겠다냥! ✅'
    },

    'es': {
        talkToMe: '💬 Hablar',
        startFocus: '🍅 Iniciar Enfoque',
        focusing: '🍅 Enfocando...',
        stopFocus: '⏹ Detener',
        minutes: 'min',
        reminders: '⏰ Recordatorios',
        settings: '⚙️ Configuración',
        exit: '❌ Salir',
        welcomeBack: 'Hmph, finalmente llegaste~ 😼',
        setupApiKey: '¡Clic derecho para configurar API Key! 🧠'
    },

    'fr': {
        talkToMe: '💬 Parler',
        startFocus: '🍅 Commencer Focus',
        focusing: '🍅 Focus en cours...',
        stopFocus: '⏹ Arrêter',
        minutes: 'min',
        reminders: '⏰ Rappels',
        settings: '⚙️ Paramètres',
        exit: '❌ Quitter',
        welcomeBack: 'Hmph, tu es enfin là~ 😼',
        setupApiKey: 'Clic droit pour configurer API Key! 🧠'
    },

    'de': {
        talkToMe: '💬 Sprechen',
        startFocus: '🍅 Fokus starten',
        focusing: '🍅 Fokussiert...',
        stopFocus: '⏹ Stoppen',
        minutes: 'Min',
        reminders: '⏰ Erinnerungen',
        settings: '⚙️ Einstellungen',
        exit: '❌ Beenden',
        welcomeBack: 'Hmph, endlich bist du da~ 😼',
        setupApiKey: 'Rechtsklick für API Key Einrichtung! 🧠'
    }
};

let currentLanguage = 'zh-CN';

/**
 * Detect system language and set initial language
 */
function detectLanguage() {
    try {
        const locale = app.getLocale(); // e.g., 'zh-CN', 'en-US', 'ja'

        // Direct match
        if (SUPPORTED_LANGUAGES.includes(locale)) {
            return locale;
        }

        // Match by prefix (e.g., 'en-US' -> 'en')
        const prefix = locale.split('-')[0];
        const match = SUPPORTED_LANGUAGES.find(lang => lang.startsWith(prefix));

        return match || 'en'; // Default to English
    } catch (e) {
        return 'en';
    }
}

/**
 * Initialize i18n with auto-detection
 */
function initI18n() {
    currentLanguage = detectLanguage();
    console.log('[i18n] Language detected:', currentLanguage);
    return currentLanguage;
}

/**
 * Set language manually
 */
function setLanguage(lang) {
    if (SUPPORTED_LANGUAGES.includes(lang)) {
        currentLanguage = lang;
        return true;
    }
    return false;
}

/**
 * Get current language
 */
function getLanguage() {
    return currentLanguage;
}

/**
 * Get translation for a key
 */
function t(key) {
    const langStrings = translations[currentLanguage] || translations['en'];
    return langStrings[key] || translations['en'][key] || key;
}

/**
 * Get all translations for current language
 */
function getTranslations() {
    return translations[currentLanguage] || translations['en'];
}

module.exports = {
    SUPPORTED_LANGUAGES,
    translations,
    initI18n,
    detectLanguage,
    setLanguage,
    getLanguage,
    t,
    getTranslations
};
