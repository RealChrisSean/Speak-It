# Speak It

**Talk naturally, get text instantly.** Voice-to-text anywhere on the web.

Speak It is a Chrome extension that lets you dictate text into any text field on the web. Click a text field, hit the mic button, and start talking. Your words appear as you speak.

---

## What It Does

- **Voice-to-text anywhere**: Works on any website - Gmail, Twitter/X, Facebook, Notion, Slack, you name it
- **Real-time transcription**: See your words appear as you speak, not after you stop
- **Smart formatting**: Auto-capitalizes sentences, fixes contractions (dont → don't), adds punctuation
- **Inline mic button**: A subtle mic icon appears next to any text field you focus on
- **Keyboard shortcut**: `Alt + Shift + S` toggles recording from anywhere
- **Works in any browser**: Falls back to Deepgram when Web Speech API isn't available (Arc, Atlas, etc.)

---

## Key Features

### 1. Works Everywhere
Unlike browser-native dictation that only works in certain apps, Speak It works on every website. Compose tweets, write emails, fill out forms, take notes - wherever there's a text field, you can dictate.

### 2. Smart Text Cleanup
Raw speech recognition output looks rough. Speak It cleans it up instantly:
- Capitalizes the start of sentences
- Fixes standalone "i" to "I"
- Converts contractions: "dont" → "don't", "im" → "I'm", "cant" → "can't"
- Adds periods to complete sentences
- Capitalizes after sentence-ending punctuation

### 3. Universal Browser Support
Most voice extensions only work in Chrome because they rely on the Web Speech API. Speak It detects when Web Speech fails (like in Arc or Atlas browser) and automatically switches to Deepgram's API. You don't have to do anything - it just works.

### 4. Minimal UI, Maximum Focus
- A tiny mic icon appears when you focus a text field
- A floating indicator shows what you're saying in real-time
- Nothing intrusive, nothing in your way

### 5. Multi-Language Support
Supports 10 languages out of the box:
- English (US & UK)
- Spanish
- French
- German
- Italian
- Portuguese (Brazil)
- Japanese
- Korean
- Chinese (Simplified)

---

## Technical Details

### Architecture
- **Manifest V3** Chrome extension
- **Content script** injects into all pages to handle recording and text insertion
- **Background service worker** handles keyboard shortcut commands
- **Popup** for settings and manual control

### Speech Recognition Engines

**Primary: Web Speech API**
- Free, built into Chrome/Edge
- No API key required
- Fast, low latency
- Used automatically when available

**Fallback: Deepgram**
- Used when Web Speech fails (Arc, Atlas, Firefox, Safari)
- Nova-2 model for high accuracy
- WebSocket connection for real-time streaming
- Requires backend token endpoint

### Text Insertion Methods
The extension uses different insertion strategies depending on the target:

1. **Standard inputs/textareas**: Direct value manipulation with proper cursor positioning
2. **ContentEditable elements** (Twitter, Notion, etc.): `document.execCommand('insertText')` for framework compatibility
3. **Google Docs**: Clipboard-based insertion (browser security prevents direct typing)

### Permissions
- `activeTab`: Access the current tab for text insertion
- `storage`: Save user preferences

### File Structure
```
speak-it/
├── manifest.json      # Extension configuration
├── content.js         # Main logic - recording, transcription, insertion
├── content.css        # Floating indicator and mic button styles
├── popup.html         # Settings popup UI
├── popup.css          # Popup styles
├── popup.js           # Popup logic
├── background.js      # Keyboard shortcut handler
└── icons/             # Extension icons (16, 48, 128px)
```

---

## What Makes It Unique

### 1. It Actually Works on Complex Sites
Most voice-to-text tools break on sites like Twitter/X because they use custom contentEditable editors. Speak It handles these correctly using `execCommand` instead of raw DOM manipulation.

### 2. No Account Required
Just install and start talking. No sign-up, no API keys to configure, no subscription.

### 3. Automatic Browser Fallback
Arc and Atlas users don't get left behind. The extension automatically detects when native speech recognition fails and switches to Deepgram - no user action needed.

### 4. Thoughtful Text Cleanup
Other tools give you raw transcription output. Speak It makes it readable:
- "i dont think im going to make it" becomes "I don't think I'm going to make it."

### 5. Non-Intrusive Design
The mic button is barely visible until you hover. The recording indicator stays out of your way in the corner. Nothing modal, nothing blocking.

---

## Use Cases

- **Writers**: Draft blog posts, articles, or social media content by speaking
- **Email power users**: Reply to emails 3x faster by dictating responses
- **Accessibility**: For users who find typing difficult or painful
- **Multitaskers**: Capture thoughts while your hands are busy
- **Note-takers**: Quick capture during meetings or research
- **Social media managers**: Compose posts across platforms without switching tools
- **Developers**: Write documentation or comments without breaking flow

---

## Settings

| Setting | Description |
|---------|-------------|
| Language | Choose from 10 supported languages |
| Auto-capitalize sentences | Capitalizes first letter after periods |
| Smart punctuation | Fixes contractions and adds missing periods |
| Show mic icon on text fields | Toggle the inline mic button visibility |

---

## Keyboard Shortcut

`Alt + Shift + S` - Toggle recording on/off from anywhere on the page

---

## Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | Full | Uses Web Speech API |
| Edge | Full | Uses Web Speech API |
| Arc | Full | Auto-falls back to Deepgram |
| Atlas | Full | Auto-falls back to Deepgram |
| Firefox | Partial | Deepgram fallback (requires backend) |
| Safari | Partial | Deepgram fallback (requires backend) |

| Website | Support | Notes |
|---------|---------|-------|
| Gmail | Full | Works in compose and reply |
| Twitter/X | Full | Works in tweet composer |
| Facebook | Full | Works in posts and comments |
| Notion | Full | Works in text blocks |
| Slack | Full | Works in message input |
| Google Docs | Partial | Uses clipboard (press Cmd+V to paste) |
| Most other sites | Full | Standard text field support |

---

## Why People Should Use It

1. **Faster than typing**: Speaking is 3x faster than typing for most people
2. **Reduces strain**: Give your wrists and fingers a break
3. **Captures thoughts faster**: Don't lose ideas while fumbling with the keyboard
4. **Works where you already are**: No new app to learn, no tab switching
5. **Free**: No subscription, no limits (when using Web Speech API)

---

## Version

1.0.0

---

## Links

- Website: [speakit.app](https://speakit.app)
