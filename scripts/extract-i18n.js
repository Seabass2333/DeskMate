const fs = require('fs');
const content = fs.readFileSync('src/settings.js', 'utf8');

// Extract SETTINGS_I18N (lines 120-595 approximately)
const startMarker = '// Settings page translations';
const endMarker = '\nlet currentLang';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

const i18nData = content.substring(startIdx, endIdx).trim();

const header = `/**
 * DeskMate Settings i18n Module
 * Centralized translations for settings page
 */

`;

const footer = `

let currentLang = 'zh-CN';

/**
 * Apply translations to all elements with data-i18n attribute
 * @param {string} lang - Language code
 * @param {Object} callbacks - Optional callbacks for additional actions
 */
function applyI18n(lang, callbacks = {}) {
    currentLang = lang;
    const translations = SETTINGS_I18N[lang] || SETTINGS_I18N['en'];

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            el.textContent = translations[key];
        }
    });

    // Update document title
    document.title = \`DeskMate \${translations.settingsTitle}\`;

    // Execute callbacks if provided
    if (callbacks.onApplied) callbacks.onApplied(lang);
}

/**
 * Get translation for current language
 * @param {string} key - Translation key
 * @returns {string} Translated text or key if not found
 */
function t(key) {
    const translations = SETTINGS_I18N[currentLang] || SETTINGS_I18N['en'];
    return translations[key] || key;
}

/**
 * Get current language code
 * @returns {string} Current language code
 */
function getCurrentLang() {
    return currentLang;
}

/**
 * Set current language without applying
 * @param {string} lang - Language code
 */
function setCurrentLang(lang) {
    currentLang = lang;
}
`;

const output = header + i18nData + footer;
fs.writeFileSync('src/settings/i18n.js', output);
console.log('Created src/settings/i18n.js with', output.split('\n').length, 'lines');
