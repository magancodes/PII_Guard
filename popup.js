document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const globalToggle = document.getElementById('global-toggle');
  const whitelistBtn = document.getElementById('whitelist-btn');
  const siteStatus = document.getElementById('site-status');
  
  const toggleEmails = document.getElementById('toggle-emails');
  const togglePhones = document.getElementById('toggle-phones');
  const toggleUpi = document.getElementById('toggle-upi');
  const toggleNames = document.getElementById('toggle-names');
  const whitelistList = document.getElementById('whitelist-list');
  const newDomainInput = document.getElementById('new-domain');
  const addDomainBtn = document.getElementById('add-domain-btn');

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
    renderWhitelistManager(data.whitelist || []);
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
        renderWhitelistManager(list);
        notifyContentScript();
        
        // Show status
        siteStatus.innerText = !isListed ? 'Extension disabled for this site' : 'Extension enabled for this site';
        siteStatus.style.display = 'block';
        setTimeout(() => siteStatus.style.display = 'none', 3000);
      });
    });
  });

  addDomainBtn.addEventListener('click', () => {
      chrome.storage.sync.get(['whitelist'], (data) => {
          const currentWhitelist = data.whitelist || [];
          let domain = newDomainInput.value.trim().toLowerCase();
          if (domain) {
              domain = domain.replace(/^https?:\/\//, '').split('/')[0];
              if (!currentWhitelist.includes(domain)) {
                  currentWhitelist.push(domain);
                  chrome.storage.sync.set({ whitelist: currentWhitelist }, () => {
                      updateWhitelistUI(currentWhitelist.includes(currentHost));
                      renderWhitelistManager(currentWhitelist);
                      notifyContentScript();
                  });
              }
              newDomainInput.value = '';
          }
      });
  });

  function renderWhitelistManager(whitelistArray) {
      whitelistList.innerHTML = '';
      if (whitelistArray.length === 0) {
          whitelistList.innerHTML = '<li style="color: var(--text-muted); font-style: italic; padding: 4px 0;">No domains disabled.</li>';
          return;
      }
      whitelistArray.forEach(domain => {
          const li = document.createElement('li');
          li.style.display = 'flex';
          li.style.justifyContent = 'space-between';
          li.style.alignItems = 'center';
          li.style.padding = '6px 0';
          li.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
          
          const text = document.createElement('span');
          text.textContent = domain;
          
          const removeBtn = document.createElement('button');
          removeBtn.innerHTML = '&times;';
          removeBtn.style.background = 'none';
          removeBtn.style.border = 'none';
          removeBtn.style.color = '#E11D48';
          removeBtn.style.cursor = 'pointer';
          removeBtn.style.fontSize = '16px';
          removeBtn.style.padding = '0 4px';
          
          removeBtn.addEventListener('click', () => {
              const updated = whitelistArray.filter(d => d !== domain);
              chrome.storage.sync.set({ whitelist: updated }, () => {
                  updateWhitelistUI(updated.includes(currentHost));
                  renderWhitelistManager(updated);
                  notifyContentScript();
              });
          });
          
          li.appendChild(text);
          li.appendChild(removeBtn);
          whitelistList.appendChild(li);
      });
  }

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
