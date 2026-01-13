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
            name: '智谱 AI (GLM)',
            model: 'glm-4-flash',
            apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
            getKeyText: { 'zh-CN': '获取智谱 API Key', 'en': 'Get Zhipu API Key' }
        },
        qwen: {
            name: '通义千问 (Qwen)',
            model: 'qwen-turbo',
            apiKeyUrl: 'https://dashscope.console.aliyun.com/apiKey',
            getKeyText: { 'zh-CN': '获取通义千问 API Key', 'en': 'Get Qwen API Key' }
        },
        baichuan: {
            name: '百川 AI',
            model: 'Baichuan2-Turbo',
            apiKeyUrl: 'https://platform.baichuan-ai.com/console/apikey',
            getKeyText: { 'zh-CN': '获取百川 API Key', 'en': 'Get Baichuan API Key' }
        },
        doubao: {
            name: '豆包 (ByteDance)',
            model: 'doubao-pro-4k',
            apiKeyUrl: 'https://console.volcengine.com/ark',
            getKeyText: { 'zh-CN': '获取豆包 API Key', 'en': 'Get Doubao API Key' }
        }
    },
    global: {
        openrouter: {
            name: 'OpenRouter (推荐)',
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
            name: 'Groq (超快)',
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
            name: '自定义 API',
            model: '',
            apiKeyUrl: '',
            getKeyText: { 'zh-CN': '使用任意 OpenAI 兼容 API', 'en': 'Use any OpenAI-compatible API' },
            isCustom: true
        }
    },
    local: {
        ollama: {
            name: 'Ollama (本地)',
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
        cancel: '取消',
        save: '保存设置',
        testing: '测试中...',
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
        getKeyHelp: '获取 API Key'
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
        cancel: 'Cancel',
        save: 'Save Settings',
        testing: 'Testing...',
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
        getKeyHelp: 'Get API Key'
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
        getKeyHelp: 'API Keyを取得'
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
        getKeyHelp: 'API Key 받기'
    },
    'es': {
        settingsTitle: 'Configuración',
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
        getKeyHelp: 'Obtener API Key'
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
        getKeyHelp: 'Obtenir Clé API'
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
        getKeyHelp: 'API Key erhalten'
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

        // Load language
        if (languageSelect && window.settingsAPI.getLanguage) {
            const lang = await window.settingsAPI.getLanguage();
            languageSelect.value = lang || 'zh-CN';
            applyI18n(lang || 'zh-CN');
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

        if (skin.previewSprite) {
            // Create sprite preview div
            const spriteDiv = document.createElement('div');
            spriteDiv.style.backgroundImage = `url('${skin.previewSprite.replace(/\\/g, '/')}')`;
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

            // Transform for visibility
            const scale = 3;
            spriteDiv.style.transform = `scale(${scale})`;
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
        vipStatusBadge.classList.add('premium');
        vipStatusText.textContent = t('vipUnlocked').replace('${code}', status.code);
        vipInputContainer.classList.add('hidden'); // Hide input if already VIP
        isVip = true;
    } else {
        vipStatusBadge.textContent = t('vipFree');
        vipStatusBadge.classList.remove('premium');
        vipStatusText.textContent = t('vipDesc');
        isVip = false;
    }

    // Refresh skin list to update locks
    populateSkins(availableSkins, skinSelect ? skinSelect.value : null);
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
        vipMessage.textContent = 'Error redeeming code';
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
        saveBtnTarget.textContent = 'Saving...';
    }

    try {
        const soundToggle = document.getElementById('soundEnabled');

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
            skin: selectedSkin,
            pomodoro: {
                defaultDuration: parseInt(pomodoroInput.value) || 25
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
            alert('Save failed: ' + result.message);
        }
    } catch (error) {
        alert('Save failed: ' + error.message);
    } finally {
        if (saveBtnTarget) {
            saveBtnTarget.disabled = false;
            saveBtnTarget.textContent = 'Save Settings';
        }
    }
}

// ... rest of helper functions ...

/**
 * Populate provider dropdown based on selected region
 */
function populateProviders(region) {
    providerSelect.innerHTML = '';

    const providers = PROVIDERS[region] || {};
    for (const [key, config] of Object.entries(providers)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = config.name;
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
    testResult.textContent = '测试中...';
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
            testResult.textContent = `✓ 连接成功 (${result.latency}ms)`;
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

// Initialize on load
init();
