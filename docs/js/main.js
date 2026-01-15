/**
 * DeskMate Landing Page JavaScript
 * Handles i18n, carousel, and GitHub Releases integration
 */

// i18n translations
const i18n = {
    'zh-CN': {
        heroTitle: '你的桌面萌宠伙伴',
        heroSubtitle: 'AI 对话 · 番茄专注 · 健康提醒',
        downloadMac: '下载 macOS 版',
        downloadWin: '下载 Windows 版',
        speechBubble: '喵~ 今天也要加油哦！',
        featuresTitle: '为什么选择 DeskMate？',
        feature1Title: 'AI 对话陪伴',
        feature1Desc: '随时与萌宠聊天，支持多种 AI 模型，缓解工作压力',
        feature2Title: '番茄钟专注',
        feature2Desc: '25 分钟专注模式，帮助你保持高效工作状态',
        feature3Title: '健康提醒',
        feature3Desc: '定时提醒喝水、休息眼睛、伸展身体',
        feature4Title: '个性皮肤',
        feature4Desc: '多款可爱宠物皮肤，VIP 专属皮肤更精彩',
        screenshotsTitle: '产品预览',
        screenshot1: 'AI 对话 - 萌宠回复',
        screenshot2: '简洁的对话输入',
        screenshot3: '丰富的设置选项',
        screenshot4: '桌面萌宠效果',
        ctaTitle: '准备好开始了吗？',
        ctaSubtitle: '免费下载，让可爱陪伴你的每一天',
        viewChangelog: '📋 查看更新日志',
        feedback: '反馈建议',
        privacy: '隐私政策'
    },
    'en': {
        heroTitle: 'Your Cute Desktop Pet Companion',
        heroSubtitle: 'AI Chat · Focus Timer · Health Reminders',
        downloadMac: 'Download for macOS',
        downloadWin: 'Download for Windows',
        speechBubble: 'Meow~ Have a great day!',
        featuresTitle: 'Why Choose DeskMate?',
        feature1Title: 'AI Companion',
        feature1Desc: 'Chat with your pet anytime, supports multiple AI models',
        feature2Title: 'Pomodoro Timer',
        feature2Desc: '25-minute focus sessions to boost your productivity',
        feature3Title: 'Health Reminders',
        feature3Desc: 'Timely reminders for water, eye rest, and stretching',
        feature4Title: 'Custom Skins',
        feature4Desc: 'Multiple cute pet skins, exclusive VIP skins available',
        screenshotsTitle: 'Preview',
        screenshot1: 'AI Chat - Pet Response',
        screenshot2: 'Clean Chat Input',
        screenshot3: 'Rich Settings Options',
        screenshot4: 'Desktop Pet Effect',
        ctaTitle: 'Ready to Get Started?',
        ctaSubtitle: 'Free download, let cuteness accompany your day',
        viewChangelog: '📋 View Changelog',
        feedback: 'Feedback',
        privacy: 'Privacy Policy'
    }
};

let currentLang = 'zh-CN';

/**
 * Apply translations to the page
 */
function applyTranslations(lang) {
    currentLang = lang;
    const translations = i18n[lang] || i18n['zh-CN'];

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            el.textContent = translations[key];
        }
    });

    // Update page title and meta
    document.title = lang === 'zh-CN'
        ? 'DeskMate - 你的桌面萌宠伙伴'
        : 'DeskMate - Your Cute Desktop Pet';

    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        metaDesc.content = lang === 'zh-CN'
            ? 'DeskMate 是一款可爱的桌面宠物应用，集成 AI 对话、番茄钟专注和健康提醒功能。'
            : 'DeskMate is a cute desktop pet app with AI chat, pomodoro timer, and health reminders.';
    }

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Update active language button
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`lang-${lang === 'zh-CN' ? 'zh' : 'en'}`).classList.add('active');

    // Save preference
    localStorage.setItem('deskmate-lang', lang);
}

/**
 * Initialize language from browser or saved preference
 */
function initLanguage() {
    const saved = localStorage.getItem('deskmate-lang');
    if (saved) {
        return saved;
    }

    // Detect browser language
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('zh')) {
        return 'zh-CN';
    }
    return 'en';
}

/**
 * Screenshot carousel functionality
 */
function initCarousel() {
    const items = document.querySelectorAll('.screenshot-item');
    const dots = document.querySelectorAll('.dot');
    let currentIndex = 0;
    let autoPlayInterval;

    function showSlide(index) {
        items.forEach(item => item.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        items[index].classList.add('active');
        dots[index].classList.add('active');
        currentIndex = index;
    }

    function nextSlide() {
        const next = (currentIndex + 1) % items.length;
        showSlide(next);
    }

    function startAutoPlay() {
        autoPlayInterval = setInterval(nextSlide, 4000);
    }

    function stopAutoPlay() {
        clearInterval(autoPlayInterval);
    }

    // Dot click handlers
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
            stopAutoPlay();
            startAutoPlay();
        });
    });

    // Start auto-play
    startAutoPlay();

    // Pause on hover
    const carousel = document.querySelector('.screenshots-carousel');
    if (carousel) {
        carousel.addEventListener('mouseenter', stopAutoPlay);
        carousel.addEventListener('mouseleave', startAutoPlay);
    }
}

/**
 * Fetch latest release info from GitHub
 */
async function fetchReleaseInfo() {
    try {
        const response = await fetch('https://api.github.com/repos/Seabass2333/DeskMate/releases/latest');
        if (!response.ok) return null;

        const release = await response.json();
        return {
            version: release.tag_name,
            macUrl: release.assets.find(a => a.name.endsWith('.dmg'))?.browser_download_url,
            winUrl: release.assets.find(a => a.name.endsWith('.exe'))?.browser_download_url
        };
    } catch (error) {
        console.error('Failed to fetch release info:', error);
        return null;
    }
}

/**
 * Update download buttons with latest release URLs
 */
async function updateDownloadLinks() {
    const release = await fetchReleaseInfo();

    const macButtons = [
        document.getElementById('download-mac'),
        document.getElementById('download-mac-2')
    ];
    const winButtons = [
        document.getElementById('download-win'),
        document.getElementById('download-win-2')
    ];

    if (release) {
        // Update version info
        const versionInfo = document.getElementById('version-info');
        if (versionInfo) {
            versionInfo.textContent = `${release.version} · macOS 10.15+ / Windows 10+`;
        }

        // Update download URLs
        macButtons.forEach(btn => {
            if (btn && release.macUrl) {
                btn.href = release.macUrl;
            }
        });

        winButtons.forEach(btn => {
            if (btn && release.winUrl) {
                btn.href = release.winUrl;
            }
        });
    } else {
        // Fallback to releases page
        const fallbackUrl = 'https://github.com/Seabass2333/DeskMate/releases';
        [...macButtons, ...winButtons].forEach(btn => {
            if (btn) btn.href = fallbackUrl;
        });
    }
}

/**
 * Initialize page
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize language
    const lang = initLanguage();
    applyTranslations(lang);

    // Language switcher handlers
    document.getElementById('lang-zh')?.addEventListener('click', () => {
        applyTranslations('zh-CN');
    });

    document.getElementById('lang-en')?.addEventListener('click', () => {
        applyTranslations('en');
    });

    // Initialize carousel
    initCarousel();

    // Update download links
    updateDownloadLinks();
});
