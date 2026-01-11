const { app, BrowserWindow, ipcMain, Menu, Notification, dialog, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const LLMHandler = require('./src/services/llmHandler');
const { getActiveConfig, saveUserSettings, loadUserSettings, PROVIDERS } = require('./config');
const { initI18n, t, setLanguage, getLanguage, SUPPORTED_LANGUAGES } = require('./i18n');

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

  // Uncomment for debugging
  mainWindow.webContents.openDevTools({ mode: 'detach' });
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
  const durations = [15, 20, 25, 30, 45, 60];

  const template = [
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
        ...durations.map(min => ({
          label: `${min} ${t('minutes')}${min === 25 ? ' ⭐' : ''}`,
          type: 'checkbox', // Use checkbox to show selection state
          checked: isPomodoroActive && currentPomodoroDuration === min,
          click: () => startPomodoro(min)
        })),
        { type: 'separator' },
        {
          label: `${t('stopFocus')}`, // Added Red Stop Sign
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
          label: `${t('drinkWater')} (30${t('minutes')})`,
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
          label: `${t('restEyes')} (20${t('minutes')})`,
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
          label: `${t('stretch')} (45${t('minutes')})`,
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
  const iconPath = path.join(__dirname, 'assets/images/tray-icon.png');
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
  if (userSettings && userSettings.llm) {
    return {
      region: userSettings.llm.region || 'china',
      provider: userSettings.llm.provider || 'deepseek',
      apiKey: userSettings.llm.apiKey || '',
      model: userSettings.llm.model || '',
      soundEnabled: userSettings.sound ? userSettings.sound.enabled : true
    };
  }
  // Return defaults
  return {
    region: 'china',
    provider: 'deepseek',
    apiKey: PROVIDERS.china.deepseek.apiKey || '',
    model: PROVIDERS.china.deepseek.model,
    soundEnabled: true
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
      sound: { enabled: settings.soundEnabled }
    });

    if (result) {
      // Hot-reload the LLM handler
      reinitializeLLM();
      return { success: true };
    }
    return { success: false, message: 'Failed to save file' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Test connection with given config
ipcMain.handle('settings:test', async (_, settings) => {
  try {
    const preset = PROVIDERS[settings.region]?.[settings.provider];
    if (!preset) {
      return { success: false, message: 'Invalid provider' };
    }

    const testHandler = new LLMHandler({
      baseURL: preset.baseURL,
      apiKey: settings.apiKey,
      model: settings.model || preset.model
    });

    return await testHandler.testConnection();
  } catch (error) {
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
    const skinPath = path.join(__dirname, 'assets', 'skins', skinId, 'config.json');
    if (!fs.existsSync(skinPath)) {
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

// Pomodoro state is now managed entirely in main.js via startPomodoro/stopPomodoro
// No need for renderer to notify us

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
