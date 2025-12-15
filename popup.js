// Speak It - Popup Script

const recordBtn = document.getElementById('recordBtn');
const btnText = recordBtn.querySelector('.btn-text');
const status = document.getElementById('status');
const languageSelect = document.getElementById('language');
const autoCapitalize = document.getElementById('autoCapitalize');
const autoPunctuation = document.getElementById('autoPunctuation');
const showInlineMic = document.getElementById('showInlineMic');

let isRecording = false;

// Load saved settings
async function loadSettings() {
  const settings = await chrome.storage.sync.get({
    language: 'en-US',
    autoCapitalize: true,
    autoPunctuation: true,
    showInlineMic: true
  });

  languageSelect.value = settings.language;
  autoCapitalize.checked = settings.autoCapitalize;
  autoPunctuation.checked = settings.autoPunctuation;
  showInlineMic.checked = settings.showInlineMic;
}

// Save settings
async function saveSettings() {
  await chrome.storage.sync.set({
    language: languageSelect.value,
    autoCapitalize: autoCapitalize.checked,
    autoPunctuation: autoPunctuation.checked,
    showInlineMic: showInlineMic.checked
  });
}

// Update UI based on recording state
function updateUI(recording) {
  isRecording = recording;

  if (recording) {
    recordBtn.classList.add('recording');
    btnText.textContent = 'Stop Recording';
    status.textContent = 'Listening...';
    status.classList.add('active');
  } else {
    recordBtn.classList.remove('recording');
    btnText.textContent = 'Start Recording';
    status.textContent = 'Click a text field, then press the button';
    status.classList.remove('active');
  }
}

// Get current recording status from content script
async function getStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
      updateUI(response?.isRecording || false);
    }
  } catch (e) {
    console.error('Could not get status:', e);
  }
}

// Toggle recording
async function toggleRecording() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const action = isRecording ? 'stop' : 'start';
      const response = await chrome.tabs.sendMessage(tab.id, { action });
      updateUI(response?.isRecording || false);
    }
  } catch (e) {
    console.error('Could not toggle recording:', e);
    status.textContent = 'Error: Refresh the page and try again';
  }
}

// Event listeners
recordBtn.addEventListener('click', toggleRecording);

languageSelect.addEventListener('change', saveSettings);
autoCapitalize.addEventListener('change', saveSettings);
autoPunctuation.addEventListener('change', saveSettings);
showInlineMic.addEventListener('change', saveSettings);

// Initialize
loadSettings();
getStatus();
