/**
 * DeskMate Settings Renderer
 * Handles settings UI logic and communication with main process
 */

// Provider definitions matching config.js structure
const PROVIDERS = {
    china: {
        deepseek: {
            name: 'DeepSeek',
            model: 'deepseek-chat',
            apiKeyUrl: 'https://platform.deepseek.com/api_keys',
            getKeyText: { 'zh-CN': '获取 DeepSeek API Key', 'en': 'Get DeepSeek API Key' }
        },
        moonshot: {
            name: 'Moonshot (Kimi)',
            model: 'moonshot-v1-8k',
            apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
            getKeyText: { 'zh-CN': '获取 Moonshot API Key', 'en': 'Get Moonshot API Key' }
        },
        zhipu: {
            name: { 'zh-CN': '智谱 AI (GLM)', 'en': 'Zhipu AI (GLM)' },
            model: 'glm-4-flash',
            apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
            getKeyText: { 'zh-CN': '获取智谱 API Key', 'en': 'Get Zhipu API Key' }
        },
        qwen: {
            name: { 'zh-CN': '通义千问 (Qwen)', 'en': 'Qwen (Alibaba)' },
            model: 'qwen-turbo',
            apiKeyUrl: 'https://dashscope.console.aliyun.com/apiKey',
            getKeyText: { 'zh-CN': '获取通义千问 API Key', 'en': 'Get Qwen API Key' }
        },
        baichuan: {
            name: { 'zh-CN': '百川 AI', 'en': 'Baichuan AI' },
            model: 'Baichuan2-Turbo',
            apiKeyUrl: 'https://platform.baichuan-ai.com/console/apikey',
            getKeyText: { 'zh-CN': '获取百川 API Key', 'en': 'Get Baichuan API Key' }
        },
        doubao: {
            name: { 'zh-CN': '豆包 (ByteDance)', 'en': 'Doubao (ByteDance)' },
            model: 'doubao-pro-4k',
            apiKeyUrl: 'https://console.volcengine.com/ark',
            getKeyText: { 'zh-CN': '获取豆包 API Key', 'en': 'Get Doubao API Key' }
        }
    },
    global: {
        openrouter: {
            name: { 'zh-CN': 'OpenRouter (推荐)', 'en': 'OpenRouter (Recommended)' },
            model: 'deepseek/deepseek-chat',
            apiKeyUrl: 'https://openrouter.ai/keys',
            getKeyText: { 'zh-CN': '获取 OpenRouter API Key', 'en': 'Get OpenRouter API Key' }
        },
        openai: {
            name: 'OpenAI',
            model: 'gpt-4o-mini',
            apiKeyUrl: 'https://platform.openai.com/api-keys',
            getKeyText: { 'zh-CN': '获取 OpenAI API Key', 'en': 'Get OpenAI API Key' }
        },
        anthropic: {
            name: 'Anthropic Claude',
            model: 'claude-3-haiku-20240307',
            apiKeyUrl: 'https://console.anthropic.com/settings/keys',
            getKeyText: { 'zh-CN': '获取 Claude API Key', 'en': 'Get Claude API Key' }
        },
        gemini: {
            name: 'Google Gemini',
            model: 'gemini-1.5-flash',
            apiKeyUrl: 'https://aistudio.google.com/app/apikey',
            getKeyText: { 'zh-CN': '获取 Gemini API Key', 'en': 'Get Gemini API Key' }
        },
        groq: {
            name: { 'zh-CN': 'Groq (超快)', 'en': 'Groq (Fast)' },
            model: 'llama-3.1-8b-instant',
            apiKeyUrl: 'https://console.groq.com/keys',
            getKeyText: { 'zh-CN': '获取 Groq API Key', 'en': 'Get Groq API Key' }
        },
        together: {
            name: 'Together AI',
            model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
            apiKeyUrl: 'https://api.together.xyz/settings/api-keys',
            getKeyText: { 'zh-CN': '获取 Together API Key', 'en': 'Get Together API Key' }
        },
        mistral: {
            name: 'Mistral AI',
            model: 'mistral-small-latest',
            apiKeyUrl: 'https://console.mistral.ai/api-keys',
            getKeyText: { 'zh-CN': '获取 Mistral API Key', 'en': 'Get Mistral API Key' }
        },
        custom: {
            name: { 'zh-CN': '自定义 API', 'en': 'Custom API' },
            model: '',
            apiKeyUrl: '',
            getKeyText: { 'zh-CN': '使用任意 OpenAI 兼容 API', 'en': 'Use any OpenAI-compatible API' },
            isCustom: true
        }
    },
    local: {
        ollama: {
            name: { 'zh-CN': 'Ollama (本地)', 'en': 'Ollama (Local)' },
            model: 'llama3.2',
            apiKeyUrl: 'https://ollama.ai/download',
            getKeyText: { 'zh-CN': '下载 Ollama', 'en': 'Download Ollama' }
        },
        lmstudio: {
            name: 'LM Studio',
            model: 'local-model',
            apiKeyUrl: 'https://lmstudio.ai/',
            getKeyText: { 'zh-CN': '下载 LM Studio', 'en': 'Download LM Studio' }
        },
        custom_local: {
            name: '自定义本地 API',
            model: '',
            apiKeyUrl: '',
            getKeyText: { 'zh-CN': '使用自定义本地服务', 'en': 'Use custom local server' },
            isCustom: true
        }
    }
};

