// Load environment variables from .env.local
require('dotenv').config({ path: require('path').join(__dirname, '.env.local') });

const { app, BrowserWindow, ipcMain, Menu, Notification, dialog, Tray, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const LLMHandler = require('./src/services/llmHandler');
const { getActiveConfig, saveUserSettings, loadUserSettings, PROVIDERS, getPetState, savePetState, getSkin, setSkin, getAvailableSkins, isVipFeatureEnabled, redeemInviteCode, getVipStatus, getQuietMode, setQuietMode, isUserVip } = require('./config');
const { initI18n, t, setLanguage, getLanguage, SUPPORTED_LANGUAGES } = require('./i18n');
const { trackAppLaunched, trackSkinChanged, trackVipActivated } = require('./src/services/AnalyticsService');
const { authService } = require('./src/services/AuthService');

// Hot reload in development mode only
if (!app.isPackaged) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
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

/**
 * Creates the main application window with transparent, frameless configuration
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 250,
    height: 250,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
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

  // Mac-specific: Show on all workspaces
  if (process.platform === 'darwin') {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
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
    { label: `⚡ Energy: ${Math.round(petState.energy)}%`, enabled: false },
    { type: 'separator' },
    {
      label: t('talkToMe'),
      click: () => {
        mainWindow.webContents.send('talk-to-pet');
      }
    },
    { type: 'separator' },
    {
      label: isPomodoroActive ? `${t('focusing')} (${currentPomodoroDuration}m)` : t('startFocus'),
      submenu: [
        ...durations.map(min => {
          // Phase 4: Lock >25m for non-VIP
          const isLocked = !isUserVip() && min > 25;
          return {
            label: min < 1 ? `⚡ ${Math.round(min * 60)}s (Test)` : `${min} ${t('minutes')}${min === defaultDur ? ' (Default)' : ''}${isLocked ? ' 🔒 (VIP)' : ''}`,
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
          label: `${t('stopFocus')}`,
          enabled: isPomodoroActive,
          click: () => {
            isPomodoroActive = false;
            currentPomodoroDuration = 0;
            mainWindow.webContents.send('pomodoro-stop');
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: t('reminders'),
      submenu: [
        {
          label: t('loopMode'),
          type: 'checkbox',
          checked: isReminderLoopMode,
          click: () => {
            isReminderLoopMode = !isReminderLoopMode;
            mainWindow.webContents.send('reminder-loop-mode-change', isReminderLoopMode);
            console.log('[Main] Loop mode:', isReminderLoopMode ? 'ON' : 'OFF');
          }
        },
        { type: 'separator' },
        {
          label: `${t('testReminder')} (10s)`,
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
          label: `${t('drinkWater')} (${reminderIntervals.water}${t('minutes')})`,
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
          label: `${t('restEyes')} (${reminderIntervals.rest}${t('minutes')})`,
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
          label: `${t('stretch')} (${reminderIntervals.stretch}${t('minutes')})`,
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
    { type: 'separator' },
    // Skin switching (VIP feature)
    ...(isVipFeatureEnabled('skinSwitching') ? [{
      label: `${t('skins') || 'Skins'}`,
      submenu: getAvailableSkins().map(skin => {
        const isLocked = !isUserVip() && skin.id !== 'mochi-v1';
        return {
          label: skin.name + (isLocked ? ' 🔒 (VIP)' : ''),
          type: 'radio',
          checked: getSkin() === skin.id,
          enabled: !isLocked,
          click: () => {
            if (isLocked) return;
            setSkin(skin.id);
            mainWindow.webContents.send('skin-change', skin.id);
            trackSkinChanged(skin.id).catch(e => console.warn('[Analytics] Skin tracking failed:', e.message));
            console.log(`[Main] Skin changed to: ${skin.id}`);
          }
        };
      })
    }] : []),
    { type: 'separator' },
    {
      label: `💤 ${t('quietMode') || 'Quiet Mode'}`,
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
    {
      label: t('settings'),
      click: () => {
        openSettingsWindow();
      }
    },
    { type: 'separator' },
    {
      label: t('exit'),
      click: () => app.quit()
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: mainWindow });
}

/**
 * Create a simple fallback tray icon (16x16 cat silhouette)
 */
function createFallbackTrayIcon() {
  // Create a simple 16x16 black cat silhouette as base64 PNG
  // This is a minimal cat head shape
  const base64Icon = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAjklEQVQ4T2NkoBAwUqifYdQAhtEwGPYBMH78+P8MDAwMjIyM/+GAIAOQBvMJqQFJg/UjS+LTAzEAZgiyBnyuJdYFyAaguw5fGBDrAqQ0suNxuQBZL7IBqJrwGYCsF90AZENgGrEFArpedAOQNYI1UBILuAxA149sALohlLkAWxggB8NoGCAHJHlxyBgPAwDfaz0RTcqI4gAAAABJRU5ErkJggg==';

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

  // Try to load custom icon
  const iconPath = path.join(__dirname, 'assets/images/tray-icon-optimized.png');
  try {
    const customIcon = nativeImage.createFromPath(iconPath);
    if (!customIcon.isEmpty()) {
      trayIcon = customIcon.resize({ width: 18, height: 18 });
      // Don't set as template image to preserve colors
    }
  } catch (e) {
    console.log('[Tray] Using fallback icon');
  }

  tray = new Tray(trayIcon);

  // Remove emoji title - it causes duplicate icons
  tray.setToolTip('DeskMate');

  // Build tray context menu
  const trayMenu = Menu.buildFromTemplate([
    {
      label: t('showHide'),
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
      label: t('talkToMe'),
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('talk-to-pet');
        }
      }
    },
    {
      label: `${t('startFocus')} (25${t('minutes')})`,
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
      label: t('settings'),
      click: () => openSettingsWindow()
    },
    {
      label: t('autoStart'),
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
          openAsHidden: true // Start minimized to tray
        });
        console.log('[Main] Auto-start:', menuItem.checked ? 'enabled' : 'disabled');
      }
    },
    { type: 'separator' },
    {
      label: t('exit'),
      click: () => app.quit()
    }
  ]);

  // Don't use setContextMenu - we'll show it on right-click only
  // tray.setContextMenu(trayMenu);

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

  // Right click: Show context menu
  tray.on('right-click', () => {
    tray.popUpContextMenu(trayMenu);
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
    height: 580,
    // Removed parent to make window independent
    modal: false,
    frame: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload-settings.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.loadFile('settings.html');
  settingsWindow.setMenu(null);

  settingsWindow.on('closed', () => {
    settingsWindow = null;
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
    const result = saveUserSettings({
      llm: llmConfig,
      sound: { enabled: settings.soundEnabled },
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
        sound: { enabled: settings.soundEnabled }
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

// Get current window position for dragging
ipcMain.handle('get-window-position', () => {
  if (mainWindow) {
    return mainWindow.getPosition();
  }
  return [0, 0];
});

// Set window position during drag
ipcMain.on('set-window-position', (_, { x, y }) => {
  if (mainWindow) {
    mainWindow.setPosition(Math.round(x), Math.round(y));
  }
});

// Show system notification
ipcMain.on('show-notification', (_, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

// Pomodoro completed - reset state
ipcMain.on('pomodoro-complete', () => {
  isPomodoroActive = false;
  currentPomodoroDuration = 0;
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
ipcMain.handle('vip:reset', () => {
  const store = require('./store');
  store.set('vip', { enabled: false, code: '', activatedAt: '' });
  // Also reset skin if premium
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

// Handle AI chat request
ipcMain.handle('ai:ask', async (_, userMessage) => {
  if (!llmHandler) {
    return {
      success: false,
      message: "My brain isn't initialized yet. Try again! 🧠"
    };
  }

  try {
    const result = await llmHandler.chat(userMessage);
    return result;
  } catch (error) {
    console.error('[Main] AI request error:', error);
    return {
      success: false,
      message: "Something went wrong with my brain... 🤯"
    };
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

// ============================================
// App Lifecycle
// ============================================
// Auto Updater Logic
const { autoUpdater } = require('electron-updater');

function setupAutoUpdater() {
  // Check for updates every hour
  const CHECK_INTERVAL = 60 * 60 * 1000;

  autoUpdater.logger = console;
  autoUpdater.autoDownload = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] Update not available.');
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log('[AutoUpdater] ' + log_message);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded');
    dialog.showMessageBox({
      type: 'info',
      title: 'DeskMate Update',
      message: 'A new version has been downloaded. Restart the application to apply the update?',
      buttons: ['Restart', 'Later']
    }).then((returnValue) => {
      if (returnValue.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  // Initial check
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, CHECK_INTERVAL);
  }
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
