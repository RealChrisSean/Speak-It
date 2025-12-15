// Speak It - Content Script
// Handles voice recognition and text insertion into focused elements

let isRecording = false;
let currentElement = null;
let floatingIndicator = null;
let inlineMicButton = null;
let showInlineMic = true;

// Deepgram state
let deepgramSocket = null;
let audioContext = null;
let processor = null;
let mediaStream = null;
let deepgramFinalTranscript = ''; // Track what's been inserted to avoid duplicates

// Web Speech API setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let webSpeechFailed = false; // Track if Web Speech API has failed

// Usage tracking
let sessionStartTime = null;
let sessionWordCount = 0;
let currentEngine = 'web-speech';

// API endpoint for backend
const API_BASE = 'http://localhost:3000';

// Track usage to TiDB
async function trackUsage() {
  if (!sessionStartTime) return;

  const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
  const language = recognition?.lang || 'en-US';

  try {
    await fetch(`${API_BASE}/api/voice/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        durationSeconds,
        wordCount: sessionWordCount,
        language,
        engine: currentEngine
      })
    });
  } catch (e) {
    console.error('Speak It: Failed to track usage', e);
  }

  // Reset tracking
  sessionStartTime = null;
  sessionWordCount = 0;
}

console.log('Speak It: SpeechRecognition available:', !!SpeechRecognition);

// ============================================
// VOICE COMMANDS - Convert spoken commands to formatting
// ============================================

function processVoiceCommands(text) {
  if (!text) return text;

  // Order matters - process multi-word commands first
  const commands = [
    // Line breaks (multi-word first)
    ['new paragraph', '\n\n'],
    ['new line', '\n'],
    ['next line', '\n'],
    // Punctuation
    ['full stop', '.'],
    ['question mark', '?'],
    ['exclamation point', '!'],
    ['exclamation mark', '!'],
    // Quotes and brackets (multi-word)
    ['open quote', '"'],
    ['close quote', '"'],
    ['end quote', '"'],
    ['open parenthesis', '('],
    ['close parenthesis', ')'],
    ['open bracket', '['],
    ['close bracket', ']'],
    // Single word commands
    ['comma', ','],
    ['period', '.'],
    ['colon', ':'],
    ['semicolon', ';'],
    ['hyphen', '-'],
    ['dash', '—'],
    ['ellipsis', '...'],
    ['ampersand', '&'],
    ['at sign', '@'],
    ['hashtag', '#'],
    ['dollar sign', '$'],
    ['percent', '%'],
    ['asterisk', '*'],
    ['slash', '/'],
    ['backslash', '\\'],
  ];

  let result = text;
  for (const [command, replacement] of commands) {
    // Match command as whole word, case insensitive
    // Also handle when command is at start/end or surrounded by spaces
    const regex = new RegExp(`\\b${command}\\b`, 'gi');
    result = result.replace(regex, replacement);
  }

  // Clean up extra spaces around punctuation
  result = result
    .replace(/\s+([.,!?:;])/g, '$1')  // Remove space before punctuation
    .replace(/\(\s+/g, '(')            // Remove space after open paren
    .replace(/\s+\)/g, ')')            // Remove space before close paren
    .replace(/"\s+/g, '"')             // Remove space after open quote (simplified)
    .replace(/\s+"/g, '"')             // Remove space before close quote
    .replace(/\[\s+/g, '[')            // Remove space after open bracket
    .replace(/\s+\]/g, ']');           // Remove space before close bracket

  return result;
}

// ============================================
// TEXT CLEANUP - Instant client-side formatting
// ============================================

function cleanupText(text) {
  if (!text) return text;

  let cleaned = text;

  // Trim whitespace
  cleaned = cleaned.trim();

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Fix "i" to "I" when standalone
  cleaned = cleaned.replace(/\bi\b/g, 'I');

  // Fix common contractions
  cleaned = cleaned
    .replace(/\bi'm\b/gi, "I'm")
    .replace(/\bi've\b/gi, "I've")
    .replace(/\bi'll\b/gi, "I'll")
    .replace(/\bi'd\b/gi, "I'd")
    .replace(/\bim\b/g, "I'm")
    .replace(/\bive\b/g, "I've")
    .replace(/\bill\b/g, "I'll")
    .replace(/\bdont\b/gi, "don't")
    .replace(/\bwont\b/gi, "won't")
    .replace(/\bcant\b/gi, "can't")
    .replace(/\bwouldnt\b/gi, "wouldn't")
    .replace(/\bcouldnt\b/gi, "couldn't")
    .replace(/\bshouldnt\b/gi, "shouldn't")
    .replace(/\bdidnt\b/gi, "didn't")
    .replace(/\bdoesnt\b/gi, "doesn't")
    .replace(/\bisnt\b/gi, "isn't")
    .replace(/\barent\b/gi, "aren't")
    .replace(/\bwasnt\b/gi, "wasn't")
    .replace(/\bwerent\b/gi, "weren't")
    .replace(/\bhasnt\b/gi, "hasn't")
    .replace(/\bhavent\b/gi, "haven't")
    .replace(/\bhadnt\b/gi, "hadn't")
    .replace(/\bthats\b/gi, "that's")
    .replace(/\bwhats\b/gi, "what's")
    .replace(/\bheres\b/gi, "here's")
    .replace(/\btheres\b/gi, "there's")
    .replace(/\bits\b/g, "it's")
    .replace(/\blets\b/gi, "let's")
    .replace(/\byoure\b/gi, "you're")
    .replace(/\btheyre\b/gi, "they're")
    .replace(/\bwere\b/g, "we're")
    .replace(/\bhow's\b/gi, "how's")
    .replace(/\bwho's\b/gi, "who's");

  // Capitalize after sentence endings
  cleaned = cleaned.replace(/([.!?])\s+([a-z])/g, (match, punct, letter) => {
    return punct + ' ' + letter.toUpperCase();
  });

  // Add period at end if missing punctuation (only for longer phrases)
  if (cleaned.length > 10 && !/[.!?]$/.test(cleaned)) {
    cleaned = cleaned + '.';
  }

  return cleaned;
}

// Load settings
async function loadSettings() {
  try {
    if (chrome?.storage?.sync) {
      const settings = await chrome.storage.sync.get({ showInlineMic: true });
      showInlineMic = settings.showInlineMic;
    }
  } catch (e) {
    console.error('Speak It: Could not load settings', e);
  }
}

// Listen for settings changes
if (chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.showInlineMic) {
      showInlineMic = changes.showInlineMic.newValue;
      if (!showInlineMic) {
        hideInlineMic();
      }
    }
  });
}

// Create floating recording indicator
function createFloatingIndicator() {
  if (floatingIndicator) return floatingIndicator;

  const indicator = document.createElement('div');
  indicator.id = 'speak-it-indicator';
  indicator.innerHTML = `
    <div class="speak-it-pulse"></div>
    <span class="speak-it-text">Listening...</span>
  `;
  document.body.appendChild(indicator);
  floatingIndicator = indicator;
  return indicator;
}

function showIndicator() {
  const indicator = createFloatingIndicator();
  indicator.classList.add('speak-it-active');
}

function hideIndicator() {
  if (floatingIndicator) {
    floatingIndicator.classList.remove('speak-it-active');
  }
}

function updateIndicatorText(text) {
  if (floatingIndicator) {
    const textEl = floatingIndicator.querySelector('.speak-it-text');
    if (textEl) {
      textEl.textContent = text || 'Listening...';
    }
  }
}

// Create inline mic button
function createInlineMicButton() {
  if (inlineMicButton) return inlineMicButton;

  const btn = document.createElement('button');
  btn.id = 'speak-it-inline-mic';
  btn.type = 'button';
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  `;
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentElement) {
      currentElement.focus();
    }
    toggleRecording();
  });
  document.body.appendChild(btn);
  inlineMicButton = btn;
  return btn;
}