// Settings page translations
const SETTINGS_I18N = {
    'zh-CN': {
        settingsTitle: '设置',
        providerSection: 'API 供应商',
        region: '区域',
        regionChina: '🇨🇳 中国大陆',
        regionGlobal: '🌍 国际',
        regionLocal: '💻 本地',
        provider: '供应商',
        apiKeySection: 'API 密钥',
        apiKey: 'API Key',
        model: '模型',
        testConnection: '测试连接',
        language: '语言',
        interfaceLanguage: '界面语言',
        soundSection: '音效',
        soundEffects: '启用音效',
        soundVolume: '主音量',
        advancedLlmTitle: '高级 AI 大脑 (自定义 API Key)',
        advancedLlmHint: '默认已启用离线智能陪伴，如需接入专属模型可展开配置',
        advancedTag: '高级/可选',
        coPetSection: '双人共养 (1v1 共享小宠)',
        coPetDesc: '连接唯一伙伴，共同拥有同一只桌面宠物，随时传递隔空摸摸与投喂。',
        coPetMyCode: '我的专属配对码：',
        coPetCopyCode: '生成 / 复制',
        coPetBindBtn: '结成共养',
        coPetUnpairBtn: '解除绑定',
        cancel: '取消',
        save: '保存设置',
        testing: '测试中...',
        sending: '发送中...',
        connectionSuccess: '✓ 连接成功',
        saving: '保存中...',
        vipSection: '👑 VIP 会员',
        skinSection: '🎨 皮肤',
        vipPro: '专业版',
        vipFree: '免费版',
        vipUnlocked: '已通过邀请码解锁: ${code}',
        vipDesc: '输入邀请码解锁高级功能（Pochi 皮肤、无限专注时常等）',
        redeem: '兑换',
        redeeming: '验证中...',
        redeemSuccess: '✅ 成功！已解锁高级功能。',
        redeemInvalid: '❌ 无效的邀请码。',
        redeemEmpty: '⚠️ 请输入邀请码。',
        redeemError: '❌ 错误: ${msg}',
        vipRequired: '此皮肤需要 VIP 会员。',
        vipRequired: '此皮肤需要 VIP 会员。',
        getKeyHelp: '获取 API Key',
        accountSection: '账户',
        accountLinkDesc: '绑定邮箱以跨设备同步 VIP 状态。',
        sendCode: '发送验证码',
        verify: '验证',
        enterCodeDesc: '输入邮箱收到的 6 位验证码。',
        signOut: '退出登录',
        codeSent: '验证码已发送！',
        verifySuccess: '✅ 绑定成功！',
        verifyError: '❌ 验证失败: ${msg}',
        // Feedback Form (v1.3)
        feedbackSection: '意见反馈',
        feedbackCategory: '分类',
        feedbackCategoryBug: '🐛 Bug 反馈',
        feedbackCategoryFeature: '💡 功能建议',
        feedbackCategoryQuestion: '❓ 问题咨询',
        feedbackCategoryOther: '📝 其他',
        feedbackContent: '您的反馈',
        feedbackContentPlaceholder: '请详细描述您的问题或建议...',
        feedbackEmail: '邮箱（可选）',
        feedbackEmailHint: '如需进一步沟通，我们会通过此邮箱联系您。',
        submitFeedback: '提交反馈',
        submittingFeedback: '提交中...',
        feedbackSuccess: '感谢您的反馈！',
        feedbackMinLength: '请至少输入 10 个字符',
        feedbackError: '提交失败: ${msg}',
        // VIP Expiration
        vipExpires: '有效期至: ${date}',
        activated: '已激活',
        redeemErrorGeneric: '兑换失败',
        saveFailed: '保存失败: ${msg}',
        testSuccess: '✓ 连接成功 (${ms}ms)',
        testFailed: '✗ ${msg}',
        // Timer Section
        timerSection: '计时器与提醒',
        pomodoroDuration: '专注时长 (分钟)',
        reminderIntervals: '提醒间隔 (分钟)',
        reminderWater: '💧 喝水',
        reminderEyes: '👁️ 护眼',
        reminderEyes: '👁️ 护眼',
        reminderStretch: '🧘‍♀️ 伸展',
        // Update System
        checkUpdates: '检查更新',
        checkingUpdates: '检查中...',
        updateAvailable: '发现新版本',
        updateNotFound: '已是最新',
        updateError: '检查失败',
        downloadUpdate: '下载更新'
    },
    'en': {
        settingsTitle: 'Settings',
        providerSection: 'API Provider',
        region: 'Region',
        regionChina: '🇨🇳 China',
        regionGlobal: '🌍 Global',
        regionLocal: '💻 Local',
        provider: 'Provider',
        apiKeySection: 'API Key',
        apiKey: 'API Key',
        model: 'Model',
        testConnection: 'Test Connection',
        language: 'Language',
        interfaceLanguage: 'Interface Language',
        soundSection: 'Sound',
        soundEffects: 'Enable Sound Effects',
        soundVolume: 'Master Volume',
        advancedLlmTitle: 'Advanced AI Brain (Custom API Key)',
        advancedLlmHint: 'Smart offline companion active. Expand to configure your own model.',
        advancedTag: 'Advanced / Optional',
        coPetSection: '1v1 Shared Pet',
        coPetDesc: 'Connect with one partner to co-raise the same desktop pet across screens.',
        coPetMyCode: 'My Pair Code:',
        coPetCopyCode: 'Generate / Copy',
        coPetBindBtn: 'Pair Now',
        coPetUnpairBtn: 'Unpair',
        cancel: 'Cancel',
        save: 'Save Settings',
        testing: 'Testing...',
        sending: 'Sending...',
        connectionSuccess: '✓ Connected',
        saving: 'Saving...',
        vipSection: '👑 VIP Membership',
        skinSection: '🎨 Skin',
        vipPro: 'PRO MEMBER',
        vipFree: 'FREE',
        vipUnlocked: 'Unlocked via code: ${code}',
        vipDesc: 'Enter invite code for premium features (Pochi skin, unlimited Pomodoro, etc.)',
        redeem: 'Redeem',
        redeeming: 'Checking...',
        redeemSuccess: '✅ Success! Features unlocked.',
        redeemInvalid: '❌ Invalid code.',
        redeemEmpty: '⚠️ Please enter a code.',
        redeemError: '❌ Error: ${msg}',
        vipRequired: 'This skin requires VIP membership.',
        getKeyHelp: 'Get API Key',
        accountSection: 'Account',
        accountLinkDesc: 'Link email to sync VIP status across devices.',
        sendCode: 'Send Code',
        verify: 'Verify',
        enterCodeDesc: 'Enter the 6-digit code sent to your email.',
        signOut: 'Sign Out',
        codeSent: 'Code sent!',
        verifySuccess: '✅ Details linked!',
        verifyError: '❌ Verification failed: ${msg}',
        // Feedback Form (v1.3)
        feedbackSection: 'Feedback',
        feedbackCategory: 'Category',
        feedbackCategoryBug: '🐛 Bug Report',
        feedbackCategoryFeature: '💡 Feature Request',
        feedbackCategoryQuestion: '❓ Question',
        feedbackCategoryOther: '📝 Other',
        feedbackContent: 'Your Feedback',
        feedbackContentPlaceholder: 'Tell us what\'s on your mind...',
        feedbackEmail: 'Email (optional)',
        feedbackEmailHint: 'We\'ll only contact you if we need more info.',
        submitFeedback: 'Submit Feedback',
        submittingFeedback: 'Submitting...',
        feedbackSuccess: 'Thank you for your feedback!',
        feedbackMinLength: 'Please enter at least 10 characters',
        feedbackError: 'Failed to submit: ${msg}',
        // VIP Expiration
        vipExpires: 'Valid until: ${date}',
        activated: 'Activated',
        redeemErrorGeneric: 'Error redeeming code',
        saveFailed: 'Save failed: ${msg}',
        testSuccess: '✓ Connected (${ms}ms)',
        testFailed: '✗ ${msg}',
        // Timer Section
        timerSection: 'Timers & Reminders',
        pomodoroDuration: 'Focus Duration (min)',
        reminderIntervals: 'Reminder Intervals (min)',
        reminderWater: '💧 Water',
        reminderEyes: '👁️ Eyes',
        reminderStretch: '🧘‍♀️ Stretch',
        // Update System
        checkUpdates: 'Check Updates',
        checkingUpdates: 'Checking...',
        updateAvailable: 'Update Available',
        updateNotFound: 'Up to date',
        updateError: 'Check failed',
        downloadUpdate: 'Download'
    },
    'ja': {
        settingsTitle: '設定',
        providerSection: 'APIプロバイダー',
        region: '地域',
        regionChina: '🇨🇳 中国',
        regionGlobal: '🌍 グローバル',
        regionLocal: '💻 ローカル',
        provider: 'プロバイダー',
        apiKeySection: 'APIキー',
        apiKey: 'APIキー',
        model: 'モデル',
        testConnection: '接続テスト',
        language: '言語',
        interfaceLanguage: 'インターフェース言語',
        cancel: 'キャンセル',
        save: '保存',
        testing: 'テスト中...',
        sending: '送信中...',
        connectionSuccess: '✓ 接続成功',
        saving: '保存中...',
        vipSection: '👑 VIP メンバーシップ',
        skinSection: '🎨 スキン',
        vipPro: 'プロ会員',
        vipFree: '無料',
        vipUnlocked: 'コードでロック解除済み: ${code}',
        vipDesc: '招待コードを入力してプレミアム機能をロック解除',
        redeem: '引き換える',
        redeeming: '確認中...',
        redeemSuccess: '✅ 成功！機能がロック解除されました。',
        redeemInvalid: '❌ 無効なコードです。',
        redeemEmpty: '⚠️ コードを入力してください。',
        redeemError: '❌ エラー: ${msg}',
        vipRequired: 'このスキンにはVIPメンバーシップが必要です。',
        getKeyHelp: 'API Keyを取得',
        // Feedback (v1.3)
        feedbackSection: 'フィードバック',
        feedbackCategory: 'カテゴリ',
        feedbackCategoryBug: '🐛 バグ報告',
        feedbackCategoryFeature: '💡 機能リクエスト',
        feedbackCategoryQuestion: '❓ 質問',
        feedbackCategoryOther: '📝 その他',
        feedbackContent: 'ご意見',
        feedbackContentPlaceholder: 'ご意見をお聞かせください...',
        feedbackEmail: 'メール（任意）',
        feedbackEmailHint: '必要に応じてご連絡します',
        submitFeedback: '送信',
        submittingFeedback: '送信中...',
        feedbackSuccess: 'ご意見ありがとうございます！',
        feedbackMinLength: '10文字以上を入力してください',
        feedbackError: '送信失敗: ${msg}',
        vipExpires: '有効期限: ${date}',
        activated: '有効化済み',
        redeemErrorGeneric: '引き換えに失敗しました',
        saveFailed: '保存に失敗: ${msg}',
        testSuccess: '✓ 接続成功 (${ms}ms)',
        testFailed: '✗ ${msg}',
        // Timer Section
        timerSection: 'タイマーとリマインダー',
        pomodoroDuration: '集中時間 (分)',
        reminderIntervals: 'リマインダー間隔 (分)',
        reminderWater: '💧 水分',
        reminderEyes: '👁️ 目の休憩',
        reminderStretch: '🧘‍♀️ ストレッチ',
        // Update System
        checkUpdates: '更新を確認',
        checkingUpdates: '確認中...',
        updateAvailable: '更新あり',
        updateNotFound: '最新です',
        updateError: '確認失敗',
        downloadUpdate: 'ダウンロード'
    },
    'ko': {
        settingsTitle: '설정',
        providerSection: 'API 제공자',
        region: '지역',
        regionChina: '🇨🇳 중국',
        regionGlobal: '🌍 글로벌',
        regionLocal: '💻 로컬',
        provider: '제공자',
        apiKeySection: 'API 키',
        apiKey: 'API 키',
        model: '모델',
        testConnection: '연결 테스트',
        language: '언어',
        interfaceLanguage: '인터페이스 언어',
        cancel: '취소',
        save: '저장',
        testing: '테스트 중...',
        sending: '전송 중...',
        connectionSuccess: '✓ 연결 성공',
        saving: '저장 중...',
        vipSection: '👑 VIP 멤버십',
        skinSection: '🎨 스킨',
        vipPro: '프로 회원',
        vipFree: '무료',
        vipUnlocked: '코드 ${code}로 잠금 해제됨',
        vipDesc: '초대 코드를 입력하여 프리미엄 기능을 잠금 해제하세요',
        redeem: '사용하기',
        redeeming: '확인 중...',
        redeemSuccess: '✅ 성공! 기능이 잠금 해제되었습니다.',
        redeemInvalid: '❌ 유효하지 않은 코드입니다.',
        redeemEmpty: '⚠️ 코드를 입력해주세요.',
        redeemError: '❌ 오류: ${msg}',
        vipRequired: '이 스킨은 VIP 멤버십이 필요합니다.',
        getKeyHelp: 'API Key 받기',
        // Feedback (v1.3)
        feedbackSection: '피드백',
        feedbackCategory: '카테고리',
        feedbackCategoryBug: '🐛 버그 신고',
        feedbackCategoryFeature: '💡 기능 요청',
        feedbackCategoryQuestion: '❓ 질문',
        feedbackCategoryOther: '📝 기타',
        feedbackContent: '피드백 내용',
        feedbackContentPlaceholder: '의견을 남겨주세요...',
        feedbackEmail: '이메일 (선택)',
        feedbackEmailHint: '필요시 연락드립니다',
        submitFeedback: '제출',
        submittingFeedback: '제출 중...',
        feedbackSuccess: '피드백 감사합니다!',
        feedbackMinLength: '10자 이상 입력하세요',
        feedbackError: '제출 실패: ${msg}',
        vipExpires: '만료일: ${date}',
        activated: '활성화됨',
        redeemErrorGeneric: '코드 사용 실패',
        saveFailed: '저장 실패: ${msg}',
        testSuccess: '✓ 연결 성공 (${ms}ms)',
        testFailed: '✗ ${msg}',
        // Timer Section
        timerSection: '타이머 & 알림',
        pomodoroDuration: '집중 시간 (분)',
        reminderIntervals: '알림 간격 (분)',
        reminderWater: '💧 물',
        reminderEyes: '👁️ 눈 휴식',
        reminderStretch: '🧘‍♀️ 伸展',
        // Update System
        checkUpdates: '업데이트 확인',
        checkingUpdates: '확인 중...',
        updateAvailable: '업데이트 가능',
        updateNotFound: '최신 버전임',
        updateError: '확인 실패',
        downloadUpdate: '다운로드'
    },
    'es': {
        settingsTitle: 'Configuración',
        // ... (preserving content using multi_replace approach would be safer but replace_file is chunk based)
        // Wait, I am in replace_file_content tool, I cannot view the file in the middle.
        // I need to only target the end of each language block.
        // It's safer to use multi_replace.

        providerSection: 'Proveedor API',
        region: 'Región',
        regionChina: '🇨🇳 China',
        regionGlobal: '🌍 Global',
        regionLocal: '💻 Local',
        provider: 'Proveedor',
        apiKeySection: 'Clave API',
        apiKey: 'Clave API',
        model: 'Modelo',
        testConnection: 'Probar Conexión',
        language: 'Idioma',
        interfaceLanguage: 'Idioma de Interfaz',
        cancel: 'Cancelar',
        save: 'Guardar',
        testing: 'Probando...',
        sending: 'Enviando...',
        connectionSuccess: '✓ Conectado',
        saving: 'Guardando...',
        vipSection: '👑 Membresía VIP',
        skinSection: '🎨 Skin',
        vipPro: 'MIEMBRO PRO',
        vipFree: 'GRATIS',
        vipUnlocked: 'Desbloqueado vía código: ${code}',
        vipDesc: 'Ingresa código de invitación para funciones premium',
        redeem: 'Canjear',
        redeeming: 'Comprobando...',
        redeemSuccess: '✅ ¡Éxito! Funciones desbloqueadas.',
        redeemInvalid: '❌ Código inválido.',
        redeemEmpty: '⚠️ Ingresa un código.',
        redeemError: '❌ Error: ${msg}',
        vipRequired: 'Este skin requiere membresía VIP.',
        getKeyHelp: 'Obtener API Key',
        // Feedback (v1.3)
        feedbackSection: 'Comentarios',
        feedbackCategory: 'Categoría',
        feedbackCategoryBug: '🐛 Error',
        feedbackCategoryFeature: '💡 Sugerencia',
        feedbackCategoryQuestion: '❓ Pregunta',
        feedbackCategoryOther: '📝 Otro',
        feedbackContent: 'Tu comentario',
        feedbackContentPlaceholder: 'Cuéntanos tu opinión...',
        feedbackEmail: 'Email (opcional)',
        feedbackEmailHint: 'Solo te contactaremos si es necesario',
        submitFeedback: 'Enviar',
        submittingFeedback: 'Enviando...',
        feedbackSuccess: '¡Gracias por tu comentario!',
        feedbackMinLength: 'Mínimo 10 caracteres',
        feedbackError: 'Error: ${msg}',
        vipExpires: 'Válido hasta: ${date}',
        activated: 'Activado',
        redeemErrorGeneric: 'Error al canjear',
        saveFailed: 'Error al guardar: ${msg}',
        testSuccess: '✓ Conectado (${ms}ms)',
        testFailed: '✗ ${msg}',
        // Timer Section
        timerSection: 'Temporizadores',
        pomodoroDuration: 'Duración (min)',
        reminderIntervals: 'Intervalo (min)',
        reminderWater: '💧 Agua',
        reminderEyes: '👁️ Ojos',
        reminderStretch: '🧘‍♀️ Estirar',
        // Update System
        checkUpdates: 'Buscar Actualizaciones',
        checkingUpdates: 'Buscando...',
        updateAvailable: 'Actualización Disponible',
        updateNotFound: 'Al día',
        updateError: 'Error al buscar',
        downloadUpdate: 'Descargar'
    },
    'fr': {
        settingsTitle: 'Paramètres',
        providerSection: 'Fournisseur API',
        region: 'Région',
        regionChina: '🇨🇳 Chine',
        regionGlobal: '🌍 Global',
        regionLocal: '💻 Local',
        provider: 'Fournisseur',
        apiKeySection: 'Clé API',
        apiKey: 'Clé API',
        model: 'Modèle',
        testConnection: 'Tester Connexion',
        language: 'Langue',
        interfaceLanguage: 'Langue d\'interface',
        cancel: 'Annuler',
        save: 'Enregistrer',
        testing: 'Test...',
        sending: 'Envoi...',
        connectionSuccess: '✓ Connecté',
        saving: 'Enregistrement...',
        vipSection: '👑 Membre VIP',
        skinSection: '🎨 Thème',
        vipPro: 'MEMBRE PRO',
        vipFree: 'GRATUIT',
        vipUnlocked: 'Débloqué via code: ${code}',
        vipDesc: 'Entrez le code d\'invitation pour les fonctions premium',
        redeem: 'Échanger',
        redeeming: 'Vérification...',
        redeemSuccess: '✅ Succès! Fonctions débloquées.',
        redeemInvalid: '❌ Code invalide.',
        redeemEmpty: '⚠️ Veuillez entrer un code.',
        redeemError: '❌ Erreur: ${msg}',
        vipRequired: 'Ce thème nécessite un membre VIP.',
        getKeyHelp: 'Obtenir Clé API',
        // Feedback (v1.3)
        feedbackSection: 'Avis',
        feedbackCategory: 'Catégorie',
        feedbackCategoryBug: '🐛 Bug',
        feedbackCategoryFeature: '💡 Idée',
        feedbackCategoryQuestion: '❓ Question',
        feedbackCategoryOther: '📝 Autre',
        feedbackContent: 'Votre avis',
        feedbackContentPlaceholder: 'Dites-nous ce que vous pensez...',
        feedbackEmail: 'Email (optionnel)',
        feedbackEmailHint: 'Nous vous contacterons si nécessaire',
        submitFeedback: 'Envoyer',
        submittingFeedback: 'Envoi...',
        feedbackSuccess: 'Merci pour votre avis!',
        feedbackMinLength: 'Minimum 10 caractères',
        feedbackError: 'Erreur: ${msg}',
        vipExpires: 'Valide jusqu\'au: ${date}',
        activated: 'Activé',
        redeemErrorGeneric: 'Échec de l\'échange',
        saveFailed: 'Échec de sauvegarde: ${msg}',
        testSuccess: '✓ Connecté (${ms}ms)',
        testFailed: '✗ ${msg}',
        // Timer Section
        timerSection: 'Minuteries',
        pomodoroDuration: 'Durée (min)',
        reminderIntervals: 'Intervalle (min)',
        reminderWater: '💧 Eau',
        reminderEyes: '👁️ Yeux',
        reminderStretch: '🧘‍♀️ Étirement',
        // Update System
        checkUpdates: 'Vérifier MàJ',
        checkingUpdates: 'Vérification...',
        updateAvailable: 'Mise à jour disponible',
        updateNotFound: 'À jour',
        updateError: 'Échec vérification',
        downloadUpdate: 'Télécharger'
    },
    'de': {
        settingsTitle: 'Einstellungen',
        providerSection: 'API Anbieter',
        region: 'Region',
        regionChina: '🇨🇳 China',
        regionGlobal: '🌍 Global',
        regionLocal: '💻 Lokal',
        provider: 'Anbieter',
        apiKeySection: 'API Key',
        apiKey: 'API Key',
        model: 'Modell',
        testConnection: 'Verbindung testen',
        language: 'Sprache',
        interfaceLanguage: 'Interface Sprache',
        cancel: 'Abbrechen',
        save: 'Speichern',
        testing: 'Testen...',
        sending: 'Senden...',
        connectionSuccess: '✓ Verbunden',
        saving: 'Speichern...',
        vipSection: '👑 VIP Mitgliedschaft',
        skinSection: '🎨 Skin',
        vipPro: 'PRO MITGLIED',
        vipFree: 'KOSTENLOS',
        vipUnlocked: 'Freigeschaltet mit Code: ${code}',
        vipDesc: 'Einladungscode eingeben für Premium-Funktionen',
        redeem: 'Einlösen',
        redeeming: 'Prüfen...',
        redeemSuccess: '✅ Erfolg! Funktionen freigeschaltet.',
        redeemInvalid: '❌ Ungültiger Code.',
        redeemEmpty: '⚠️ Bitte Code eingeben.',
        redeemError: '❌ Fehler: ${msg}',
        vipRequired: 'Dieser Skin benötigt VIP-Mitgliedschaft.',
        getKeyHelp: 'API Key erhalten',
        // Feedback (v1.3)
        feedbackSection: 'Feedback',
        feedbackCategory: 'Kategorie',
        feedbackCategoryBug: '🐛 Bug',
        feedbackCategoryFeature: '💡 Vorschlag',
        feedbackCategoryQuestion: '❓ Frage',
        feedbackCategoryOther: '📝 Andere',
        feedbackContent: 'Ihr Feedback',
        feedbackContentPlaceholder: 'Teilen Sie uns Ihre Meinung mit...',
        feedbackEmail: 'Email (optional)',
        feedbackEmailHint: 'Wir kontaktieren Sie nur bei Bedarf',
        submitFeedback: 'Senden',
        submittingFeedback: 'Senden...',
        feedbackSuccess: 'Danke für Ihr Feedback!',
        feedbackMinLength: 'Mindestens 10 Zeichen',
        feedbackError: 'Fehler: ${msg}',
        vipExpires: 'Gültig bis: ${date}',
        activated: 'Aktiviert',
        redeemErrorGeneric: 'Einlösen fehlgeschlagen',
        saveFailed: 'Speichern fehlgeschlagen: ${msg}',
        testSuccess: '✓ Verbunden (${ms}ms)',
        testFailed: '✗ ${msg}',
        // Timer Section
        timerSection: 'Timer & Erinnerungen',
        pomodoroDuration: 'Fokuszeit (Min)',
        reminderIntervals: 'Intervall (Min)',
        reminderWater: '💧 Wasser',
        reminderEyes: '👁️ Augen',
        reminderStretch: '🧘‍♀️ Dehnen',
        // Update System
        checkUpdates: 'Nach Updates suchen',
        checkingUpdates: 'Prüfen...',
        updateAvailable: 'Update verfügbar',
        updateNotFound: 'Auf dem neuesten Stand',
        updateError: 'Fehler beim Prüfen',
        downloadUpdate: 'Herunterladen'
    }
};

