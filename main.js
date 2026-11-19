// Load environment variables from .env.local
require('dotenv').config({ path: require('path').join(__dirname, '.env.local') });

const { app, BrowserWindow, ipcMain, Menu, Notification, dialog, Tray, nativeImage, shell, net } = require('electron');

// Windows 10/11 requires AppUserModelId matching build.appId so native Notifications work!
if (process.platform === 'win32') {
  app.setAppUserModelId('com.seabass2333.deskmate');
}
const path = require('path');
const fs = require('fs');
const LLMHandler = require('./src/services/llmHandler');
const { getActiveConfig, saveUserSettings, loadUserSettings, PROVIDERS, getPetState, savePetState, getSkin, setSkin, getAvailableSkins, isVipFeatureEnabled, redeemInviteCode, getVipStatus, syncVipStatus, getQuietMode, setQuietMode, isUserVip } = require('./config');
const { initI18n, t, setLanguage, getLanguage, SUPPORTED_LANGUAGES, getRandomIdleMessage } = require('./i18n');
const { trackAppLaunched, trackSkinChanged, trackVipActivated } = require('./src/services/AnalyticsService');
const { authService } = require('./src/services/AuthService');
const { getOfflineReply } = require('./src/services/OfflineChatEngine');
const { coPetService } = require('./src/services/CoPetService');

// Hot reload in development mode only
if (!app.isPackaged) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit',
      ignored: /node_modules|[\/\\]\.|dist|deskmate-api|tests|docs/
    });
    console.log('[Main] Hot reload enabled');
  } catch (e) {
    console.log('[Main] Hot reload not available');
  }
}

/** @type {BrowserWindow} */
let mainWindow = null;

/** @type {BrowserWindow} */
let settingsWindow = null;

/** @type {BrowserWindow} */
let coPetWindow = null;

/** @type {Tray} */
let tray = null;

/** @type {LLMHandler} */
let llmHandler = null;

/** @type {boolean} */
let isPomodoroActive = false;

/** @type {Set<string>} */
const activeReminders = new Set();

/** @type {boolean} */
let isReminderLoopMode = true; // Default to loop mode ON

/** @type {object|null} */
let latestAvailableUpdate = null;
const { formatUpdatePayload, checkRemoteRelease } = require('./src/services/UpdateService');

/**
 * Load a unified 16x16 (@2x 32x32) minimalist monochrome menu icon
 * Uses macOS Template Image mode so macOS auto-tints for light/dark/hover states.
 */
const menuIconCache = new Map();
function getMenuIcon(name) {
  if (menuIconCache.has(name)) return menuIconCache.get(name);
  const iconPath = path.join(__dirname, 'assets', 'icons', 'menu', `${name}Template.png`);
  try {
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) {
      if (process.platform === 'darwin') {
        img.setTemplateImage(true);
      }
      menuIconCache.set(name, img);
      return img;
    }
  } catch (_) {}
  return undefined;
}

/**
 * Strip leading emoji prefixes from i18n menu labels so menus use unified vector-style icons
 */
function cleanMenuLabel(str) {
  return String(str || '').replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\u23F0-\u23FF\u2600-\u27BF]+\s*/gu, '').trim();
}

/**
 * Creates the main application window with transparent, frameless configuration
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 250,
    height: 250,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');

  // Enable click-through for transparent areas
  // forward: true allows mouse events to still be detected for hover
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Position at bottom-right corner (less intrusive)
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  mainWindow.setPosition(width - 280, height - 280);

  // Platform-specific window layering
  if (process.platform === 'darwin') {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } else if (process.platform === 'win32') {
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  }

  // Only open DevTools in development mode
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

/** @type {number} */
let currentPomodoroDuration = 0;

/**
 * Helper to start pomodoro with given duration
 */
function startPomodoro(minutes) {
  isPomodoroActive = true;
  currentPomodoroDuration = minutes;
  mainWindow.webContents.send('pomodoro-start', minutes);
}

/**
 * Builds and shows the context menu with Pomodoro controls
 */
