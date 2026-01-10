# 🐱 DeskMate

A cute desktop pet with AI chat, Pomodoro timer, and smart reminders.

![DeskMate Screenshot](assets/images/idle.png)

## ✨ Features

- 🐱 **Pixel Cat Companion** - Lives on your desktop with smooth animations
- 💬 **AI Chat** - Powered by DeepSeek/OpenRouter/OpenAI with personality
- 🍅 **Pomodoro Timer** - 15-60 minute focus sessions
- ⏰ **Smart Reminders** - Drink water, rest eyes, stretch
- 🌐 **7 Languages** - 中文, English, 日本語, 한국어, Español, Français, Deutsch
- 🔊 **Sound Effects** - Interactive sounds with toggle
- 🙈 **Stealth Mode** - Hides from Dock, lives in Tray
- 🚀 **Auto-start** - Launch on system boot

## 🚀 Quick Start

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