let currentLang = 'zh-CN';

/**
 * Apply translations to all elements with data-i18n attribute
 */
function applyI18n(lang) {
    currentLang = lang;
    const translations = SETTINGS_I18N[lang] || SETTINGS_I18N['en'];

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            el.textContent = translations[key];
        }
    });

    // Update document title
    document.title = `DeskMate ${translations.settingsTitle}`;

    // Refresh provider dropdown with new language
    if (regionSelect && providerSelect) {
        const currentProvider = providerSelect.value;
        populateProviders(regionSelect.value);
        // Restore selection if it still exists
        if ([...providerSelect.options].some(o => o.value === currentProvider)) {
            providerSelect.value = currentProvider;
        }
    }

    // Refresh VIP status UI with new language
    if (typeof cachedVipStatus !== 'undefined' && cachedVipStatus) {
        updateVipStatusUI(cachedVipStatus);
    }
}

/**
 * Get translation for current language
 */
function t(key) {
    const translations = SETTINGS_I18N[currentLang] || SETTINGS_I18N['en'];
    return translations[key] || key;
}

// DOM Elements (Existing)
const regionSelect = document.getElementById('region');
const providerSelect = document.getElementById('provider');
const apiKeyInput = document.getElementById('apiKey');
const modelInput = document.getElementById('model');
const toggleKeyBtn = document.getElementById('toggleKey');
const testBtn = document.getElementById('testConnection');
const testResult = document.getElementById('testResult');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const languageSelect = document.getElementById('language');