function showContextMenu() {
  const settings = loadUserSettings();
  const defaultDur = settings?.pomodoro?.defaultDuration || 25;

  // Add 0.25 (15 seconds) for testing
  let durations = [0.25, 15, 20, 25, 30, 45, 60];

  // Ensure default duration is in the list
  if (!durations.includes(defaultDur)) {
    durations.push(defaultDur);
    durations.sort((a, b) => a - b);
  }
  const petState = getPetState();

  const reminderIntervals = {
    water: settings?.reminders?.intervals?.water || 30,
    rest: settings?.reminders?.intervals?.rest || 20,
    stretch: settings?.reminders?.intervals?.stretch || 45
  };

  const template = [
    ...(latestAvailableUpdate && latestAvailableUpdate.hasUpdate
      ? [
          {
            label: `发现新版本 v${latestAvailableUpdate.version}（点击更新）`,
            icon: getMenuIcon('update'),
            click: () => {
              const targetUrl =
                latestAvailableUpdate.downloadUrl ||
                latestAvailableUpdate.landingUrl ||
                'https://github.com/Seabass2333/DeskMate/releases/latest';
              shell.openExternal(targetUrl);
            }
          },
          { type: 'separator' }
        ]
      : []),
    {
      label: `${cleanMenuLabel(t('energy'))}  ${Math.round(petState.energy)}%`,
      icon: getMenuIcon('bolt'),
      enabled: false
    },
    { type: 'separator' },
    {
      label: cleanMenuLabel(t('talkToMe')),
      icon: getMenuIcon('chat'),
      click: () => {
        mainWindow.webContents.send('talk-to-pet');
      }
    },
    {
      label: isPomodoroActive
        ? `${cleanMenuLabel(t('focusing'))} (${currentPomodoroDuration}m)`
        : cleanMenuLabel(t('startFocus')),
      icon: getMenuIcon('timer'),
      submenu: [
        ...durations.map(min => {
          const isLocked = !isUserVip() && min > 25;
          return {
            label: min < 1
              ? `${Math.round(min * 60)}s (${cleanMenuLabel(t('test'))})`
              : `${min} ${t('minutes')}${min === defaultDur ? ` · ${t('default')}` : ''}${isLocked ? ` [${t('vip')}]` : ''}`,
            type: 'checkbox',
            checked: isPomodoroActive && currentPomodoroDuration === min,
            enabled: !isLocked,
            click: () => {
              if (isLocked) return;
              startPomodoro(min);
            }
          };
        }),
        { type: 'separator' },
        {
          label: cleanMenuLabel(t('stopFocus')),
          enabled: isPomodoroActive,
          click: () => {
            isPomodoroActive = false;
            currentPomodoroDuration = 0;
            mainWindow.webContents.send('pomodoro-stop');
          }
        }
      ]
    },
    {
      label: cleanMenuLabel(t('reminders')),
      icon: getMenuIcon('bell'),
      submenu: [
        {
          label: cleanMenuLabel(t('loopMode')),
          type: 'checkbox',
          checked: isReminderLoopMode,
          click: () => {
            isReminderLoopMode = !isReminderLoopMode;
            mainWindow.webContents.send('reminder-loop-mode-change', isReminderLoopMode);
            console.log('[Main] Loop mode:', isReminderLoopMode ? 'ON' : 'OFF');
          }
        },
        {
          label: `${cleanMenuLabel(t('testReminder'))} (10s)`,
          type: 'checkbox',
          checked: activeReminders.has('test'),
          click: () => {
            if (activeReminders.has('test')) {
              activeReminders.delete('test');
            } else {
              activeReminders.add('test');
            }
            mainWindow.webContents.send('reminder-toggle', 'test');
          }
        },
        { type: 'separator' },
        {
          label: `${cleanMenuLabel(t('drinkWater'))} (${reminderIntervals.water}${t('minutes')})`,
          type: 'checkbox',
          checked: activeReminders.has('water'),
          click: () => {
            if (activeReminders.has('water')) {
              activeReminders.delete('water');
            } else {
              activeReminders.add('water');
            }
            mainWindow.webContents.send('reminder-toggle', 'water');
          }
        },
        {
          label: `${cleanMenuLabel(t('restEyes'))} (${reminderIntervals.rest}${t('minutes')})`,
          type: 'checkbox',
          checked: activeReminders.has('rest'),
          click: () => {
            if (activeReminders.has('rest')) {
              activeReminders.delete('rest');
            } else {
              activeReminders.add('rest');
            }
            mainWindow.webContents.send('reminder-toggle', 'rest');
          }
        },
        {
          label: `${cleanMenuLabel(t('stretch'))} (${reminderIntervals.stretch}${t('minutes')})`,
          type: 'checkbox',
          checked: activeReminders.has('stretch'),
          click: () => {
            if (activeReminders.has('stretch')) {
              activeReminders.delete('stretch');
            } else {
              activeReminders.add('stretch');
            }
            mainWindow.webContents.send('reminder-toggle', 'stretch');
          }
        }
      ]
    },
    {
      label: cleanMenuLabel(t('quietMode') || '安静模式'),
      icon: getMenuIcon('moon'),
      type: 'checkbox',
      checked: getQuietMode(),
      click: (menuItem) => {
        const enabled = menuItem.checked;
        setQuietMode(enabled);
        if (mainWindow) {
          mainWindow.webContents.send('quiet-mode-changed', enabled);
        }
        console.log('[Main] Quiet mode:', enabled ? 'ON' : 'OFF');
      }
    },
    { type: 'separator' },
    // 1v1 Co-Pet & Pet Hub Entry
    ...(() => {
      const coStatus = coPetService.getStatus();
      if (coStatus.paired) {
        return [
          {
            label: `双人共养 · ${coStatus.partnerNickname} (Lv.${coStatus.bond?.level || 1})`,
            icon: getMenuIcon('heart'),
            submenu: [
              {
                label: '打开共养手账与小宠档案',
                icon: getMenuIcon('heart'),
                click: () => openCoPetWindow()
              },
              { type: 'separator' },
              {
                label: '隔空摸摸 TA (+3 羁绊)',
                click: async () => {
                  const res = await coPetService.sendInteraction('touch');
                  if (mainWindow && res.success) {
                    mainWindow.webContents.send('copet:outbound-feedback', res);
                  }
                }
              },
              {
                label: '投喂小鱼干 (+5 羁绊)',
                click: async () => {
                  const res = await coPetService.sendInteraction('feed');
                  if (mainWindow && res.success) {
                    mainWindow.webContents.send('copet:outbound-feedback', res);
                  }
                }
              },
              {
                label: '提醒 TA 喝水 (+2 羁绊)',
                click: async () => {
                  const res = await coPetService.sendInteraction('water_nudge');
                  if (mainWindow && res.success) {
                    mainWindow.webContents.send('copet:outbound-feedback', res);
                  }
                }
              }
            ]
          }
        ];
      }
      return [
        {
          label: '小宠档案与双人共养',
          icon: getMenuIcon('heart'),
          click: () => openCoPetWindow()
        }
      ];
    })(),
    // Skin switching (VIP feature)
    ...(isVipFeatureEnabled('skinSwitching') ? [{
      label: cleanMenuLabel(t('skins') || '外观皮肤'),
      icon: getMenuIcon('skin'),
      submenu: getAvailableSkins().map(skin => {
        const isLocked = !isUserVip() && skin.id !== 'mochi-v1';
        return {
          label: skin.name + (isLocked ? ` [${t('vip')}]` : ''),
          type: 'radio',
          checked: getSkin() === skin.id,
          enabled: !isLocked,
          click: () => {
            if (isLocked) return;
            setSkin(skin.id);
            mainWindow.webContents.send('skin-change', skin.id);
            if (coPetWindow && !coPetWindow.isDestroyed()) {
              coPetWindow.webContents.send('skin-change', skin.id);
            }
            trackSkinChanged(skin.id).catch(e => console.warn('[Analytics] Skin tracking failed:', e.message));
            console.log(`[Main] Skin changed to: ${skin.id}`);
          }
        };
      })
    }] : []),
    { type: 'separator' },
    {
      label: cleanMenuLabel(t('settings')),
      icon: getMenuIcon('settings'),
      click: () => {
        openSettingsWindow();
      }
    },
    {
      label: cleanMenuLabel(t('exit')),
      icon: getMenuIcon('exit'),
      click: () => app.quit()
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: mainWindow });
}

