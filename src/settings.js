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
        }
    },
    global: {
        openrouter: {
            name: 'OpenRouter',
            model: 'deepseek/deepseek-chat',
            apiKeyUrl: 'https://openrouter.ai/keys',
            getKeyText: { 'zh-CN': '获取 OpenRouter API Key', 'en': 'Get OpenRouter API Key' }
        },
        openai: {
            name: 'OpenAI',
            model: 'gpt-4o-mini',
            apiKeyUrl: 'https://platform.openai.com/api-keys',
            getKeyText: { 'zh-CN': '获取 OpenAI API Key', 'en': 'Get OpenAI API Key' }
        }
    },
    local: {
        ollama: {
            name: 'Ollama',
            model: 'llama3.2',
            apiKeyUrl: 'https://ollama.ai/download',
            getKeyText: { 'zh-CN': '下载 Ollama', 'en': 'Download Ollama' }
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
        saving: '保存中...'
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
        saving: 'Saving...'
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
        saving: '保存中...'
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
const vipCodeInput = document.getElementById('vip-code-input');
const vipRedeemBtn = document.getElementById('vip-redeem-btn');
const vipMessage = document.getElementById('vip-message');
const vipLockMsg = document.getElementById('vip-lock-msg');

// State
let currentSettings = null;
let keyVisible = false;
let availableSkins = [];
let isVip = false;

/**
 * Initialize the settings page
 */
async function init() {
    // Load current settings
    currentSettings = await window.settingsAPI.getSettings();
    availableSkins = currentSettings.availableSkins || [];
    isVip = currentSettings.vipStatus?.enabled || false;

    // Populate provider dropdown based on region
    populateProviders(currentSettings.region || 'china');

    // Populate skins
    populateSkins(availableSkins, currentSettings.currentSkin);
    updateVipStatusUI(currentSettings.vipStatus);

    // Set initial values (API)
    regionSelect.value = currentSettings.region || 'china';
    providerSelect.value = currentSettings.provider || 'deepseek';
    apiKeyInput.value = currentSettings.apiKey || '';
    modelInput.value = currentSettings.model || '';

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
}

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

    // Update preview image
    if (skinPreviewContainer) {
        if (skin.preview) {
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
        vipStatusBadge.textContent = 'PRO MEMBER';
        vipStatusBadge.classList.add('premium');
        vipStatusText.textContent = `Unlocked via code: ${status.code}`;
        vipInputContainer.classList.add('hidden'); // Hide input if already VIP
        isVip = true;
    } else {
        vipStatusBadge.textContent = 'FREE';
        vipStatusBadge.classList.remove('premium');
        vipStatusText.textContent = 'Enter invite code for premium features (Pochi skin, unlimited Pomodoro, etc.)';
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
    vipRedeemBtn.textContent = 'Checking...';
    vipMessage.textContent = '';
    vipMessage.className = 'vip-message';

    try {
        const result = await window.settingsAPI.redeemInviteCode(code);

        if (result.success) {
            vipMessage.textContent = 'Success! Features unlocked.';
            vipMessage.className = 'vip-message success';
            // Reload status
            const newStatus = await window.settingsAPI.getVipStatus();
            updateVipStatusUI(newStatus);
        } else {
            vipMessage.textContent = result.message || 'Invalid code';
            vipMessage.className = 'vip-message error';
        }
    } catch (e) {
        vipMessage.textContent = 'Error redeeming code';
        vipMessage.className = 'vip-message error';
    } finally {
        vipRedeemBtn.disabled = false;
        vipRedeemBtn.textContent = 'Redeem';
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
            alert('This skin requires VIP membership. Reverting to Mochi.');
            selectedSkin = 'mochi-v1';
        }

        const settings = {
            region: regionSelect.value,
            provider: providerSelect.value,
            apiKey: apiKeyInput.value,
            model: modelInput.value,
            soundEnabled: soundToggle ? soundToggle.checked : true,
            skin: selectedSkin
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
        const lang = currentLang.startsWith('zh') ? 'zh-CN' : 'en';
        helpText.textContent = config.getKeyText[lang] || config.getKeyText['en'];
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
 * Save settings and close window
 */
async function saveSettings() {
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
        const soundToggle = document.getElementById('soundEnabled');

        const settings = {
            region: regionSelect.value,
            provider: providerSelect.value,
            apiKey: apiKeyInput.value,
            model: modelInput.value,
            soundEnabled: soundToggle ? soundToggle.checked : true
        };

        // Save language if changed
        if (languageSelect && window.settingsAPI.setLanguage) {
            await window.settingsAPI.setLanguage(languageSelect.value);
        }

        const result = await window.settingsAPI.saveSettings(settings);

        if (result.success) {
            closeWindow();
        } else {
            alert('保存失败: ' + result.message);
        }
    } catch (error) {
        alert('保存失败: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '保存设置';
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
