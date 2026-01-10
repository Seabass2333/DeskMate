/**
 * DeskMate Settings Renderer
 * Handles settings UI logic and communication with main process
 */

// Provider definitions matching config.js structure
const PROVIDERS = {
    china: {
        deepseek: { name: 'DeepSeek', model: 'deepseek-chat' },
        moonshot: { name: 'Moonshot (Kimi)', model: 'moonshot-v1-8k' }
    },
    global: {
        openrouter: { name: 'OpenRouter', model: 'deepseek/deepseek-chat' },
        openai: { name: 'OpenAI', model: 'gpt-4o-mini' }
    },
    local: {
        ollama: { name: 'Ollama (本地)', model: 'llama3.2' }
    }
};

// DOM Elements
const regionSelect = document.getElementById('region');
const providerSelect = document.getElementById('provider');
const apiKeyInput = document.getElementById('apiKey');
const modelInput = document.getElementById('model');
const toggleKeyBtn = document.getElementById('toggleKey');
const testBtn = document.getElementById('testConnection');
const testResult = document.getElementById('testResult');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');

// State
let currentSettings = null;
let keyVisible = false;

/**
 * Initialize the settings page
 */
async function init() {
    // Load current settings
    currentSettings = await window.settingsAPI.getSettings();

    // Populate provider dropdown based on region
    populateProviders(currentSettings.region || 'china');

    // Set initial values
    regionSelect.value = currentSettings.region || 'china';
    providerSelect.value = currentSettings.provider || 'deepseek';
    apiKeyInput.value = currentSettings.apiKey || '';
    modelInput.value = currentSettings.model || '';

    // Event listeners
    regionSelect.addEventListener('change', onRegionChange);
    providerSelect.addEventListener('change', onProviderChange);
    toggleKeyBtn.addEventListener('click', toggleKeyVisibility);
    testBtn.addEventListener('click', testConnection);
    saveBtn.addEventListener('click', saveSettings);
    cancelBtn.addEventListener('click', closeWindow);
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
    }

    // Clear test result
    testResult.textContent = '';
    testResult.className = 'test-result';
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
        const settings = {
            region: regionSelect.value,
            provider: providerSelect.value,
            apiKey: apiKeyInput.value,
            model: modelInput.value
        };

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
