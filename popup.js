document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const globalToggle = document.getElementById('global-toggle');
  const whitelistBtn = document.getElementById('whitelist-btn');
  const siteStatus = document.getElementById('site-status');
  
  const toggleEmails = document.getElementById('toggle-emails');
  const togglePhones = document.getElementById('toggle-phones');
  const toggleNumbers = document.getElementById('toggle-numbers');
  const toggleUpi = document.getElementById('toggle-upi');
  const toggleNames = document.getElementById('toggle-names');
  const optionsBtn = document.getElementById('options-btn');

  // State
  let currentHost = '';
  
  // Get active tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    try {
      const url = new URL(tab.url);
      currentHost = url.hostname;
    } catch(e) {
      whitelistBtn.disabled = true;
      whitelistBtn.innerText = 'Cannot operate on this page';
    }
  }

  // Load Settings
  chrome.storage.sync.get(['globalEnabled', 'piiSettings', 'whitelist'], (data) => {
    // Master Toggle
    globalToggle.checked = data.globalEnabled !== false;

    // Feature Toggles
    const pii = data.piiSettings || { emails: true, phones: true, upi: true, names: false, numbers: false };
    toggleEmails.checked = pii.emails;
    togglePhones.checked = pii.phones;
    toggleNumbers.checked = !!pii.numbers;
    toggleUpi.checked = pii.upi;
    toggleNames.checked = pii.names;

    // Whitelist check
    const isWhitelisted = data.whitelist && data.whitelist.includes(currentHost);
    updateWhitelistUI(isWhitelisted);
  });

  // Event Listeners for changes
  globalToggle.addEventListener('change', (e) => saveState('globalEnabled', e.target.checked));
  
  const savePiiSettings = () => {
    chrome.storage.sync.set({
      piiSettings: {
        emails: toggleEmails.checked,
        phones: togglePhones.checked,
        numbers: toggleNumbers.checked,
        upi: toggleUpi.checked,
        names: toggleNames.checked
      }
    });
    notifyContentScript();
  };

  toggleEmails.addEventListener('change', savePiiSettings);
  togglePhones.addEventListener('change', savePiiSettings);
  toggleNumbers.addEventListener('change', savePiiSettings);
  toggleUpi.addEventListener('change', savePiiSettings);
  toggleNames.addEventListener('change', savePiiSettings);

  whitelistBtn.addEventListener('click', () => {
    if (!currentHost) return;
    chrome.storage.sync.get(['whitelist'], (data) => {
      let list = data.whitelist || [];
      const isListed = list.includes(currentHost);
      
      if (isListed) {
        list = list.filter(h => h !== currentHost);
      } else {
        list.push(currentHost);
      }

      chrome.storage.sync.set({ whitelist: list }, () => {
        updateWhitelistUI(!isListed);
        notifyContentScript();
      });
    });
  });

  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Helpers
  function saveState(key, value) {
    chrome.storage.sync.set({ [key]: value });
    notifyContentScript();
  }

  function updateWhitelistUI(isWhitelisted) {
    if (isWhitelisted) {
      whitelistBtn.innerText = 'Enable on this site';
      whitelistBtn.style.color = '#3B82F6';
      whitelistBtn.style.borderColor = 'rgba(59,130,246,0.3)';
    } else {
      whitelistBtn.innerText = 'Disable on this site';
      whitelistBtn.style.color = '';
      whitelistBtn.style.borderColor = '';
    }
  }

  function notifyContentScript() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "settingsChanged" }).catch(() => {});
      }
    });
  }
});
