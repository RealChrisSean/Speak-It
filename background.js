// Speak It - Background Service Worker
// Handles keyboard shortcuts and extension lifecycle

// Handle keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-recording') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
      } catch (e) {
        console.error('Speak It: Could not send message to content script', e);
      }
    }
  }
});

// Handle extension icon click (alternative to popup)
chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
    } catch (e) {
      console.error('Speak It: Could not send message to content script', e);
    }
  }
});

console.log('Speak It: Background script loaded');