// Wrapper for new elements (handle if they are missing during transition)
const skinSelect = document.getElementById('skin-select');
const skinPreviewContainer = document.getElementById('skin-preview-container');
const vipStatusBadge = document.getElementById('vip-status-badge');
const vipStatusText = document.getElementById('vip-status-text');
const vipInputContainer = document.getElementById('vip-input-container');
const vipCodeInput = document.getElementById('vip-code-input');
const vipRedeemBtn = document.getElementById('vip-redeem-btn');
const vipMessage = document.getElementById('vip-message');
const vipLockMsg = document.getElementById('vip-lock-msg');

// Timer Inputs
const pomodoroInput = document.getElementById('pomodoroDuration');
const waterInput = document.getElementById('waterInterval');
const restInput = document.getElementById('restInterval');
const stretchInput = document.getElementById('stretchInterval');

// State
let currentSettings = null;
let keyVisible = false;
let availableSkins = [];
let isVip = false;
let cachedVipStatus = null;

/**
 * Initialize the settings page
 */
/**
 * Initialize the settings page
 */
async function init() {
    try {
        console.log('[Settings] Initializing...');

        // Load current settings
        currentSettings = await window.settingsAPI.getSettings();
        console.log('[Settings] Loaded settings:', currentSettings);

        if (!currentSettings) {
            throw new Error('Failed to load settings (result is null)');
        }

        availableSkins = currentSettings.availableSkins || [];
        isVip = currentSettings.vipStatus?.enabled || false;

        // Populate provider dropdown based on region
        populateProviders(currentSettings.region || 'global');

        // Populate skins
        populateSkins(availableSkins, currentSettings.currentSkin);
        cachedVipStatus = currentSettings.vipStatus;
        updateVipStatusUI(currentSettings.vipStatus);

        // Set initial values (API)
        regionSelect.value = currentSettings.region || 'global';
        providerSelect.value = currentSettings.provider || 'openrouter';
        apiKeyInput.value = currentSettings.apiKey || '';
        modelInput.value = currentSettings.model || '';

        // Timer Defaults
        if (pomodoroInput) pomodoroInput.value = currentSettings.pomodoro?.defaultDuration || 25;
        if (waterInput) waterInput.value = currentSettings.reminders?.intervals?.water || 30;
        if (restInput) restInput.value = currentSettings.reminders?.intervals?.rest || 20;
        if (stretchInput) stretchInput.value = currentSettings.reminders?.intervals?.stretch || 45;

        // Update API key help link
        const initialConfig = PROVIDERS[currentSettings.region || 'china']?.[currentSettings.provider || 'deepseek'];
        if (initialConfig) {
            updateApiKeyHelpLink(initialConfig);
        }

        // Set sound toggle
        const soundToggle = document.getElementById('soundEnabled');
        if (soundToggle) {
            soundToggle.checked = currentSettings.soundEnabled !== false;
        }

        // Set master volume slider
        const volumeSlider = document.getElementById('soundVolume');
        const volumeBadge = document.getElementById('volume-value');
        if (volumeSlider) {
            const vol = typeof currentSettings.soundVolume === 'number' ? currentSettings.soundVolume : 30;
            volumeSlider.value = vol;
            if (volumeBadge) volumeBadge.textContent = `${vol}%`;
            volumeSlider.addEventListener('input', () => {
                if (volumeBadge) volumeBadge.textContent = `${volumeSlider.value}%`;
            });
        }

        // Advanced LLM section defaults to collapsed
        const advancedLlmDetails = document.getElementById('advanced-llm-details');
        if (advancedLlmDetails) {
            advancedLlmDetails.open = false;
        }

        // Load language
        if (languageSelect && window.settingsAPI.getLanguage) {
            const lang = await window.settingsAPI.getLanguage();
            languageSelect.value = lang || 'zh-CN';
            applyI18n(lang || 'zh-CN');
        }

        // Display app version
        // Display app version and update check
        // Display app version and update check
        if (window.settingsAPI.getAppVersion) {
            const version = await window.settingsAPI.getAppVersion();
            const versionText = document.getElementById('app-version-text');
            const versionContainer = document.getElementById('version-container');

            if (versionText) {
                versionText.textContent = `v${version}`;

                // Add Check Update Button if container exists
                if (versionContainer && !versionContainer.querySelector('.check-update-btn')) {
                    const checkBtn = document.createElement('button');
                    checkBtn.textContent = t('checkUpdates');
                    checkBtn.className = 'btn-secondary btn-sm check-update-btn';
                    checkBtn.style.marginLeft = '10px';
                    checkBtn.style.padding = '2px 8px';
                    checkBtn.style.fontSize = '11px';

                    // Find insertion point (row)
                    const row = versionContainer.querySelector('.version-row');
                    if (row) row.appendChild(checkBtn);
                    else versionContainer.appendChild(checkBtn);

                    const messageEl = document.getElementById('update-message');

                    // Helper to safely set message with multiple links
                    const setUpdateMessage = (html, type) => {
                        if (!messageEl) return;
                        messageEl.innerHTML = html;
                        messageEl.className = `update-message ${type}`;

                        // Attach click handlers to any links we just added
                        const links = messageEl.querySelectorAll('a[data-url]');
                        links.forEach(link => {
                            link.onclick = (e) => {
                                e.preventDefault();
                                window.settingsAPI.openExternal(link.dataset.url);
                            };
                        });
                    };

                    let latestDownloadUrl = null;

                    const renderAvailableUpdate = (data) => {
                        if (!data || !data.version) return;
                        isUpdateFound = true;
                        const githubUrl = data.githubUrl || 'https://github.com/Seabass2333/DeskMate/releases/latest';
                        const landingUrl = data.landingUrl || 'https://seabass2333.github.io/DeskMate/';
                        latestDownloadUrl = data.downloadUrl || landingUrl;

                        checkBtn.textContent = `⬇️ ${t('downloadUpdate')} v${data.version}`;
                        checkBtn.disabled = false;

                        setUpdateMessage(
                            `🎉 ${t('updateAvailable')}: <strong>v${data.version}</strong><br/>` +
                            `<a href="#" data-url="${latestDownloadUrl}">🚀 直接下载安装包</a> | ` +
                            `<a href="#" data-url="${landingUrl}">官网落地页</a> | ` +
                            `<a href="#" data-url="${githubUrl}">GitHub</a>`,
                            'success'
                        );
                    };

                    // Check Update Handler (or Direct Download if update already found)
                    checkBtn.onclick = async () => {
                        if (isUpdateFound && latestDownloadUrl) {
                            window.settingsAPI.openExternal(latestDownloadUrl);
                            return;
                        }
                        checkBtn.disabled = true;
                        checkBtn.textContent = t('checkingUpdates');
                        isUpdateFound = false;
                        if (messageEl) {
                            messageEl.textContent = '';
                            messageEl.className = 'update-message';
                        }
                        await window.settingsAPI.checkUpdate();
                    };

                    // Pre-populate if main process already found an update in background
                    if (window.settingsAPI.getLatestUpdateInfo) {
                        window.settingsAPI.getLatestUpdateInfo().then((cached) => {
                            if (cached && cached.hasUpdate) {
                                renderAvailableUpdate(cached);
                            }
                        }).catch(() => {});
                    }

                    // Update Status Listener
                    window.settingsAPI.onUpdateStatus(({ status, data }) => {
                        console.log('Update Status:', status, data);
                        switch (status) {
                            case 'checking':
                                checkBtn.textContent = t('checkingUpdates');
                                break;
                            case 'available':
                                renderAvailableUpdate(data);
                                break;
                            case 'not-available':
                                checkBtn.disabled = false;
                                checkBtn.textContent = t('checkUpdates');
                                setUpdateMessage(`✓ ${t('updateNotFound')}`, 'success');
                                setTimeout(() => {
                                    if (messageEl && messageEl.textContent.includes(t('updateNotFound'))) {
                                        messageEl.textContent = '';
                                    }
                                }, 5000);
                                break;
                            case 'downloading':
                                checkBtn.textContent = `Downloading ${Math.round(data.percent)}%`;
                                break;
                            case 'error':
                                if (isUpdateFound && latestDownloadUrl) {
                                    return;
                                }
                                checkBtn.disabled = false;
                                checkBtn.textContent = t('checkUpdates');
                                setUpdateMessage(
                                    `${t('updateError')} — <a href="#" data-url="https://seabass2333.github.io/DeskMate/">前往官网查看</a>`,
                                    'error'
                                );
                                break;
                        }
                    });
                }
            } else {
                // Fallback for old footer logic (if HTML revert happens or partial load)
                const versionEl = document.getElementById('app-version');
                if (versionEl) versionEl.textContent = `v${version}`;
            }
        }

        // Event listeners
        regionSelect.addEventListener('change', onRegionChange);
        providerSelect.addEventListener('change', onProviderChange);
        toggleKeyBtn.addEventListener('click', toggleKeyVisibility);
        testBtn.addEventListener('click', testConnection);
        saveBtn?.addEventListener('click', saveSettings);
        // Bind new save button if my previous edit added a duplicate ID
        const newSaveBtn = document.getElementById('save-settings');
        if (newSaveBtn) newSaveBtn.addEventListener('click', saveSettings);

        cancelBtn.addEventListener('click', closeWindow);
        languageSelect?.addEventListener('change', () => applyI18n(languageSelect.value));

        // New Event Listeners
        skinSelect?.addEventListener('change', onSkinChange);
        vipRedeemBtn?.addEventListener('click', redeemInviteCode);

        // Dev: Reset VIP
        document.getElementById('reset-vip-btn')?.addEventListener('click', async () => {
            if (confirm('Reset VIP status to Free? This will lock skins and features.')) {
                await window.settingsAPI.resetVip();
                // Reload settings to refresh UI
                const newStatus = await window.settingsAPI.getVipStatus();
                updateVipStatusUI(newStatus);

                // Also refresh stats as skin might change
                currentSettings = await window.settingsAPI.getSettings();
                isVip = newStatus?.enabled || false; // Update global state

                populateSkins(availableSkins, currentSettings.skin);
                updateTimerLocks(); // Update locks

                alert('VIP reset to Free.');
            }
        });

        // Init Auth
        initAuth();

        // Initial Timer Lock Check
        updateTimerLocks();

        // Enhance Invite Code UX
        if (vipCodeInput && vipRedeemBtn) {
            // Initial state
            vipRedeemBtn.disabled = !vipCodeInput.value.trim();
            // Gray out button style handled by CSS :disabled selector usually, 
            // otherwise add class? standard HTML disabled attribute usually suffices for default button styles.

            vipCodeInput.addEventListener('input', () => {
                const val = vipCodeInput.value.trim();
                vipRedeemBtn.disabled = !val;

                // Clear error message when user starts typing again
                if (vipMessage && vipMessage.textContent) {
                    vipMessage.textContent = '';
                    vipMessage.className = 'vip-message';
                }
            });

            vipCodeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !vipRedeemBtn.disabled) {
                    redeemInviteCode();
                }
            });
        }

        console.log('[Settings] Init complete');
    } catch (error) {
        console.error('[Settings] Init error:', error);
        alert('Settings Init Error: ' + error.message + '\n' + error.stack);
    }
}

