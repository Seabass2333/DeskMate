const { app, BrowserWindow, ipcMain, Menu, Notification, dialog, Tray, nativeImage } = require('electron');
const path = require('path');
const LLMHandler = require('./src/services/llmHandler');
const { getActiveConfig, saveUserSettings, loadUserSettings, PROVIDERS } = require('./config');

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

  // Uncomment for debugging
  // mainWindow.webContents.openDevTools({ mode: 'detached' });
}

/**
 * Helper to start pomodoro with given duration
 */
function startPomodoro(minutes) {
  isPomodoroActive = true;
  mainWindow.webContents.send('pomodoro-start', minutes);
}

/**
 * Builds and shows the context menu with Pomodoro controls
 */
function showContextMenu() {
  const template = [
    {
      label: '💬 Talk to Me',
      click: () => {
        mainWindow.webContents.send('talk-to-pet');
      }
    },
    { type: 'separator' },
    {
      label: isPomodoroActive ? '🍅 专注中...' : '🍅 开始专注',
      submenu: [
        { label: '15 分钟', click: () => startPomodoro(15) },
        { label: '20 分钟', click: () => startPomodoro(20) },
        { label: '25 分钟 ⭐', click: () => startPomodoro(25) },
        { label: '30 分钟', click: () => startPomodoro(30) },
        { label: '45 分钟', click: () => startPomodoro(45) },
        { label: '60 分钟', click: () => startPomodoro(60) },
        { type: 'separator' },
        {
          label: '⏹ 停止专注',
          enabled: isPomodoroActive,
          click: () => {
            isPomodoroActive = false;
            mainWindow.webContents.send('pomodoro-stop');
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: '⏰ 定时提醒',
      submenu: [
        {
          label: '💧 喝水 (30分钟)',
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
          label: '👀 休息眼睛 (20分钟)',
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
          label: '🧘 伸展 (45分钟)',
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
      label: '⚙️ 设置',
      click: () => {
        openSettingsWindow();
      }
    },
    { type: 'separator' },
    {
      label: 'Exit DeskMate',
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
  // Create tray with a fallback icon first
  let trayIcon = createFallbackTrayIcon();

  // Try to load custom icon
  const iconPath = path.join(__dirname, 'assets/images/tray-icon.png');
  try {
    const customIcon = nativeImage.createFromPath(iconPath);
    if (!customIcon.isEmpty()) {
      trayIcon = customIcon.resize({ width: 16, height: 16 });
      if (process.platform === 'darwin') {
        trayIcon.setTemplateImage(true);
      }
    }
  } catch (e) {
    console.log('[Tray] Using fallback icon');
  }

  tray = new Tray(trayIcon);

  // On macOS, use emoji title if icon is not visible
  if (process.platform === 'darwin') {
    tray.setTitle('🐱');
  }

  tray.setToolTip('DeskMate');

  // Build tray context menu
  const trayMenu = Menu.buildFromTemplate([
    {
      label: '🐱 显示/隐藏',
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
      label: '💬 对话',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('talk-to-pet');
        }
      }
    },
    {
      label: '🍅 番茄钟 (25分钟)',
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
      label: '⚙️ 设置',
      click: () => openSettingsWindow()
    },
    {
      label: '🚀 开机自启',
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
      label: '❌ 退出',
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
    height: 520,
    parent: mainWindow,
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
      model: userSettings.llm.model || ''
    };
  }
  // Return defaults
  return {
    region: 'china',
    provider: 'deepseek',
    apiKey: PROVIDERS.china.deepseek.apiKey || '',
    model: PROVIDERS.china.deepseek.model
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
    const result = saveUserSettings({ llm: llmConfig });

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

// Update pomodoro state from renderer
ipcMain.on('pomodoro-state-change', (_, isActive) => {
  isPomodoroActive = isActive;
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
// App Lifecycle
// ============================================

app.whenReady().then(() => {
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
