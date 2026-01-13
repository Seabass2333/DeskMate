# 🐱 DeskMate

A cute desktop pet with AI chat, Pomodoro timer, and smart reminders.

![DeskMate Screenshot](assets/skins/mochi-v1/idle.png)

## ✨ Features

- 🐱 **Pixel Cat Companion** - Lives on your desktop with smooth animations
- 💬 **AI Chat** - Powered by DeepSeek/OpenRouter/OpenAI with personality
- 🍅 **Pomodoro Timer** - 15-60 minute focus sessions
- ⏰ **Smart Reminders** - Drink water, rest eyes, stretch
- 🌐 **7 Languages** - 中文, English, 日本語, 한국어, Español, Français, Deutsch
- 🔊 **Sound Effects** - Interactive sounds with toggle
- 🙈 **Stealth Mode** - Hides from Dock, lives in Tray
- 🚀 **Auto-start** - Launch on system boot

## 📥 Download & Install

[![GitHub Release](https://img.shields.io/github/v/release/Seabass2333/DeskMate?style=flat-square)](https://github.com/Seabass2333/DeskMate/releases/latest)

### Windows
1. Download `DeskMate-x.x.x-win-x64.exe` from [Releases](https://github.com/Seabass2333/DeskMate/releases/latest)
2. Run the installer and follow the prompts
3. Launch DeskMate from Start Menu or Desktop shortcut

### macOS
1. Download `DeskMate-x.x.x-mac-universal.dmg` from [Releases](https://github.com/Seabass2333/DeskMate/releases/latest)
2. Open the DMG and drag DeskMate to Applications folder

> ⚠️ **首次打开提示 "无法验证开发者"？**
> 
> 这是因为应用尚未进行 Apple 官方签名（需要 $99/年的开发者账号）。
> 
> **解决方法：**
> - **方法一**：右键点击 DeskMate.app → 选择「打开」→ 在弹窗中点「打开」
> - **方法二**：打开终端，运行 `xattr -cr /Applications/DeskMate.app`
> 
> 之后即可正常使用，此提示只会出现一次。

### Linux
Coming soon! (You can build from source)

---

## 🚀 开发者指南

```bash
# Install dependencies
npm install

# Run in development
npm start

# Build for production
npm run build:mac   # macOS
npm run build:win   # Windows
npm run build:linux # Linux
```

## ⚙️ Configuration

1. Right-click on the cat → **Settings**
2. Choose your API provider:
   - 🇨🇳 **China**: DeepSeek, Moonshot
   - 🌍 **Global**: OpenRouter, OpenAI
   - 💻 **Local**: Ollama
3. Enter your API Key
4. Test connection and save

## 🎮 Usage

| Action | Result |
|--------|--------|
| **Right-click** | Open menu |
| **Drag** | Move pet |
| **Click** | Dismiss bubble |
| **Tray icon** | Quick access |

## 📁 Project Structure

```
DeskMate/
├── main.js          # Electron main process
├── preload.js       # IPC bridge
├── index.html       # Pet window
├── settings.html    # Settings window
├── config.js        # LLM configuration
├── i18n.js          # Internationalization
├── store.js         # Persistent storage
└── src/
    ├── renderer.js  # Pet logic
    ├── styles.css   # Animations
    └── services/
        └── llmHandler.js  # AI service
```

## 🛠️ Tech Stack

- **Electron** - Desktop framework
- **electron-store** - Persistent settings
- **LLM APIs** - DeepSeek, OpenRouter, OpenAI compatible

## 📝 License

MIT © 2024 Seabass2333