// Global error handler
window.onerror = function (msg, url, line, col, error) {
    alert('Global Error: ' + msg + '\nLine: ' + line);
    return false;
};

/**
 * Populate skin dropdown
 */
function populateSkins(skins, currentSkinId) {
    if (!skinSelect) return;

    skinSelect.innerHTML = '';

    skins.forEach(skin => {
        const option = document.createElement('option');
        option.value = skin.id;
        // Add lock emoji if locked
        const isLocked = !isVip && skin.id !== 'mochi-v1';
        option.textContent = (isLocked ? '🔒 ' : '') + skin.name;
        if (isLocked) {
            // option.disabled = true; // Use softer lock logic for better UX
            option.setAttribute('data-locked', 'true');
        }
        skinSelect.appendChild(option);
    });

    skinSelect.value = currentSkinId || 'mochi-v1';
    updateSkinPreview(currentSkinId || 'mochi-v1');
}

/**
 * Handle skin change
 */
function onSkinChange() {
    const skinId = skinSelect.value;
    updateSkinPreview(skinId);
}

/**
 * Update skin preview image and lock status
 */
function updateSkinPreview(skinId) {
    const skin = availableSkins.find(s => s.id === skinId);
    if (!skin) return;

    // Update preview
    if (skinPreviewContainer) {
        // Clear previous content
        skinPreviewContainer.innerHTML = '';

        if (skin.previewSpriteRel || skin.previewSprite) {
            // Create sprite preview div
            const spriteDiv = document.createElement('div');
            const spriteUrl = (skin.previewSpriteRel || skin.previewSprite).replace(/\\/g, '/');
            spriteDiv.style.backgroundImage = `url("${spriteUrl}")`;
            spriteDiv.style.backgroundRepeat = 'no-repeat';

            // Dimensions setup
            const [baseW, baseH] = skin.baseSize || [32, 32];

            // Animation Data
            const anim = skin.idleAnimation;
            const frames = anim ? anim.frames : 1;
            const speed = anim ? anim.speed : 1000;

            // Set container size (unscaled)
            spriteDiv.style.width = `${baseW}px`;
            spriteDiv.style.height = `${baseH}px`;

            // Background Size: width * frames
            const totalWidth = baseW * frames;
            spriteDiv.style.backgroundSize = `${totalWidth}px ${baseH}px`;

            // Transform for visibility - use smaller scale for larger base sprites
            const baseMaxDim = Math.max(baseW, baseH);
            // Target ~100px display, but cap scale for very large sprites
            const scale = baseMaxDim >= 64 ? 2 : 3;
            // Move larger sprites up to center them visually
            const translateY = baseMaxDim >= 64 ? '-20px' : '0';
            spriteDiv.style.transform = `scale(${scale}) translateY(${translateY})`;
            spriteDiv.style.transformOrigin = 'center center';
            spriteDiv.style.imageRendering = 'pixelated';

            skinPreviewContainer.appendChild(spriteDiv);

            // Play Animation if multiple frames
            if (frames > 1) {
                spriteDiv.animate([
                    { backgroundPosition: '0px 0px' },
                    { backgroundPosition: `-${totalWidth}px 0px` }
                ], {
                    duration: speed,
                    easing: `steps(${frames}, end)`,
                    iterations: Infinity
                });
            } else {
                spriteDiv.style.backgroundPosition = '0px 0px';
            }
        } else if (skin.preview) {
            // Fallback to static preview image if available
            skinPreviewContainer.innerHTML = `<img src="${skin.preview}" alt="${skin.name} preview">`;
        } else {
            skinPreviewContainer.innerHTML = '<div class="no-preview">No Preview</div>';
        }
    }

    // Check lock status
    const isLocked = !isVip && skinId !== 'mochi-v1';
    if (vipLockMsg) {
        vipLockMsg.classList.toggle('hidden', !isLocked);
    }
}