function positionInlineMic(element) {
  if (!inlineMicButton) createInlineMicButton();

  const rect = element.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  inlineMicButton.style.top = `${rect.top + scrollY + (rect.height / 2) - 12}px`;
  inlineMicButton.style.left = `${rect.right + scrollX - 32}px`;
}

function showInlineMicButton(element) {
  if (!showInlineMic) return;
  if (!element) return;

  if (element.tagName === 'INPUT') {
    const type = element.type?.toLowerCase() || 'text';
    const excludedTypes = ['number', 'date', 'time', 'datetime-local', 'month', 'week', 'range', 'color', 'checkbox', 'radio', 'file', 'submit', 'button', 'reset', 'hidden'];
    if (excludedTypes.includes(type)) return;
  }

  createInlineMicButton();
  positionInlineMic(element);
  inlineMicButton.classList.add('speak-it-mic-visible');
}

function hideInlineMic() {
  if (inlineMicButton) {
    inlineMicButton.classList.remove('speak-it-mic-visible');
  }
}

function updateInlineMicState() {
  if (inlineMicButton) {
    if (isRecording) {
      inlineMicButton.classList.add('speak-it-mic-recording');
    } else {
      inlineMicButton.classList.remove('speak-it-mic-recording');
    }
  }
}

// ============================================
// WEB SPEECH API (Chrome/Edge)
// ============================================

