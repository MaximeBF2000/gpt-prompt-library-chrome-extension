# GPT Prompt Library

<video src="demo.mp4" controls autoplay loop muted style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.07);"></video>

A lightweight Chrome extension that adds a prompt library directly inside the ChatGPT UI. Save, search, and inject prompts in one click—right from a sidebar that lives next to your chats.

## Why it’s useful

- **Stay organized**: keep your best prompts in one place.
- **Search fast**: find prompts by name instantly.
- **Inject cleanly**: prompts are typed into the ChatGPT input to preserve formatting.

## 100% privacy‑friendly

All data is stored locally in your browser using `chrome.storage.local`. No servers, no accounts, no analytics, no tracking—your prompts never leave your machine.

## How to install locally

1. Download and extract ZIP, or clone this repository:

```bash
git clone https://github.com/MaximeBF2000/gpt-prompt-library-chrome-extension.git
```

2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select the project folder (the one containing `manifest.json`).
6. Open `https://chatgpt.com` and look for the **Prompts** button in the left sidebar.
