// Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  // Initialize default settings on install
  chrome.storage.sync.get(['piiSettings', 'whitelist', 'globalEnabled'], (result) => {
    if (!result.piiSettings) {
      chrome.storage.sync.set({
        piiSettings: {
          emails: true,
          phones: true,
          upi: true,
          names: false, // Optional, requires API Key
          numbers: false
        },
        whitelist: [],
        globalEnabled: true
      });
    }
  });
});

// Listener for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateBadge') {
    // Update the extension badge with the number of PII items masked
    const tabId = sender.tab.id;
    const count = message.count;
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString(), tabId: tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#E11D48', tabId: tabId }); // Crimson color
    } else {
      chrome.action.setBadgeText({ text: '', tabId: tabId });
    }
  }
});
