# Speak It

**Talk naturally, get text instantly.** Voice-to-text anywhere on the web.

Speak It is a Chrome extension that lets you dictate text into any text field on the web. Click a text field, hit the mic button, start talking. Your words appear as you speak. That's it.

---

## What It Does

- **Voice-to-text anywhere**: Works on most websites. Gmail, Twitter/X, Facebook, Slack, you name it.
- **Real-time transcription**: See your words appear as you speak, not after you stop.
- **Smart formatting**: Auto-capitalizes sentences, fixes contractions (dont to don't), adds punctuation.
- **Inline mic button**: A small mic icon appears next to any text field you focus on.
- **Keyboard shortcut**: `Alt + Shift + S` toggles recording from anywhere.
- **Works in Chrome and Atlas**: Falls back to Deepgram when Web Speech API isn't available.

---

## Installation

**Note:** Right now this only works with Chrome and Atlas. If you're using Atlas, you'll need to deploy the backend first. See the [Deploy Your Own Backend](#deploy-your-own-backend) section below.

1. Clone the repo:
   ```bash
   git clone https://github.com/RealChrisSean/Speak-It.git
   ```

2. Open Chrome and go to `chrome://extensions`

3. Enable **Developer mode** (toggle in the top right)

4. Click **Load unpacked**

5. Select the `Speak-It` folder (the root folder, not the backend folder)

6. You should see the Speak It extension in your toolbar. Click any text field and the mic icon will appear.

7. When you first click the mic, Chrome will ask for microphone permission. Click **Allow**.

That's it. You're ready to start talking.

---

## Key Features

### 1. Works on Most Websites

Most browser dictation only works in certain apps. Speak It works on most websites. Compose tweets, write emails, fill out forms, take notes. Wherever there's a text field, you can dictate.

### 2. Smart Text Cleanup

Raw speech recognition output looks rough. Speak It cleans it up instantly:
- Capitalizes the start of sentences
- Fixes standalone "i" to "I"
- Converts contractions: "dont" to "don't", "im" to "I'm", "cant" to "can't"
- Adds periods to complete sentences
- Capitalizes after sentence-ending punctuation

### 3. Atlas Support

Most voice extensions only work in Chrome because they rely on the Web Speech API. Speak It detects when Web Speech fails (like in Atlas) and automatically switches to Deepgram. You don't have to do anything. It just works.

### 4. Minimal UI

A tiny mic icon appears when you focus a text field. A floating indicator shows what you're saying in real-time. Nothing intrusive, nothing in your way.

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
- Free, built into Chrome
- No API key required
- Fast, low latency
- Used automatically when available

**Fallback: Deepgram**
- Used when Web Speech fails (Atlas)
- Nova-2 model for high accuracy
- WebSocket connection for real-time streaming
- Requires backend token endpoint

### Text Insertion Methods

The extension uses different insertion strategies depending on the target:

1. **Standard inputs/textareas**: Direct value manipulation with proper cursor positioning
2. **ContentEditable elements** (Twitter, etc.): `document.execCommand('insertText')` for framework compatibility

### Permissions

- `activeTab`: Access the current tab for text insertion
- `storage`: Save user preferences

### File Structure

```
Speak-It/
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

## What Makes It Different

### 1. It Actually Works on Complex Sites

Most voice-to-text tools break on sites like Twitter/X because they use custom contentEditable editors. Speak It handles these correctly using `execCommand` instead of raw DOM manipulation.

### 2. No Account Required (Chrome)

If you're using Chrome, just install and start talking. No sign-up, no API keys to configure, no subscription. Atlas users need to [deploy the backend first](#deploy-your-own-backend).

### 3. Automatic Browser Fallback

Atlas users don't get left behind. The extension automatically detects when native speech recognition fails and switches to Deepgram. No user action needed.

### 4. Thoughtful Text Cleanup

Other tools give you raw transcription output. Speak It makes it readable. "i dont think im going to make it" becomes "I don't think I'm going to make it."

### 5. Stays Out of Your Way

The mic button is barely visible until you hover. The recording indicator stays in the corner. Nothing modal, nothing blocking.

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

`Alt + Shift + S` toggles recording on/off from anywhere on the page.

---

## Compatibility

| Browser | Support |
|---------|---------|
| Chrome | Full |
| Atlas | Full |

More browsers coming soon.

| Website | Support | Notes |
|---------|---------|-------|
| Gmail | Full | Works in compose and reply |
| Twitter/X | Full | Works in tweet composer |
| Facebook | Full | Works in posts and comments |
| Slack | Full | Works in message input |
| Notion | In Progress | Coming soon |
| Google Docs | In Progress | Coming soon |
| Most other sites | Full | Standard text field support |

---

## Why Use It

1. **Faster than typing**: Speaking is 3x faster than typing for most people.
2. **Reduces strain**: Give your wrists and fingers a break.
3. **Captures thoughts faster**: Don't lose ideas while fumbling with the keyboard.
4. **Works where you already are**: No new app to learn, no tab switching.
5. **Free**: No subscription, no limits (when using Web Speech API).

---

## Deploy Your Own Backend

The extension needs a backend server for Deepgram fallback (when Web Speech API isn't available). You can deploy your own with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/RealChrisSean/Speak-It&root-directory=backend&env=DEEPGRAM_API_KEY,TIDB_HOST,TIDB_PORT,TIDB_USER,TIDB_PASSWORD,TIDB_DATABASE)

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DEEPGRAM_API_KEY` | API key for speech-to-text |
| `TIDB_HOST` | TiDB Cloud host |
| `TIDB_PORT` | TiDB port (usually 4000) |
| `TIDB_USER` | TiDB username |
| `TIDB_PASSWORD` | TiDB password |
| `TIDB_DATABASE` | Database name |

All variables are required.

**Deepgram** handles the speech-to-text. When browsers like Atlas don't support the Web Speech API, we fall back to Deepgram so the extension still works.

**TiDB** is where we store your speaking style fingerprint. Here's the thing. We want to learn how you speak so we can format your text better over time. But we don't want to store what you actually say. That's your business, not ours. So instead we track things like word count, duration, speaking patterns, and other metadata that helps us understand your style without ever saving your actual words. TiDB is a MySQL-compatible database that scales really well and has a generous free tier. It's perfect for this.

### Getting a Deepgram API Key

1. Go to [deepgram.com](https://deepgram.com) and sign up (free tier gives you $200 in credits)
2. In the dashboard, go to **API Keys**
3. Click **Create a New API Key**
4. Give it a name and select the permissions (default is fine)
5. Copy the key. You'll need it for the Vercel deploy.

### Setting Up TiDB Cloud

TiDB Cloud is where your style data lives. Don't worry, setup is quick.

1. Go to [tidbcloud.com](https://tidbcloud.com) and click **Sign Up**
2. Sign in with your **GitHub account** (fastest) or use email
3. Create a new **Serverless** cluster (free tier, no credit card needed)
4. Pick a region close to your Vercel deployment
5. Once created, click **Connect** on your cluster
6. Choose **General** connection type
7. Copy these values for Vercel:
   - **Host** goes to `TIDB_HOST`
   - **Port** goes to `TIDB_PORT` (usually 4000)
   - **User** goes to `TIDB_USER`
   - **Password** click "Generate Password" then copy to `TIDB_PASSWORD`
8. Create a database: In the SQL Editor, run `CREATE DATABASE speakit;` and use `speakit` as your `TIDB_DATABASE`

### After Deploying

Update `API_BASE` in `content.js` to point to your Vercel URL:

```javascript
const API_BASE = 'https://your-app.vercel.app';
```

Then reload the extension in Chrome.

---

## Version

1.0.0

---

## Links

- Website: [app.parallellives.ai/speak-it](https://app.parallellives.ai/speak-it)