/**
 * Update VIP Status UI
 */
function updateVipStatusUI(status) {
    if (!vipStatusBadge) return;

    if (status && status.enabled) {
        vipStatusBadge.textContent = t('vipPro');
        vipStatusBadge.className = 'badge premium-solid';
        vipStatusText.textContent = t('vipUnlocked').replace('${code}', status.code || '********');

        // Show expiration if available
        if (status.validUntil) {
            const date = new Date(status.validUntil).toLocaleDateString();
            vipStatusText.textContent += ` (${t('vipExpires').replace('${date}', date)})`
        }

        vipCodeInput.disabled = true;
        vipRedeemBtn.disabled = true;
        vipRedeemBtn.textContent = t('activated');
        vipInputContainer.style.display = 'none'; // Hide input to verify clean look
        isVip = true;
    } else {
        vipStatusBadge.textContent = t('vipFree');
        vipStatusBadge.classList.remove('premium');
        vipStatusText.textContent = t('vipDesc');
        vipInputContainer.style.display = 'flex'; // Show input row
        vipCodeInput.disabled = false;
        vipRedeemBtn.disabled = !vipCodeInput.value.trim();
        vipRedeemBtn.textContent = t('redeem');
        isVip = false;
    }

    // Refresh skin list to update locks
    populateSkins(availableSkins, skinSelect ? skinSelect.value : null);

    // Refresh Timer Locks
    updateTimerLocks();
}

/**
 * Update Timer Locks (Phase 4)
 */
function updateTimerLocks() {
    if (!pomodoroInput) return;

    if (isVip) {
        pomodoroInput.disabled = false;
        pomodoroInput.title = '';
        pomodoroInput.parentElement.classList.remove('locked-input');
    } else {
        pomodoroInput.disabled = true;
        pomodoroInput.value = 25; // Reset to default
        pomodoroInput.title = t('vipRequired') || 'VIP Required';
        // Optional: Add visual indicator style if needed, for now standard disabled attribute is sufficient
    }
}

/**
 * Redeem invite code
 */
async function redeemInviteCode() {
    const code = vipCodeInput.value.trim();
    if (!code) return;

    vipRedeemBtn.disabled = true;
    vipRedeemBtn.textContent = t('redeeming');
    vipMessage.textContent = '';
    vipMessage.className = 'vip-message';

    try {
        console.log('[Settings] Calling redeemInviteCode with:', code);
        const result = await window.settingsAPI.redeemInviteCode(code);
        console.log('[Settings] Redeem result:', result);

        if (result.success) {
            vipMessage.textContent = t('redeemSuccess');
            vipMessage.className = 'vip-message success';
            // Reload status
            const newStatus = await window.settingsAPI.getVipStatus();
            updateVipStatusUI(newStatus);
        } else {
            // Classify errors
            let errorMsg = result.message;
            if (result.message === 'Invalid code') {
                errorMsg = t('redeemInvalid');
            } else if (result.message === 'Code is empty') {
                errorMsg = t('redeemEmpty');
            } else {
                errorMsg = t('redeemError').replace('${msg}', result.message);
            }

            vipMessage.textContent = errorMsg;
            vipMessage.className = 'vip-message error';
        }
    } catch (e) {
        vipMessage.textContent = t('redeemErrorGeneric');
        vipMessage.className = 'vip-message error';
    } finally {
        vipRedeemBtn.disabled = false;
        vipRedeemBtn.textContent = t('redeem');
    }
}