/**
 * Create a crisp pixel-art cat fallback tray icon (18x18 transparent PNG)
 */
function createFallbackTrayIcon() {
  const base64Icon = 'iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAqklEQVR42mNgoDZQkND5D8IUqQcJ/J5kA8bEGAZS8//XJzBGUQ8z6EvRNoKGwQwBqcVrELJN2DBMHq9BIAxTCGK/iuCB80FsZHmYGrhB2AwhFYMNQ3YuDEuIqIAxseK0MwgUgMgBDsJvPGaCMbIYujqiDMKGcRr08clVsgMapBcl5sgxDMUQ9Lzz3sWFKIwzb2KLPRD+dUYUjHGmH6IzIjnqiC1KSC1ySAIAcWGTv9NlkpcAAAAASUVORK5CYII=';

  return nativeImage.createFromDataURL(`data:image/png;base64,${base64Icon}`);
}

/**
 * Creates and configures the system tray icon
 */
function createTray() {
  // Destroy existing tray to prevent duplicates
  if (tray) {
    tray.destroy();
    tray = null;
  }

  // Create tray with a fallback icon first
  let trayIcon = createFallbackTrayIcon();

  // Load pixel-art tray icon (macOS auto-pairs @1x/@2x; Windows HiDPI uses 36x36 @2x directly)
  const iconFileName = process.platform === 'win32'
    ? 'tray-icon-optimized@2x.png'
    : 'tray-icon-optimized.png';
  const iconPath = path.join(__dirname, 'assets/images', iconFileName);
  try {
    const customIcon = nativeImage.createFromPath(iconPath);
    if (!customIcon.isEmpty()) {
      if (process.platform === 'win32') {
        trayIcon = customIcon;
      } else {
        const size = customIcon.getSize();
        trayIcon = (size.width === 18 && size.height === 18)
          ? customIcon
          : customIcon.resize({ width: 18, height: 18, quality: 'good' });
      }
    }
  } catch (e) {
    console.log('[Tray] Using fallback icon');
  }

  tray = new Tray(trayIcon);

  // Remove emoji title - it causes duplicate icons
  tray.setToolTip('DeskMate');

  // Build tray context menu dynamically with unified monochrome icons
  const buildTrayMenu = () => Menu.buildFromTemplate([
    ...(latestAvailableUpdate && latestAvailableUpdate.hasUpdate
      ? [
          {
            label: `发现新版本 v${latestAvailableUpdate.version}（点击更新）`,
            icon: getMenuIcon('update'),
            click: () => {
              const targetUrl =
                latestAvailableUpdate.downloadUrl ||
                latestAvailableUpdate.landingUrl ||
                'https://github.com/Seabass2333/DeskMate/releases/latest';
              shell.openExternal(targetUrl);
            }
          },
          { type: 'separator' }
        ]
      : []),
    {
      label: cleanMenuLabel(t('showHide')),
      icon: getMenuIcon('eye'),
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
          }
        }
      }
    },
    { type: 'separator' },
    {
      label: cleanMenuLabel(t('talkToMe')),
      icon: getMenuIcon('chat'),
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('talk-to-pet');
        }
      }
    },
    {
      label: `${cleanMenuLabel(t('startFocus'))} (25${t('minutes')})`,
      icon: getMenuIcon('timer'),
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          isPomodoroActive = true;
          mainWindow.webContents.send('pomodoro-start', 25);
        }
      }
    },
    { type: 'separator' },
    {
      label: '小宠档案与双人共养',
      icon: getMenuIcon('heart'),
      click: () => openCoPetWindow()
    },
    {
      label: cleanMenuLabel(t('settings')),
      icon: getMenuIcon('settings'),
      click: () => openSettingsWindow()
    },
    {
      label: cleanMenuLabel(t('autoStart')),
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        if (process.platform === 'win32') {
          app.setLoginItemSettings({
            openAtLogin: menuItem.checked,
            path: process.execPath,
            args: ['--hidden']
          });
        } else {
          app.setLoginItemSettings({
            openAtLogin: menuItem.checked,
            openAsHidden: true // Start minimized to tray on macOS
          });
        }
        console.log('[Main] Auto-start:', menuItem.checked ? 'enabled' : 'disabled');
      }
    },
    { type: 'separator' },
    {
      label: cleanMenuLabel(t('exit')),
      icon: getMenuIcon('exit'),
      click: () => app.quit()
    }
  ]);

  // Left click: Show/hide window
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });

  // Right click: Show dynamic context menu
  tray.on('right-click', () => {
    tray.popUpContextMenu(buildTrayMenu());
  });

  console.log('[Main] Tray created');
}