function initWebSpeechRecognition() {
  if (!SpeechRecognition) return null;

  const rec = new SpeechRecognition();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';

  let interimTranscript = '';
  let finalTranscript = '';

  rec.onstart = () => {
    isRecording = true;
    finalTranscript = '';
    showIndicator();
    updateInlineMicState();
    console.log('Speak It: Web Speech recording started');
  };

  rec.onend = () => {
    // Don't reset state if we're switching to Deepgram
    if (webSpeechFailed) {
      console.log('Speak It: Web Speech recording ended (switching to Deepgram)');
      return;
    }
    isRecording = false;
    hideIndicator();
    updateInlineMicState();
    console.log('Speak It: Web Speech recording ended');
  };

  rec.onerror = (event) => {
    console.error('Speak It: Web Speech error:', event.error);

    if (event.error === 'not-allowed') {
      isRecording = false;
      hideIndicator();
      updateInlineMicState();
      alert('Speak It: Microphone access denied. Please allow microphone access in your browser settings.');
    } else if (event.error === 'network' || event.error === 'service-not-allowed') {
      // Web Speech API doesn't work in this browser - switch to Deepgram
      console.log('Speak It: Web Speech failed, switching to Deepgram');
      webSpeechFailed = true;
      // Don't hide indicator - Deepgram will take over
      startDeepgramRecording();
    } else {
      isRecording = false;
      hideIndicator();
      updateInlineMicState();
    }
  };

  rec.onresult = (event) => {
    interimTranscript = '';
    let newFinalTranscript = '';

    for (let i = 0; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        newFinalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (newFinalTranscript.length > finalTranscript.length) {
      const newText = newFinalTranscript.slice(finalTranscript.length);
      finalTranscript = newFinalTranscript;

      if (newText.trim()) {
        // Process voice commands first, then clean up formatting
        const processedText = processVoiceCommands(newText);
        const cleanedText = cleanupText(processedText);
        insertText(cleanedText);
      }
    }

    if (interimTranscript) {
      updateIndicatorText(interimTranscript.slice(-50) + '...');
    }
  };

  return rec;
}

// ============================================
// DEEPGRAM API (Arc/Safari/Firefox/other browsers)
// ============================================

async function startDeepgramRecording() {
  currentEngine = 'deepgram';
  try {
    showIndicator();
    updateIndicatorText('Connecting...');
    deepgramFinalTranscript = ''; // Reset transcript tracker

    // Get microphone access
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    // Get Deepgram API key from backend
    const tokenRes = await fetch(`${API_BASE}/api/voice/token`, { method: 'POST' });
    const { key, error: tokenError } = await tokenRes.json();

    if (tokenError || !key) {
      throw new Error(tokenError || 'Failed to get voice token');
    }

    // Connect to Deepgram WebSocket
    deepgramSocket = new WebSocket(
      `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&model=nova-2&smart_format=true&punctuate=true&interim_results=true`,
      ['token', key]
    );

    deepgramSocket.onopen = () => {
      isRecording = true;
      updateInlineMicState();
      updateIndicatorText('Listening...');
      console.log('Speak It: Deepgram connected');

      // Set up audio processing
      audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(mediaStream);
      processor = audioContext.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        if (deepgramSocket?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          deepgramSocket.send(int16Data.buffer);
        }
      };
    };

    deepgramSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.channel?.alternatives?.[0]?.transcript) {
        const text = data.channel.alternatives[0].transcript;
        const isFinal = data.is_final;

        if (isFinal && text.trim()) {
          // Build the new cumulative transcript
          const newFinalTranscript = deepgramFinalTranscript + (deepgramFinalTranscript ? ' ' : '') + text;

          // Only insert the delta (what's new since last insert)
          if (newFinalTranscript.length > deepgramFinalTranscript.length) {
            const delta = newFinalTranscript.slice(deepgramFinalTranscript.length).trim();
            if (delta) {
              // Process voice commands first, then clean up formatting
              const processedText = processVoiceCommands(delta);
              const cleanedText = cleanupText(processedText);
              insertText(cleanedText);
            }
            deepgramFinalTranscript = newFinalTranscript;
          }
          updateIndicatorText('Listening...');
        } else if (text.trim()) {
          updateIndicatorText(text.slice(-50) + '...');
        }
      }
    };

    deepgramSocket.onerror = (error) => {
      console.error('Speak It: Deepgram error', error);
      stopDeepgramRecording();
      alert('Speak It: Voice connection error. Please try again.');
    };

    deepgramSocket.onclose = () => {
      console.log('Speak It: Deepgram disconnected');
      if (isRecording) {
        stopDeepgramRecording();
      }
    };

  } catch (err) {
    console.error('Speak It: Failed to start Deepgram', err);
    stopDeepgramRecording();

    if (err.name === 'NotAllowedError') {
      alert('Speak It: Microphone access denied. Please allow microphone access in your browser settings.');
    } else {
      alert('Speak It: Failed to start voice recording. Please try again.');
    }
  }
}