/**
 * Save settings logic
 */
async function saveSettings() {
    const saveBtnTarget = document.getElementById('save-settings') || saveBtn;
    if (saveBtnTarget) {
        saveBtnTarget.disabled = true;
        saveBtnTarget.textContent = t('saving');
    }

    try {
        const soundToggle = document.getElementById('soundEnabled');
        const volumeSlider = document.getElementById('soundVolume');

        // Check if selected skin is locked
        let selectedSkin = skinSelect ? skinSelect.value : 'mochi-v1';
        if (!isVip && selectedSkin !== 'mochi-v1') {
            alert(t('vipRequired'));
            selectedSkin = 'mochi-v1';
        }

        const settings = {
            region: regionSelect.value,
            provider: providerSelect.value,
            apiKey: apiKeyInput.value,
            model: modelInput.value,
            soundEnabled: soundToggle ? soundToggle.checked : true,
            soundVolume: volumeSlider ? parseInt(volumeSlider.value, 10) : 30,
            skin: selectedSkin,
            pomodoro: {
                // Phase 4: Enforce 25m limit for non-VIP
                defaultDuration: isVip ? (parseInt(pomodoroInput.value) || 25) : 25
            },
            reminders: {
                // Preserve enabled states
                water: currentSettings?.reminders?.water ?? false,
                rest: currentSettings?.reminders?.rest ?? false,
                stretch: currentSettings?.reminders?.stretch ?? false,
                intervals: {
                    water: parseInt(waterInput.value) || 30,
                    rest: parseInt(restInput.value) || 20,
                    stretch: parseInt(stretchInput.value) || 45
                }
            }
        };

        // Save language if changed
        if (languageSelect && window.settingsAPI.setLanguage) {
            await window.settingsAPI.setLanguage(languageSelect.value);
        }

        const result = await window.settingsAPI.saveSettings(settings);

        if (result.success) {
            closeWindow();
        } else {
            alert(t('saveFailed').replace('${msg}', result.message));
        }
    } catch (error) {
        alert('Save failed: ' + error.message);
    } finally {
        if (saveBtnTarget) {
            saveBtnTarget.disabled = false;
            saveBtnTarget.textContent = t('save');
        }
    }
}

// ... rest of helper functions ...

/**
 * Auth Elements
 */
const linkEmailInput = document.getElementById('link-email');
const sendOtpBtn = document.getElementById('send-otp-btn');
const otpContainer = document.getElementById('otp-container');
// Replace single input with collection
const verifyOtpBtn = document.getElementById('verify-otp-btn');
const accountUnlinked = document.getElementById('account-unlinked');
const accountLinked = document.getElementById('account-linked');
const linkedEmail = document.getElementById('linked-email');
const signOutBtn = document.getElementById('sign-out-btn');
const authMessage = document.getElementById('auth-message');

let otpInputs = [];

/**
 * Initialize Auth UI
 */
async function initAuth() {
    if (!window.settingsAPI.getAuthStatus) return;

    // Listeners
    sendOtpBtn?.addEventListener('click', handleSendOtp);
    verifyOtpBtn?.addEventListener('click', handleVerifyOtp);
    signOutBtn?.addEventListener('click', handleSignOut);

    // Email Input Logic (Enable button only if valid)
    if (linkEmailInput && sendOtpBtn) {
        // Initial state
        sendOtpBtn.disabled = !linkEmailInput.value.trim();

        linkEmailInput.addEventListener('input', () => {
            const val = linkEmailInput.value.trim();
            sendOtpBtn.disabled = !val;
            // Clear error on type
            if (authMessage && authMessage.textContent) {
                authMessage.textContent = '';
            }
        });
    }

    // OTP Input Logic
    otpInputs = Array.from(document.querySelectorAll('.otp-digit'));
    setupOtpInputs();

    // Check Status
    await checkAuthStatus();
}

function setupOtpInputs() {
    otpInputs.forEach((input, index) => {
        // Handle input
        input.addEventListener('input', (e) => {
            const val = e.target.value;

            // Allow only numbers
            if (!/^\d*$/.test(val)) {
                e.target.value = val.replace(/\D/g, '');
                return;
            }

            if (val.length === 1) {
                // Move to next
                if (index < 5) {
                    otpInputs[index + 1].focus();
                }
            }

            checkOtpComplete();
        });

        // Handle Paste
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            const digits = text.replace(/\D/g, '').split('').slice(0, 6);

            digits.forEach((digit, i) => {
                if (otpInputs[i]) otpInputs[i].value = digit;
            });

            // Focus last filled or next empty
            const lastFilled = Math.min(digits.length, 5);
            otpInputs[lastFilled].focus();
            checkOtpComplete();
        });

        // Handle Backspace
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value) {
                if (index > 0) {
                    otpInputs[index - 1].focus();
                }
            } else if (e.key === 'ArrowLeft') {
                if (index > 0) otpInputs[index - 1].focus();
            } else if (e.key === 'ArrowRight') {
                if (index < 5) otpInputs[index + 1].focus();
            } else if (e.key === 'Enter') {
                if (!verifyOtpBtn.disabled) handleVerifyOtp();
            }
        });
    });
}

function checkOtpComplete() {
    const code = getOtpCode();
    // Safety check for button
    if (verifyOtpBtn) {
        if (code.length === 6) {
            verifyOtpBtn.disabled = false;
            // Removed classList check that was causing error as we now style via attribute or simple disable
        } else {
            verifyOtpBtn.disabled = true;
        }
    }
}

function getOtpCode() {
    return otpInputs.map(i => i.value).join('');
}

/**
 * Check and update auth status
 */
async function checkAuthStatus() {
    try {
        const user = await window.settingsAPI.getAuthStatus();
        updateAuthUI(user);
    } catch (e) {
        console.error('Auth status check failed:', e);
    }
}

/**
 * Update Auth UI based on user state
 */
function updateAuthUI(user) {
    if (!accountUnlinked) return;

    if (user) {
        // Linked
        accountUnlinked.classList.add('hidden');
        otpContainer.classList.add('hidden');
        accountLinked.classList.remove('hidden');
        if (linkedEmail) linkedEmail.textContent = user.email;
        authMessage.textContent = '';
    } else {
        // Unlinked
        accountUnlinked.classList.remove('hidden');
        accountLinked.classList.add('hidden');
        otpContainer.classList.add('hidden');
        resetOtpInputs();
    }
}

function resetOtpInputs() {
    otpInputs.forEach(i => i.value = '');
    verifyOtpBtn.disabled = true;
}

/**
 * Handle Send OTP
 */
let countdownTimer = null;

async function handleSendOtp() {
    const email = linkEmailInput.value.trim();
    if (!email) {
        // Should be ignored if disabled, but double check
        showAuthMessage(t('emailRequired') || 'Email required', 'error');
        return;
    }

    sendOtpBtn.disabled = true;
    showAuthMessage(t('sending'), 'info'); // "Sending..."

    try {
        const result = await window.settingsAPI.sendOtp(email);
        if (result && result.success) {
            showAuthMessage(t('codeSent'), 'success');
            otpContainer.classList.remove('hidden');
            accountUnlinked.querySelector('.input-with-button')?.classList.add('hidden');

            // Focus first digit
            setTimeout(() => {
                if (otpInputs && otpInputs[0]) otpInputs[0].focus();
            }, 100);

            // Start countdown
            startOtpCountdown();

        } else {
            showAuthMessage(result?.error || 'Failed to send code', 'error');
            sendOtpBtn.disabled = false;
        }
    } catch (e) {
        showAuthMessage(e.message, 'error');
        sendOtpBtn.disabled = false;
    }
}

function startOtpCountdown() {
    let seconds = 60;

    // Save original text if not saved
    if (!sendOtpBtn.dataset.originalText) {
        sendOtpBtn.dataset.originalText = sendOtpBtn.textContent || t('sendCode');
    }
    const originalText = sendOtpBtn.dataset.originalText;

    sendOtpBtn.disabled = true;
    sendOtpBtn.textContent = `${originalText} (${seconds})`;

    if (countdownTimer) clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(countdownTimer);
            sendOtpBtn.textContent = originalText;
            sendOtpBtn.disabled = false;
        } else {
            sendOtpBtn.textContent = `${originalText} (${seconds})`;
        }
    }, 1000);
}