/**
 * Opens the settings window
 */
function openSettingsWindow() {
  // If already open, focus it
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 450,
    height: process.platform === 'win32' ? 610 : 580,
    backgroundColor: '#1a1a2e',
    modal: false,
    frame: true,
    autoHideMenuBar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload-settings.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));
  settingsWindow.setMenu(null);

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

/**
 * Opens the dedicated Pet Profile & 1v1 Co-Pet Hub window
 */
function openCoPetWindow() {
  if (coPetWindow && !coPetWindow.isDestroyed()) {
    coPetWindow.focus();
    return;
  }

  coPetWindow = new BrowserWindow({
    width: 500,
    height: process.platform === 'win32' ? 740 : 710,
    backgroundColor: '#1a1a2e',
    modal: false,
    frame: true,
    autoHideMenuBar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload-settings.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  coPetWindow.loadFile(path.join(__dirname, 'copet.html'));
  coPetWindow.setMenu(null);

  coPetWindow.on('closed', () => {
    coPetWindow = null;
  });
}

/**
 * Reinitialize LLM handler with new config
 */
function reinitializeLLM() {
  try {
    const llmConfig = getActiveConfig();
    if (llmConfig.apiKey) {
      llmHandler = new LLMHandler(llmConfig);
      console.log('[Main] LLM reinitialized with:', llmConfig.baseURL);
      return true;
    }
    console.warn('[Main] No API key in new config');
    return false;
  } catch (error) {
    console.error('[Main] Failed to reinitialize LLM:', error.message);
    return false;
  }
}

// ============================================
// Settings IPC Handlers
// ============================================

// Get current settings
ipcMain.handle('settings:get', () => {
  const userSettings = loadUserSettings();
  const vipStatus = getVipStatus();
  const currentSkin = getSkin();
  const availableSkins = getAvailableSkins();
  const presets = require('./config').getAvailablePresets();

  const baseSettings = {
    vipStatus,
    currentSkin,
    availableSkins,
    presets
  };

  if (userSettings && userSettings.llm) {
    return {
      ...baseSettings,
      region: userSettings.llm.region || 'global',
      provider: userSettings.llm.provider || 'openrouter',
      apiKey: userSettings.llm.apiKey || '',
      model: userSettings.llm.model || '',
      soundEnabled: userSettings.sound ? userSettings.sound.enabled : true,
      soundVolume: userSettings.sound && typeof userSettings.sound.volume === 'number' ? userSettings.sound.volume : 30,
      pomodoro: userSettings.pomodoro,
      reminders: userSettings.reminders
    };
  }
  // Return defaults
  return {
    ...baseSettings,
    region: 'global',
    provider: 'openrouter',
    apiKey: '',
    model: PROVIDERS.global.openrouter.model,
    soundEnabled: true,
    soundVolume: 30,
    pomodoro: {},
    reminders: {}
  };
});

// Save settings
ipcMain.handle('settings:save', (_, settings) => {
  try {
    // Build config from settings
    const preset = PROVIDERS[settings.region]?.[settings.provider];
    if (!preset) {
      return { success: false, message: 'Invalid provider' };
    }

    const llmConfig = {
      region: settings.region,
      provider: settings.provider,
      baseURL: preset.baseURL,
      apiKey: settings.apiKey,
      model: settings.model || preset.model
    };

    // Save to user settings file
    const soundConfig = {
      enabled: settings.soundEnabled !== false,
      volume: typeof settings.soundVolume === 'number' ? settings.soundVolume : 30
    };

    const result = saveUserSettings({
      llm: llmConfig,
      sound: soundConfig,
      skin: settings.skin,
      pomodoro: settings.pomodoro,
      reminders: settings.reminders
    });

    if (!result) {
      return { success: false, message: 'Failed to persist settings to storage' };
    }

    // Notify Renderer (MainWindow) of updates
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings-updated', {
        pomodoro: settings.pomodoro,
        reminders: settings.reminders,
        sound: soundConfig
      });
    }

    // Try to set skin (validates VIP)
    if (settings.skin) {
      let skinId = settings.skin;
      // Phase 4: Enforce Skin Locking
      if (!isUserVip() && skinId !== 'mochi-v1') {
        console.warn('[Main] Blocked non-VIP skin change attempt');
        skinId = 'mochi-v1';
      }

      const skinSet = setSkin(skinId);
      if (skinSet) {
        // Notify renderer to update skin immediately
        if (mainWindow) {
          mainWindow.webContents.send('skin-change', skinId);
        }
      }
    }

    // Hot-reload the LLM handler
    reinitializeLLM();
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Test connection with given config
ipcMain.handle('settings:test', async (_, settings) => {
  console.log('[Main] Testing connection with:', {
    region: settings.region,
    provider: settings.provider,
    model: settings.model,
    apiKeyLength: settings.apiKey?.length || 0
  });

  try {
    const preset = PROVIDERS[settings.region]?.[settings.provider];
    if (!preset) {
      console.log('[Main] Invalid provider:', settings.region, settings.provider);
      return { success: false, message: 'Invalid provider' };
    }

    console.log('[Main] Using baseURL:', preset.baseURL);

    const testHandler = new LLMHandler({
      baseURL: preset.baseURL,
      apiKey: settings.apiKey,
      model: settings.model || preset.model
    });

    const result = await testHandler.testConnection();
    console.log('[Main] Test result:', result);
    return result;
  } catch (error) {
    console.error('[Main] Test connection error:', error);
    return { success: false, message: error.message };
  }
});

// Close settings window
ipcMain.on('settings:close', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
  }
});