function stopDeepgramRecording() {
  if (processor) {
    processor.disconnect();
    processor = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  if (deepgramSocket) {
    if (deepgramSocket.readyState === WebSocket.OPEN) {
      deepgramSocket.close();
    }
    deepgramSocket = null;
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }

  isRecording = false;
  hideIndicator();
  updateInlineMicState();
}

// ============================================
// UNIFIED RECORDING CONTROLS
// ============================================

// Insert text into the currently focused element
function insertText(text) {
  const el = currentElement || document.activeElement;

  if (!el) return;

  // Count words for tracking
  const words = text.split(/\s+/).filter(w => w.length > 0);
  sessionWordCount += words.length;

  // Google Docs special handling
  if (window.location.hostname.includes('docs.google.com')) {
    insertTextGoogleDocs(text);
    return;
  }

  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const value = el.value;

    const needsSpace = start > 0 && value[start - 1] !== ' ' && value[start - 1] !== '\n';
    const textToInsert = (needsSpace ? ' ' : '') + text;

    el.value = value.slice(0, start) + textToInsert + value.slice(end);
    el.selectionStart = el.selectionEnd = start + textToInsert.length;

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (el.isContentEditable) {
    // Use execCommand for contentEditable - works better with complex editors like X/Twitter
    el.focus();
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textBefore = range.startContainer.textContent?.slice(0, range.startOffset) || '';
      const needsSpace = textBefore.length > 0 && !textBefore.endsWith(' ') && !textBefore.endsWith('\n');
      const textToInsert = (needsSpace ? ' ' : '') + text;

      // execCommand handles undo/redo and framework state better
      document.execCommand('insertText', false, textToInsert);
    }
  }
}

// Google Docs - find and type into the hidden input element
function insertTextGoogleDocs(text) {
  const textToInsert = ' ' + text;

  // Method 1: Find the hidden contentEditable div in the iframe
  const docsIframe = document.querySelector('iframe.docs-texteventtarget-iframe');
  if (docsIframe && docsIframe.contentDocument) {
    const editableDiv = docsIframe.contentDocument.querySelector('[contenteditable="true"]');
    if (editableDiv) {
      editableDiv.focus();
      // Type each character
      for (const char of textToInsert) {
        const inputEvent = new InputEvent('beforeinput', {
          inputType: 'insertText',
          data: char,
          bubbles: true,
          cancelable: true
        });
        editableDiv.dispatchEvent(inputEvent);
      }
      console.log('Speak It: Inserted text via iframe contentEditable');
      return;
    }
  }

  // Method 2: Try the docs-texteventtarget-iframe's textarea
  if (docsIframe && docsIframe.contentDocument) {
    const textarea = docsIframe.contentDocument.querySelector('textarea');
    if (textarea) {
      textarea.focus();
      textarea.value = textToInsert;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('Speak It: Inserted text via iframe textarea');
      return;
    }
  }

  // Method 3: Fallback - copy to clipboard and notify user
  navigator.clipboard.writeText(textToInsert).then(() => {
    console.log('Speak It: Text copied to clipboard - press Cmd+V to paste');
    // Show a brief notification
    updateIndicatorText('Press Cmd+V to paste');
    setTimeout(() => {
      updateIndicatorText('Listening...');
    }, 2000);
  }).catch(err => {
    console.error('Speak It: Clipboard write failed', err);
  });
}

