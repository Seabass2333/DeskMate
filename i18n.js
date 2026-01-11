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
        skins: '🎨 皮肤',
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
        loopMode: '🔁 循环模式',
        loopModeOn: '循环模式: 开启 🔁',
        loopModeOff: '循环模式: 关闭',
        testReminder: '⚡ 测试提醒',
        testReminderMsg: '⚡ 测试提醒！',

        // Pomodoro
        focusStart: '专注: ${min}m 💪',
        focusStopped: '专注已停止',
        focusComplete: '专注完成！休息一下吧~ ☕',

        // Chat
        thinking: '思考中...',
        connectionFailed: '连接失败... 😿',

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
        getKeyHelp: '获取 API Key (DeepSeek)',
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
        skins: '🎨 Skins',
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
        loopMode: '🔁 Loop Mode',
        loopModeOn: 'Loop Mode: ON 🔁',
        loopModeOff: 'Loop Mode: OFF',
        testReminder: '⚡ Test Reminder',
        testReminderMsg: '⚡ Test Reminder!',

        // Pomodoro
        focusStart: 'Focus: ${min}m 💪',
        focusStopped: 'Focus stopped',
        focusComplete: 'Focus complete! Take a break~ ☕',

        // Chat
        thinking: 'Thinking...',
        connectionFailed: 'Connection failed... 😿',

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
        getKeyHelp: 'Get API Key (DeepSeek)',
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
        loopMode: '🔁 ループモード',
        loopModeOn: 'ループモード: ON 🔁',
        loopModeOff: 'ループモード: OFF',
        testReminder: '⚡ テストリマインダー',
        testReminderMsg: '⚡ テストリマインダー！',
        focusStart: '集中: ${min}m 💪',
        focusStopped: '集中終了',
        focusComplete: '集中完了！休憩しよう~ ☕',
        thinking: '考え中...',
        connectionFailed: '接続失敗... 😿',

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
        cancel: 'キャンセル',
        preferences: '環境設定',
        soundEffects: '効果音',

        // Random idle messages
        randomMessages: [
            "...むにゃむにゃ 💤",
            "*あくび* 退屈だにゃ~ 🥱",
            "ふん、またサボってる？😏",
            "*伸び* 休憩が必要だにゃ 😸",
            "にゃ~（撫でてほしいわけじゃないにゃ）🐱",
            "退屈...遊んでよ！",
            "*ゴロゴロ* 😻",
            "何してるの？...聞いてみただけ 👀",
            "おやつある？🐟",
            "もう休憩したら？私がそう言うんだから ☕"
        ]
    },

    'ko': {
        // Menu
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

        // Onboarding
        welcomeBack: '흥, 드디어 왔냥~ 😼',
        setupApiKey: '우클릭해서 API Key 설정하라냥! 🧠',
        apiKeyError: 'API Key가 잘못됐다냥! 설정 확인해 🔑',
        somethingWrong: '냥? 뭔가 이상해... 설정 확인해봐?',

        // Reminders
        reminderWater: '물 마실 시간이다냥! 💧',
        reminderRest: '먼 곳을 보고 눈 좀 쉬라냥~ 👀',
        reminderStretch: '일어나서 스트레칭 좀 해라냥! 🧘',
        reminderEnabled: '알림 켜짐 ✅',
        reminderDisabled: '알림 꺼짐',
        reminderConfirmed: '알겠다냥! ✅',
        loopMode: '🔁 반복 모드',
        loopModeOn: '반복 모드: ON 🔁',
        loopModeOff: '반복 모드: OFF',
        testReminder: '⚡ 테스트 알림',
        testReminderMsg: '⚡ 테스트 알림!',
        focusStart: '집중: ${min}m 💪',
        focusStopped: '집중 중지됨',
        focusComplete: '집중 완료! 쉬어가자~ ☕',
        thinking: '생각 중...',
        connectionFailed: '연결 실패... 😿',

        // Errors
        errorNetwork: '네트워크 오류... 연결 확인해 🌐',
        errorTimeout: '서버가 너무 느려... 나중에 다시 해봐 ⏰',
        errorAuth: 'API Key가 이상해, 설정 확인해봐? 🔑',
        errorRateLimit: '질문 너무 많아! 좀 쉬게 해줘 😮‍💨',
        errorQuota: 'API 잔액 부족, 충전하고 와 💰',
        errorServer: 'AI 서버 문제, 나중에 다시 해봐 🔧',
        errorUnknown: '뭔가 오류가... 이유는 모르겠어 🤔',

        // Settings
        settingsTitle: '설정',
        region: '지역',
        provider: '공급자',
        apiKey: 'API 키',
        model: '모델',
        language: '언어',
        testConnection: '연결 테스트',
        save: '저장',
        cancel: '취소',
        preferences: '환경 설정',
        soundEffects: '효과음',

        // Random idle messages
        randomMessages: [
            "...졸려 💤",
            "*하품* 심심해냥~ 🥱",
            "흥, 또 농땡이? 😏",
            "*기지개* 나 좀 쉴게 😸",
            "냥~ (쓰다듬어 달라는 건 아냐) 🐱",
            "심심해... 나랑 놀아줘!",
            "*골골송* 😻",
            "뭐해? ...그냥 물어봤어 👀",
            "간식 있어? 🐟",
            "이제 쉴 때 됐잖아? 내가 그렇다면 그런거야 ☕"
        ]
    },

    'es': {
        // Menu
        talkToMe: '💬 Hablar',
        startFocus: '🍅 Iniciar Enfoque',
        focusing: '🍅 Enfocando...',
        stopFocus: '⏹ Detener',
        minutes: 'min',
        reminders: '⏰ Recordatorios',
        drinkWater: '💧 Beber Agua',
        restEyes: '👀 Descansar Ojos',
        stretch: '🧘 Estirarse',
        settings: '⚙️ Configuración',
        autoStart: '🚀 Inicio Automático',
        showHide: '🐱 Mostrar/Ocultar',
        exit: '❌ Salir',

        // Onboarding
        welcomeBack: 'Hmph, finalmente llegaste~ 😼',
        setupApiKey: '¡Clic derecho para configurar API Key! 🧠',
        apiKeyError: '¡La API Key parece incorrecta! Revisa la configuración 🔑',
        somethingWrong: '¿Miau? Algo anda mal... ¿revisa los ajustes?',

        // Reminders
        reminderWater: '¡Hora de beber agua! 💧',
        reminderRest: '¡Mira lejos y descansa tus ojos! 👀',
        reminderStretch: '¡Levántate y estírate! 🧘',
        reminderEnabled: 'Recordatorio activado ✅',
        reminderDisabled: 'Recordatorio desactivado',
        reminderConfirmed: '¡Entendido! ✅',
        loopMode: '🔁 Modo Bucle',
        loopModeOn: 'Modo Bucle: ON 🔁',
        loopModeOff: 'Modo Bucle: OFF',
        testReminder: '⚡ Recordatorio de Prueba',
        testReminderMsg: '⚡ ¡Recordatorio de prueba!',
        focusStart: 'Enfoque: ${min}m 💪',
        focusStopped: 'Enfoque detenido',
        focusComplete: '¡Enfoque completado! Toma un descanso~ ☕',
        thinking: 'Pensando...',
        connectionFailed: 'Conexión fallida... 😿',

        // Errors
        errorNetwork: 'Sin red... revisa tu conexión 🌐',
        errorTimeout: 'Servidor muy lento... intenta luego ⏰',
        errorAuth: 'Clave API incorrecta, ¿revisar? 🔑',
        errorRateLimit: '¡Demasiadas preguntas! Déjame respirar 😮‍💨',
        errorQuota: 'Créditos agotados, hora de recargar 💰',
        errorServer: 'Problemas del servidor AI, intenta luego 🔧',
        errorUnknown: 'Algo salió mal... no sé qué 🤔',

        // Settings
        settingsTitle: 'Configuración',
        region: 'Región',
        provider: 'Proveedor',
        apiKey: 'Clave API',
        model: 'Modelo',
        language: 'Idioma',
        testConnection: 'Probar Conexión',
        save: 'Guardar',
        cancel: 'Cancelar',
        preferences: 'Preferencias',
        soundEffects: 'Efectos de sonido',

        // Random idle messages
        randomMessages: [
            "...zzZ 💤",
            "*bostezo* Qué aburrido~ 🥱",
            "Hmph, ¿holgazaneando de nuevo? 😏",
            "*estirándose* Necesito un descanso 😸",
            "Miau~ (no es que quiera mimos) 🐱",
            "Qué aburrido... ¡juega conmigo!",
            "*ronroneo* 😻",
            "¿Qué haces? ...solo pregunto 👀",
            "¿Tienes premios? 🐟",
            "Hora de un descanso, yo lo digo ☕"
        ]
    },

    'fr': {
        // Menu
        talkToMe: '💬 Parler',
        startFocus: '🍅 Commencer Focus',
        focusing: '🍅 Focus en cours...',
        stopFocus: '⏹ Arrêter',
        minutes: 'min',
        reminders: '⏰ Rappels',
        drinkWater: '💧 Boire de l\'o',
        restEyes: '👀 Reposer les yeux',
        stretch: '🧘 S\'étirer',
        settings: '⚙️ Paramètres',
        autoStart: '🚀 Démarrage Auto',
        showHide: '🐱 Afficher/Masquer',
        exit: '❌ Quitter',

        // Onboarding
        welcomeBack: 'Hmph, tu es enfin là~ 😼',
        setupApiKey: 'Clic droit pour configurer API Key! 🧠',
        apiKeyError: 'La clé API semble incorrecte! Vérifie les paramètres 🔑',
        somethingWrong: 'Miaou? Quelque chose ne va pas... vérifie les réglages?',

        // Reminders
        reminderWater: 'Il est temps de boire de l\'eau! 💧',
        reminderRest: 'Regarde au loin et repose tes yeux! 👀',
        reminderStretch: 'Lève-toi et étire-toi! 🧘',
        reminderEnabled: 'Rappel activé ✅',
        reminderDisabled: 'Rappel désactivé',
        reminderConfirmed: 'Compris! ✅',
        loopMode: '🔁 Mode Boucle',
        loopModeOn: 'Mode Boucle: ON 🔁',
        loopModeOff: 'Mode Boucle: OFF',
        testReminder: '⚡ Rappel Test',
        testReminderMsg: '⚡ Rappel de test!',
        focusStart: 'Focus: ${min}m 💪',
        focusStopped: 'Focus arrêté',
        focusComplete: 'Focus terminé! Prends une pause~ ☕',
        thinking: 'Réflexion...',
        connectionFailed: 'Connexion échouée... 😿',

        // Errors
        errorNetwork: 'Pas de réseau... vérifie ta connexion 🌐',
        errorTimeout: 'Serveur trop lent... réessaye plus tard ⏰',
        errorAuth: 'Clé API incorrecte, vérifier? 🔑',
        errorRateLimit: 'Trop de questions! Laisse-moi respirer 😮‍💨',
        errorQuota: 'Crédits épuisés, il faut recharger 💰',
        errorServer: 'Problèmes serveur AI, réessaye plus tard 🔧',
        errorUnknown: 'Une erreur est survenue... je ne sais pas pourquoi 🤔',

        // Settings
        settingsTitle: 'Paramètres',
        region: 'Région',
        provider: 'Fournisseur',
        apiKey: 'Clé API',
        model: 'Modèle',
        language: 'Langue',
        testConnection: 'Tester Connexion',
        save: 'Enregistrer',
        cancel: 'Annuler',
        preferences: 'Préférences',
        soundEffects: 'Effets sonores',

        // Random idle messages
        randomMessages: [
            "...zzZ 💤",
            "*bâillement* C'est ennuyeux~ 🥱",
            "Hmph, tu traînes encore? 😏",
            "*s'étire* J'ai besoin d'une pause 😸",
            "Miaou~ (ce n'est pas que je veux des caresses) 🐱",
            "C'est ennuyeux... joue avec moi!",
            "*ronronne* 😻",
            "Tu fais quoi? ...je demande juste 👀",
            "Tu as des friandises? 🐟",
            "L'heure de la pause, c'est moi qui le dis ☕"
        ]
    },

    'de': {
        // Menu
        talkToMe: '💬 Sprechen',
        startFocus: '🍅 Fokus starten',
        focusing: '🍅 Fokussiert...',
        stopFocus: '⏹ Stoppen',
        minutes: 'Min',
        reminders: '⏰ Erinnerungen',
        drinkWater: '💧 Wasser trinken',
        restEyes: '👀 Augen ausruhen',
        stretch: '🧘 Dehnen',
        settings: '⚙️ Einstellungen',
        autoStart: '🚀 Autostart',
        showHide: '🐱 Zeigen/Verbergen',
        exit: '❌ Beenden',

        // Onboarding
        welcomeBack: 'Hmph, endlich bist du da~ 😼',
        setupApiKey: 'Rechtsklick für API Key Einrichtung! 🧠',
        apiKeyError: 'API Key scheint falsch zu sein! Überprüfe die Einstellungen 🔑',
        somethingWrong: 'Miau? Irgendwas stimmt nicht... Einstellungen prüfen?',

        // Reminders
        reminderWater: 'Zeit, Wasser zu trinken! 💧',
        reminderRest: 'Schau in die Ferne und ruh‘ deine Augen aus! 👀',
        reminderStretch: 'Steh auf und dehne dich! 🧘',
        reminderEnabled: 'Erinnerung aktiviert ✅',
        reminderDisabled: 'Erinnerung deaktiviert',
        reminderConfirmed: 'Verstanden! ✅',
        loopMode: '🔁 Schleifenmodus',
        loopModeOn: 'Schleifenmodus: AN 🔁',
        loopModeOff: 'Schleifenmodus: AUS',
        testReminder: '⚡ Test Erinnerung',
        testReminderMsg: '⚡ Test Erinnerung!',
        focusStart: 'Fokus: ${min}m 💪',
        focusStopped: 'Fokus gestoppt',
        focusComplete: 'Fokus abgeschlossen! Mach eine Pause~ ☕',
        thinking: 'Denke nach...',
        connectionFailed: 'Verbindung fehlgeschlagen... 😿',

        // Errors
        errorNetwork: 'Kein Netz... überprüfe deine Verbindung 🌐',
        errorTimeout: 'Server zu langsam... versuch es später ⏰',
        errorAuth: 'API Key falsch, prüfen? 🔑',
        errorRateLimit: 'Zu viele Fragen! Lass mich atmen 😮‍💨',
        errorQuota: 'Guthaben aufgebraucht, Zeit aufzuladen 💰',
        errorServer: 'AI Server Probleme, später versuchen 🔧',
        errorUnknown: 'Etwas ist schief gelaufen... weiß nicht was 🤔',

        // Settings
        settingsTitle: 'Einstellungen',
        region: 'Region',
        provider: 'Anbieter',
        apiKey: 'API Key',
        model: 'Modell',
        language: 'Sprache',
        testConnection: 'Verbindung testen',
        save: 'Speichern',
        cancel: 'Abbrechen',
        preferences: 'Einstellungen',
        soundEffects: 'Soundeffekte',

        // Random idle messages
        randomMessages: [
            "...zzZ 💤",
            "*gähn* So langweilig~ 🥱",
            "Hmph, faulenzt du schon wieder? 😏",
            "*strecken* Ich brauche eine Pause 😸",
            "Miau~ (nicht dass ich gestreichelt werden will) 🐱",
            "So langweilig... spiel mit mir!",
            "*schnurren* 😻",
            "Was machst du? ...frage nur so 👀",
            "Hast du Leckerlis? 🐟",
            "Zeit für eine Pause, sag ich ☕"
        ]
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