/**
 * Handle Verify OTP
 */
async function handleVerifyOtp() {
    const email = linkEmailInput.value.trim();
    const token = getOtpCode();

    if (token.length !== 6) return;

    verifyOtpBtn.disabled = true;

    try {
        const result = await window.settingsAPI.verifyOtp(email, token);
        if (result && result.success) {
            showAuthMessage(t('verifySuccess'), 'success');
            await checkAuthStatus();

            // Sync settings to cloud (backup current settings)
            await window.settingsAPI.syncToCloud();
            console.log('[Settings] Settings synced to cloud');

            // Apply settings from cloud (restore if any)
            const syncResult = await window.settingsAPI.applyFromCloud();
            if (syncResult.applied) {
                console.log('[Settings] Applied cloud settings:', syncResult.keys);
            }

            // Refresh VIP status too
            const newStatus = await window.settingsAPI.getVipStatus();
            updateVipStatusUI(newStatus);
        } else {
            showAuthMessage(t('verifyError').replace('${msg}', result?.error || 'Invalid code'), 'error');
            verifyOtpBtn.disabled = false;
            // Shake effect safely
            if (otpInputs) {
                otpInputs.forEach(i => i.classList.add('error'));
                setTimeout(() => otpInputs.forEach(i => i.classList.remove('error')), 500);
            }
        }
    } catch (e) {
        showAuthMessage(e.message, 'error');
        verifyOtpBtn.disabled = false;
    }
}

/**
 * Handle Sign Out
 */
async function handleSignOut() {
    if (!confirm('Are you sure you want to sign out?')) return;

    try {
        await window.settingsAPI.signOut();
        await checkAuthStatus();
        accountUnlinked.querySelector('.input-with-button').classList.remove('hidden');
        linkEmailInput.value = '';
        otpCodeInput.value = '';
        sendOtpBtn.disabled = false;
        verifyOtpBtn.disabled = false;
    } catch (e) {
        console.error('Sign out error:', e);
    }
}

function showAuthMessage(msg, type) {
    if (!authMessage) return;
    authMessage.textContent = msg;
    authMessage.className = `vip-message ${type}`;
}

/**
 * Populate provider dropdown based on selected region
 */
function populateProviders(region) {
    providerSelect.innerHTML = '';

    const providers = PROVIDERS[region] || {};
    for (const [key, config] of Object.entries(providers)) {
        const option = document.createElement('option');
        option.value = key;
        // Support i18n name format: { 'zh-CN': '...', 'en': '...' } or plain string
        const name = typeof config.name === 'object'
            ? (config.name[currentLang] || config.name['en'] || Object.values(config.name)[0])
            : config.name;
        option.textContent = name;
        providerSelect.appendChild(option);
    }
}

/**
 * Handle region change
 */
function onRegionChange() {
    const region = regionSelect.value;
    populateProviders(region);

    // Auto-select first provider and update model
    const firstProvider = Object.keys(PROVIDERS[region])[0];
    providerSelect.value = firstProvider;
    onProviderChange();
}

/**
 * Handle provider change
 */
function onProviderChange() {
    const region = regionSelect.value;
    const provider = providerSelect.value;
    const config = PROVIDERS[region]?.[provider];

    if (config) {
        modelInput.value = config.model;

        // Update API key help link
        updateApiKeyHelpLink(config);
    }

    // Clear test result
    testResult.textContent = '';
    testResult.className = 'test-result';
}

/**
 * Update API key help link based on provider
 */
function updateApiKeyHelpLink(config) {
    const helpLink = document.getElementById('apiKeyHelpLink');
    const helpText = document.getElementById('apiKeyHelpText');

    if (helpLink && config.apiKeyUrl) {
        helpLink.onclick = (e) => {
            e.preventDefault();
            window.settingsAPI.openExternal(config.apiKeyUrl);
        };
    }

    if (helpText && config.getKeyText) {
        // Fallback hierarchy: currentLang -> en -> zh-CN
        const text = config.getKeyText[currentLang] || config.getKeyText['en'] || config.getKeyText['zh-CN'];
        // If still not found (e.g. skin/vip keys), use generic "Get API Key"
        helpText.textContent = text || t('getKeyHelp');
    }
}

/**
 * Toggle API key visibility
 */
function toggleKeyVisibility() {
    keyVisible = !keyVisible;
    apiKeyInput.type = keyVisible ? 'text' : 'password';
    toggleKeyBtn.textContent = keyVisible ? '🙈' : '👁️';
}

/**
 * Test the API connection
 */
async function testConnection() {
    testBtn.disabled = true;
    testResult.textContent = t('testing');
    testResult.className = 'test-result loading';

    try {
        const config = {
            region: regionSelect.value,
            provider: providerSelect.value,
            apiKey: apiKeyInput.value,
            model: modelInput.value
        };

        const result = await window.settingsAPI.testConnection(config);

        if (result.success) {
            testResult.textContent = t('testSuccess').replace('${ms}', result.latency);
            testResult.className = 'test-result success';
        } else {
            testResult.textContent = `✗ ${result.message}`;
            testResult.className = 'test-result error';
        }
    } catch (error) {
        testResult.textContent = `✗ ${error.message}`;
        testResult.className = 'test-result error';
    } finally {
        testBtn.disabled = false;
    }
}

/**
 * Close the settings window
 */
function closeWindow() {
    window.settingsAPI.close();
}

// ============================================
// Feedback Form (v1.3)
// ============================================

const feedbackCategory = document.getElementById('feedback-category');
const feedbackContent = document.getElementById('feedback-content');
const feedbackEmail = document.getElementById('feedback-email');
const feedbackCharCount = document.getElementById('feedback-char-count');
const submitFeedbackBtn = document.getElementById('submit-feedback-btn');
const feedbackMessage = document.getElementById('feedback-message');

function initFeedbackForm() {
    if (!feedbackContent) return;

    // Character counter
    feedbackContent.addEventListener('input', () => {
        const len = feedbackContent.value.length;
        feedbackCharCount.textContent = `${len} / 2000`;

        // Enable/disable submit button
        submitFeedbackBtn.disabled = len < 10;
    });

    // Submit handler
    submitFeedbackBtn.addEventListener('click', handleSubmitFeedback);
}

async function handleSubmitFeedback() {
    const category = feedbackCategory.value;
    const content = feedbackContent.value.trim();
    const email = feedbackEmail.value.trim();

    if (content.length < 10) {
        showFeedbackMessage(t('feedbackMinLength'), 'error');
        return;
    }

    submitFeedbackBtn.disabled = true;
    submitFeedbackBtn.textContent = t('submittingFeedback');

    try {
        const result = await window.settingsAPI.submitFeedback({
            category,
            content,
            email: email || null
        });

        if (result.success) {
            showFeedbackMessage(t('feedbackSuccess'), 'success');
            feedbackContent.value = '';
            feedbackEmail.value = '';
            feedbackCharCount.textContent = '0 / 2000';
        } else {
            showFeedbackMessage(t('feedbackError').replace('${msg}', result.error || ''), 'error');
        }
    } catch (e) {
        showFeedbackMessage(t('feedbackError').replace('${msg}', e.message), 'error');
    } finally {
        submitFeedbackBtn.textContent = t('submitFeedback');
        submitFeedbackBtn.disabled = feedbackContent.value.length < 10;
    }
}

function showFeedbackMessage(msg, type) {
    if (!feedbackMessage) return;
    feedbackMessage.textContent = msg;
    feedbackMessage.className = `vip-message mt-2 ${type}`;

    // Auto-clear after 5 seconds
    setTimeout(() => {
        feedbackMessage.textContent = '';
        feedbackMessage.className = 'vip-message mt-2';
    }, 5000);
}

// ============================================
// Segmented Tabs & Pet Hub Jump Controller
// ============================================
function initTabsAndShortcuts() {
    const tabBtns = document.querySelectorAll('.settings-tab-btn');
    const tabPanels = document.querySelectorAll('.settings-tab-panel');
    const openHubBtn = document.getElementById('open-copet-hub-btn');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    if (openHubBtn) {
        openHubBtn.addEventListener('click', () => {
            window.settingsAPI?.openCoPetWindow?.();
        });
    }
}

// Initialize feedback form
initFeedbackForm();

// Initialize Segmented Tabs & Hub Jump
initTabsAndShortcuts();

// Initialize on load
init();