function startRecording() {
  if (isRecording) return;

  // Start usage tracking
  sessionStartTime = Date.now();
  sessionWordCount = 0;

  // Special handling for Google Docs - it doesn't use standard text fields
  if (window.location.hostname.includes('docs.google.com')) {
    const docsEditor = findGoogleDocsEditor();
    if (docsEditor) {
      currentElement = docsEditor;
    } else {
      // Google Docs is loading or user hasn't clicked in doc yet - just proceed
      currentElement = document.body;
    }
  }
  // Validate we have a text field focused (skip for Google Docs)
  else if (!currentElement ||
      (currentElement.tagName !== 'INPUT' &&
       currentElement.tagName !== 'TEXTAREA' &&
       !currentElement.isContentEditable)) {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
      currentElement = active;
    } else {
      alert('Speak It: Please click on a text field first, then start recording.');
      return;
    }
  }

  // If Web Speech has failed before, go straight to Deepgram
  if (webSpeechFailed) {
    startDeepgramRecording();
    return;
  }

  // Try Web Speech API first (it's free)
  if (SpeechRecognition) {
    if (!recognition) {
      recognition = initWebSpeechRecognition();
    }
    if (recognition) {
      try {
        recognition.start();
      } catch (e) {
        console.error('Speak It: Failed to start Web Speech', e);
        // Fallback to Deepgram
        startDeepgramRecording();
      }
    }
  } else {
    // No Web Speech API available, use Deepgram
    startDeepgramRecording();
  }
}

function stopRecording() {
  if (!isRecording) return;

  // Stop Web Speech if active
  if (recognition) {
    try {
      recognition.stop();
    } catch (e) {
      console.error('Speak It: Failed to stop Web Speech', e);
    }
  }

  // Stop Deepgram if active
  if (deepgramSocket) {
    stopDeepgramRecording();
  }

  // Track usage to TiDB
  trackUsage();
}

function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggle') {
    toggleRecording();
    sendResponse({ isRecording: !isRecording });
  } else if (message.action === 'start') {
    startRecording();
    sendResponse({ isRecording: true });
  } else if (message.action === 'stop') {
    stopRecording();
    sendResponse({ isRecording: false });
  } else if (message.action === 'getStatus') {
    sendResponse({ isRecording });
  }
  return true;
});

// Check for Google Docs editor
function findGoogleDocsEditor() {
  // Google Docs uses an iframe with class "docs-texteventtarget-iframe"
  const docsIframe = document.querySelector('iframe.docs-texteventtarget-iframe');
  if (docsIframe) {
    return docsIframe;
  }
  // Also check for the canvas element
  const canvas = document.querySelector('.kix-canvas-tile-content');
  if (canvas) {
    return canvas.closest('.kix-appview-editor') || canvas;
  }
  return null;
}

// Track focus changes and show inline mic
document.addEventListener('focusin', (e) => {
  const target = e.target;
  if (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable) {
    currentElement = target;
    showInlineMicButton(target);
  }
});

// Special handling for Google Docs - show mic in a fixed position
if (window.location.hostname.includes('docs.google.com')) {
  // Wait for Google Docs to load, then show mic
  setTimeout(() => {
    createInlineMicButton();
    // Position mic in top-right of the document area
    const docsPage = document.querySelector('.kix-appview-editor');
    if (docsPage) {
      const rect = docsPage.getBoundingClientRect();
      inlineMicButton.style.position = 'fixed';
      inlineMicButton.style.top = '100px';
      inlineMicButton.style.right = '40px';
      inlineMicButton.style.left = 'auto';
    } else {
      // Fallback position
      inlineMicButton.style.position = 'fixed';
      inlineMicButton.style.top = '100px';
      inlineMicButton.style.right = '40px';
      inlineMicButton.style.left = 'auto';
    }
    inlineMicButton.classList.add('speak-it-mic-visible');
    currentElement = document.body; // Set so recording can start
  }, 2000);
}

// Hide mic when focus leaves text fields (but not on Google Docs)
document.addEventListener('focusout', (e) => {
  // Don't hide mic on Google Docs - it's always visible there
  if (window.location.hostname.includes('docs.google.com')) return;

  setTimeout(() => {
    const active = document.activeElement;
    if (active !== inlineMicButton &&
        active?.tagName !== 'INPUT' &&
        active?.tagName !== 'TEXTAREA' &&
        !active?.isContentEditable) {
      if (!isRecording) {
        hideInlineMic();
      }
    }
  }, 150);
});

// Reposition mic on scroll/resize
window.addEventListener('scroll', () => {
  if (currentElement && inlineMicButton?.classList.contains('speak-it-mic-visible')) {
    positionInlineMic(currentElement);
  }
}, { passive: true });

window.addEventListener('resize', () => {
  if (currentElement && inlineMicButton?.classList.contains('speak-it-mic-visible')) {
    positionInlineMic(currentElement);
  }
}, { passive: true });

// Initialize
loadSettings();
console.log('Speak It: Content script loaded (will try Web Speech first, fallback to Deepgram)');