// ============================================
// IPC Handlers
// ============================================

// Toggle click-through based on mouse position over character
ipcMain.on('set-ignore-mouse', (_, ignore) => {
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

// Show the context menu
ipcMain.on('request-context-menu', () => {
  showContextMenu();
});

// Check if sound is enabled
ipcMain.handle('get-sound-enabled', () => {
  const userSettings = loadUserSettings();
  return userSettings?.sound?.enabled !== false;
});

// Get sound master volume (0-100)
ipcMain.handle('get-sound-volume', () => {
  const userSettings = loadUserSettings();
  return typeof userSettings?.sound?.volume === 'number' ? userSettings.sound.volume : 30;
});

// Load skin configuration
ipcMain.handle('skin:load', async (_, skinId) => {
  try {
    // Assets are inside asar, so __dirname works for both dev and packaged
    const skinPath = path.join(__dirname, 'assets', 'skins', skinId, 'config.json');

    console.log('[Main] Loading skin from:', skinPath);

    if (!fs.existsSync(skinPath)) {
      console.error('[Main] Skin config not found at:', skinPath);
      // Try fallback to default skin
      const defaultPath = path.join(__dirname, 'assets', 'skins', 'mochi-v1', 'config.json');
      if (skinId !== 'mochi-v1' && fs.existsSync(defaultPath)) {
        console.log('[Main] Falling back to default skin');
        return JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
      }
      throw new Error(`Skin config not found: ${skinPath}`);
    }

    const config = JSON.parse(fs.readFileSync(skinPath, 'utf8'));
    return config;
  } catch (error) {
    console.error('[Main] Failed to load skin:', error);
    return null;
  }
});

// Get current skin configuration with basePath for TypeScript modules
ipcMain.handle('skin:getCurrent', async () => {
  try {
    const skinId = getSkin() || 'mochi-v1';
    const skinPath = path.join(__dirname, 'assets', 'skins', skinId);
    const configPath = path.join(skinPath, 'config.json');

    console.log('[Main] Getting current skin:', skinId);

    if (!fs.existsSync(configPath)) {
      console.error('[Main] Current skin config not found:', configPath);
      return null;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Return POSIX relative basePath so Chromium Audio/img URLs work identically on Windows & macOS
    return {
      ...config,
      id: skinId,
      basePath: `assets/skins/${skinId}`,
    };
  } catch (error) {
    console.error('[Main] Failed to get current skin:', error);
    return null;
  }
});

// Get current window position for dragging
ipcMain.handle('get-window-position', () => {
  if (mainWindow) {
    return mainWindow.getPosition();
  }
  return [0, 0];
});

// Set window position during drag (use setBounds to prevent Windows 125%/150% DPI window ballooning)
ipcMain.on('set-window-position', (_, { x, y }) => {
  if (mainWindow) {
    if (process.platform === 'win32') {
      mainWindow.setBounds({ x: Math.round(x), y: Math.round(y), width: 250, height: 250 });
    } else {
      mainWindow.setPosition(Math.round(x), Math.round(y));
    }
  }
});

// Show system notification
ipcMain.on('show-notification', (_, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

// Pomodoro completed - reset state & reward Co-Pet bond EXP if paired
ipcMain.on('pomodoro-complete', () => {
  isPomodoroActive = false;
  currentPomodoroDuration = 0;
  if (coPetService.getStatus().paired) {
    coPetService.sendInteraction('pomodoro_cheer').catch(() => {});
  }
  console.log('[Main] Pomodoro completed, state reset');
});

// Reminder triggered - remove from active set
ipcMain.on('reminder-complete', (_, type) => {
  activeReminders.delete(type);
  console.log(`[Main] Reminder completed: ${type}`);
});

// Open external URL in default browser
ipcMain.on('open-external', (_, url) => {
  shell.openExternal(url);
});

// ============================================
// Pet Energy IPC Handlers
// ============================================

// Get pet state
ipcMain.handle('pet:getState', () => {
  return getPetState();
});

// Save pet state
ipcMain.handle('pet:saveState', (_, petState) => {
  return savePetState(petState);
});

// ============================================
// VIP IPC Handlers
// ============================================

ipcMain.handle('vip:redeem', async (_, code) => {
  console.log(`[Main] Redeeming code: ${code}`);
  try {
    const result = await redeemInviteCode(code);
    console.log(`[Main] Redeem result:`, result);

    if (result.success) {
      trackVipActivated(result.tier).catch(e => console.warn('[Analytics] VIP tracking failed:', e.message));
    }

    return result;
  } catch (error) {
    console.error('[Main] Redeem error:', error);
    return { valid: false, message: 'Internal error' };
  }
});

ipcMain.handle('vip:getStatus', () => {
  return getVipStatus();
});

// Quiet Mode IPC handlers
ipcMain.handle('quietMode:get', () => {
  return getQuietMode();
});

// Debug: Reset VIP
ipcMain.handle('vip:reset', async () => {
  const store = require('./store');
  const { inviteCodeService } = require('./src/services/InviteCodeService');

  // 1. Reset Local
  store.set('vip', { enabled: false, code: '', activatedAt: '' });

  // 2. Reset Backend
  await inviteCodeService.debugResetUser();

  // 3. Reset Skin
  if (getSkin() !== 'mochi-v1') {
    setSkin('mochi-v1');
  }
  return { success: true };
});

// ============================================
// Auth IPC Handlers
// ============================================

ipcMain.handle('auth:sendOtp', async (_, email) => {
  try {
    return await authService.sendOtp(email);
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('auth:verifyOtp', async (_, { email, token }) => {
  try {
    return await authService.verifyOtp(email, token);
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('auth:getStatus', () => {
  return authService.getUser();
});

ipcMain.handle('auth:signOut', async () => {
  await authService.signOut();
  return true;
});

// ============================================
// Settings Sync IPC Handlers
// ============================================

const { settingsSyncService, SYNC_KEYS } = require('./src/services/SettingsSyncService');

ipcMain.handle('settings:syncToCloud', async () => {
  const store = require('./store');
  const settings = {
    [SYNC_KEYS.SKIN]: store.get('skin'),
    [SYNC_KEYS.LANGUAGE]: store.get('language'),
    [SYNC_KEYS.POMODORO]: store.get('pomodoro')
  };
  return await settingsSyncService.syncToCloud(settings);
});

ipcMain.handle('settings:applyFromCloud', async () => {
  const store = require('./store');
  return await settingsSyncService.applyFromCloud(store);
});

// ============================================
// Ops IPC Handlers
// ============================================

const { opsService } = require('./src/services/OpsService');

ipcMain.handle('ops:getAnnouncements', async () => {
  return await opsService.getAnnouncements();
});

ipcMain.handle('ops:submitFeedback', async (_, feedback) => {
  return await opsService.submitFeedback(feedback);
});

ipcMain.handle('quietMode:set', (_, enabled) => {
  const success = setQuietMode(enabled);
  if (success && mainWindow) {
    mainWindow.webContents.send('quiet-mode-changed', enabled);
  }
  return { success, enabled: getQuietMode() };
});

// Modify pet energy
ipcMain.handle('pet:modifyEnergy', (_, delta) => {
  const state = getPetState();
  state.energy = Math.max(5, Math.min(100, state.energy + delta)); // Clamp 5-100
  state.lastEnergyUpdate = new Date().toISOString();
  if (delta > 0) {
    state.totalInteractions = (state.totalInteractions || 0) + 1;
  }
  savePetState(state);
  return state;
});

// ============================================
// AI/LLM IPC Handlers
// ============================================

// Handle AI chat request with seamless offline fallback
ipcMain.handle('ai:ask', async (_, userMessage) => {
  const currentSkin = getSkin() || 'mochi-v1';

  if (!llmHandler) {
    return getOfflineReply(userMessage, currentSkin);
  }

  try {
    const result = await llmHandler.chat(userMessage);
    if (result && result.success) {
      return result;
    }
    console.warn('[Main] AI returned non-success, falling back to offline reply');
    return getOfflineReply(userMessage, currentSkin);
  } catch (error) {
    console.error('[Main] AI request error, falling back to offline reply:', error);
    return getOfflineReply(userMessage, currentSkin);
  }
});

// Test LLM connection
ipcMain.handle('ai:test', async () => {
  if (!llmHandler) {
    return { success: false, message: 'LLM not initialized' };
  }
  return await llmHandler.testConnection();
});

// Clear conversation history
ipcMain.handle('ai:clearHistory', () => {
  if (llmHandler) {
    llmHandler.clearHistory();
    return { success: true };
  }
  return { success: false };
});

// ============================================
// i18n IPC Handlers
// ============================================

ipcMain.handle('i18n:getLanguage', () => getLanguage());

ipcMain.handle('i18n:setLanguage', (_, lang) => {
  const success = setLanguage(lang);

  // Rebuild tray menu with new language
  if (success && tray) {
    createTray(); // Recreate tray menu with updated translations
  }

  // Notify renderer to refresh UI
  if (success && mainWindow) {
    mainWindow.webContents.send('language-changed', getLanguage());
  }

  return { success, language: getLanguage() };
});

ipcMain.handle('i18n:getSupported', () => SUPPORTED_LANGUAGES);

ipcMain.handle('i18n:translate', (_, key) => t(key));

// App Info
ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:isDev', () => !app.isPackaged);

// Random Idle Message
ipcMain.handle('i18n:getRandomIdleMessage', (_, skinId) => getRandomIdleMessage(skinId));

// ============================================
// 1v1 Co-Pet & Pet Hub IPC Handlers
// ============================================

coPetService.onPartnerEvent((event) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('copet:partner-event', event);
  }
});

coPetService.onStatusChange((status) => {
  if (coPetWindow && !coPetWindow.isDestroyed()) {
    coPetWindow.webContents.send('copet:status-changed', status);
  }
});

ipcMain.on('copet:openWindow', () => {
  openCoPetWindow();
});

ipcMain.on('copet:closeWindow', () => {
  if (coPetWindow && !coPetWindow.isDestroyed()) {
    coPetWindow.close();
  }
});

ipcMain.handle('skin:switch', (_, skinId) => {
  if (!skinId) return { success: false };
  const isLocked = !isUserVip() && skinId !== 'mochi-v1';
  if (isLocked) return { success: false, message: 'VIP required' };

  setSkin(skinId);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('skin-change', skinId);
  }
  trackSkinChanged(skinId).catch(() => {});
  return { success: true, skinId };
});

ipcMain.handle('copet:getStatus', () => {
  return coPetService.getStatus();
});

ipcMain.handle('copet:generateCode', async () => {
  return await coPetService.generateMyCode();
});

ipcMain.handle('copet:bind', async (_, { code, options, nickname }) => {
  return await coPetService.bindPartner(code, options || nickname);
});

ipcMain.handle('copet:updateProfile', (_, profile) => {
  return coPetService.updateProfile(profile);
});

ipcMain.handle('copet:unpair', async (_, confirmToken) => {
  return await coPetService.unpair(confirmToken);
});

ipcMain.handle('copet:sendAction', async (_, actionType) => {
  const res = await coPetService.sendInteraction(actionType);
  if (mainWindow && !mainWindow.isDestroyed() && res.success) {
    mainWindow.webContents.send('copet:outbound-feedback', res);
  }
  return res;
});

// ============================================
// App Lifecycle
// ============================================
// Auto Updater Logic
const { autoUpdater } = require('electron-updater');

function setupAutoUpdater() {
  const CHECK_INTERVAL = 60 * 60 * 1000;
  const isUnsignedMac = process.platform === 'darwin';

  autoUpdater.logger = console;
  // On Windows NSIS (verifyUpdateCodeSignature: false), autoDownload works seamlessly.
  // On unsigned macOS (identity: null), Squirrel.Mac throws signature errors on download/install,
  // so we disable Squirrel autoDownload on macOS and provide one-click direct DMG download instead.
  autoUpdater.autoDownload = !isUnsignedMac;

  if (!app.isPackaged) {
    autoUpdater.forceDevUpdateConfig = true;
    console.log('[AutoUpdater] Running in dev mode, forced dev update config');
  }

  let isCriticalUpdate = false;
  let isUpdateDialogShown = false;
  let notifiedVersionInSession = null;

  function sendStatusToSettings(status, data = null) {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send('app:updateStatus', { status, data });
    }
  }

  function notifyPetAndUser(updateInfo, { isManual = false } = {}) {
    if (!updateInfo || !updateInfo.hasUpdate) return;
    latestAvailableUpdate = updateInfo;
    isCriticalUpdate = Boolean(updateInfo.isCritical);

    // 1. Send to Settings window if open
    sendStatusToSettings('available', updateInfo);

    // 2. Notify Desktop Pet bubble gently
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:update-available', updateInfo);
    }

    // 3. If on Windows packaged build, let electron-updater download in background unless it fails
    if (!isUnsignedMac && app.isPackaged && !isManual) {
      return;
    }

    // 4. Show non-intrusive one-click download prompt (once per version per session, or on manual check, or critical)
    if (!isManual && !isCriticalUpdate && notifiedVersionInSession === updateInfo.version) {
      return;
    }
    if (isUpdateDialogShown) return;

    notifiedVersionInSession = updateInfo.version;
    isUpdateDialogShown = true;

    const store = require('./store');
    const lang = store.get('language', 'zh-CN');
    const isZh = String(lang).startsWith('zh');

    // Update tray tooltip so hovering the menu bar cat also shows the new version
    if (tray && !tray.isDestroyed()) {
      tray.setToolTip(`DeskMate (发现新版本 v${updateInfo.version})`);
    }

    // Send a native OS notification (always visible even when app.dock.hide() is active on macOS)
    try {
      if (Notification.isSupported()) {
        const updateNotif = new Notification({
          title: isZh ? `🎉 DeskMate 发现新版本 v${updateInfo.version}` : `🎉 DeskMate v${updateInfo.version} Available`,
          body: isZh
            ? '点击即可直接下载最新安装包，覆盖安装保留全部数据~'
            : 'Click to download the latest installer directly.'
        });
        updateNotif.on('click', () => {
          shell.openExternal(updateInfo.downloadUrl || updateInfo.githubUrl);
        });
        updateNotif.show();
      }
    } catch (e) {
      console.warn('[AutoUpdater] System notification skipped:', e.message);
    }

    // Bring app to front on macOS tray-only mode so dialog isn't hidden behind other windows
    if (process.platform === 'darwin') {
      app.focus({ steal: true });
    }

    dialog
      .showMessageBox({
        type: isCriticalUpdate ? 'warning' : 'info',
        title: isZh ? `🎉 发现 DeskMate 新版本 v${updateInfo.version}` : `🎉 DeskMate v${updateInfo.version} Available`,
        message: isZh
          ? `检测到新版本 v${updateInfo.version}（当前版本 v${updateInfo.currentVersion}）`
          : `A new version v${updateInfo.version} is available (Current: v${updateInfo.currentVersion}).`,
        detail: isZh
          ? '点击「立即下载安装包」可直接获取最新安装包，覆盖安装即可完成升级（您的本地数据与共养记录会自动保留）。'
          : 'Click "Download Installer" to get the latest installer directly. Your pet data and settings will be preserved.',
        buttons: isZh
          ? ['立即下载安装包', '前往官网下载页', '稍后提醒']
          : ['Download Installer', 'Open Landing Page', 'Later'],
        defaultId: 0,
        cancelId: isCriticalUpdate ? 0 : 2
      })
      .then(({ response }) => {
        isUpdateDialogShown = false;
        if (response === 0) {
          shell.openExternal(updateInfo.downloadUrl || updateInfo.githubUrl);
          if (isCriticalUpdate) app.quit();
        } else if (response === 1) {
          shell.openExternal(updateInfo.landingUrl || updateInfo.githubUrl);
          if (isCriticalUpdate) app.quit();
        } else if (isCriticalUpdate) {
          app.quit();
        }
      });
  }

  /**
   * Unified update check combining multi-source remote check (GitHub Releases + Static Manifest)
   * and electron-updater (for Windows background auto-install).
   */
  async function performUpdateCheck({ isManual = false } = {}) {
    sendStatusToSettings('checking');
    const currentVersion = app.getVersion();
    // Use Electron's net.fetch so macOS/Windows system proxies (Clash/Surge/VPN) are respected!
    const electronFetch = (net && typeof net.fetch === 'function')
      ? (...args) => net.fetch(...args)
      : global.fetch;

    try {
      const remoteInfo = await checkRemoteRelease(currentVersion, { fetchFn: electronFetch });
      if (remoteInfo.hasUpdate) {
        notifyPetAndUser(remoteInfo, { isManual });
        if (!isUnsignedMac && app.isPackaged) {
          autoUpdater.checkForUpdates().catch((err) => {
            console.warn('[AutoUpdater] Background NSIS check failed, falling back to download prompt:', err.message);
            // If Windows background NSIS download fails, still surface the one-click download prompt!
            notifyPetAndUser(remoteInfo, { isManual: true });
          });
        }
        return remoteInfo;
      } else {
        latestAvailableUpdate = remoteInfo;
        sendStatusToSettings('not-available', remoteInfo);
        return remoteInfo;
      }
    } catch (remoteErr) {
      console.warn('[AutoUpdater] Remote check fallback to electron-updater:', remoteErr.message);
      try {
        const res = await autoUpdater.checkForUpdates();
        if (res && res.updateInfo) {
          const payload = formatUpdatePayload(currentVersion, res.updateInfo.version, {
            releaseNotes:
              typeof res.updateInfo.releaseNotes === 'string' ? res.updateInfo.releaseNotes : '',
            source: 'electron-updater'
          });
          if (payload.hasUpdate) {
            notifyPetAndUser(payload, { isManual });
          } else {
            sendStatusToSettings('not-available', payload);
          }
          return payload;
        }
      } catch (updaterErr) {
        console.error('[AutoUpdater] Both remote and updater checks failed:', updaterErr.message);
        sendStatusToSettings('error', updaterErr.message);
        return { error: updaterErr.message };
      }
    }
  }

  // Manual check handler from Settings UI
  ipcMain.handle('app:checkUpdate', async () => {
    return await performUpdateCheck({ isManual: true });
  });

  // Expose latest cached update status if Settings opens later
  ipcMain.handle('app:getLatestUpdateInfo', () => {
    return latestAvailableUpdate;
  });

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] electron-updater found update:', info?.version);
    const payload = formatUpdatePayload(app.getVersion(), info?.version, {
      releaseNotes: typeof info?.releaseNotes === 'string' ? info.releaseNotes : '',
      source: 'electron-updater'
    });
    if (payload.hasUpdate) {
      notifyPetAndUser(payload, { isManual: false });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] Update not available.');
    if (!latestAvailableUpdate || !latestAvailableUpdate.hasUpdate) {
      sendStatusToSettings('not-available', info);
    }
  });

  autoUpdater.on('error', (err) => {
    console.warn('[AutoUpdater] Notice:', err.message);
    // If an update was already found (e.g. on unsigned macOS), do NOT overwrite the 'available' UI state with an error!
    if (latestAvailableUpdate && latestAvailableUpdate.hasUpdate) {
      return;
    }
    sendStatusToSettings('error', err.message);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToSettings('downloading', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info?.version);
    if (isUpdateDialogShown) return;

    const store = require('./store');
    const lang = store.get('language', 'zh-CN');
    const isZh = String(lang).startsWith('zh');

    isUpdateDialogShown = true;
    dialog
      .showMessageBox({
        type: isCriticalUpdate ? 'warning' : 'info',
        title: isZh ? 'DeskMate 更新已就绪' : 'DeskMate Update Ready',
        message: isZh
          ? `新版本 v${info?.version || ''} 已下载完成，是否立即重启以应用更新？`
          : 'A new version has been downloaded. Restart the application to apply the update?',
        buttons: isCriticalUpdate
          ? [isZh ? '立即重启' : 'Restart Now']
          : isZh
          ? ['立即重启', '稍后']
          : ['Restart', 'Later'],
        defaultId: 0,
        cancelId: isCriticalUpdate ? 0 : 1
      })
      .then((returnValue) => {
        if (returnValue.response === 0 || isCriticalUpdate) {
          autoUpdater.quitAndInstall(false, true);
        } else {
          isUpdateDialogShown = false;
        }
      });
  });

  // Initial check on startup (after 3.5s so main window is ready)
  setTimeout(() => {
    performUpdateCheck({ isManual: false }).catch((err) =>
      console.warn('[AutoUpdater] Initial check failed:', err.message)
    );
  }, 3500);

  // Periodic hourly check
  setInterval(() => {
    performUpdateCheck({ isManual: false }).catch((err) =>
      console.warn('[AutoUpdater] Interval check failed:', err.message)
    );
  }, CHECK_INTERVAL);
}

// App lifecycle
app.whenReady().then(() => {
  // Hide dock icon on macOS (tray-only app)
  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  // Initialize i18n with system language detection
  initI18n();

  // Initialize LLM Handler with active config
  try {
    const llmConfig = getActiveConfig();
    if (llmConfig.apiKey) {
      llmHandler = new LLMHandler(llmConfig);
      console.log('[Main] LLM initialized with:', llmConfig.baseURL);
    } else {
      console.warn('[Main] No API key configured. LLM features disabled.');
    }
  } catch (error) {
    console.error('[Main] Failed to initialize LLM:', error.message);
  }

  createWindow();
  createTray();

  // Track app launch (v1.2 analytics)
  trackAppLaunched().catch(e => console.warn('[Analytics] App launch tracking failed:', e.message));

  // Sync VIP Status (Check expiration)
  syncVipStatus();

  // Setup Auto Updater
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
