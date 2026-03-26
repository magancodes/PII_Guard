document.addEventListener('DOMContentLoaded', () => {
  const whitelistList = document.getElementById('whitelist-list');
  const newDomainInput = document.getElementById('new-domain');
  const addDomainBtn = document.getElementById('add-domain-btn');

  // Load existing settings
  chrome.storage.sync.get(['whitelist'], (data) => {
    renderWhitelistManager(data.whitelist || []);
  });

  addDomainBtn.addEventListener('click', () => {
    chrome.storage.sync.get(['whitelist'], (data) => {
      const currentWhitelist = data.whitelist || [];
      let domain = newDomainInput.value.trim().toLowerCase();
      if (domain) {
        // Strip protocols and paths, leaving just the hostname
        domain = domain.replace(/^https?:\/\//, '').split('/')[0];
        if (!currentWhitelist.includes(domain)) {
          currentWhitelist.push(domain);
          chrome.storage.sync.set({ whitelist: currentWhitelist }, () => {
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
      whitelistList.innerHTML = '<li style="color: var(--text-muted); font-style: italic; padding: 4px 0; justify-content: center;">No domains currently disabled.</li>';
      return;
    }
    
    whitelistArray.forEach((domain) => {
      const li = document.createElement('li');
      
      const text = document.createElement('span');
      text.textContent = domain;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.innerHTML = '&times;';
      removeBtn.title = 'Remove domain from whitelist';

      removeBtn.addEventListener('click', () => {
        const updated = whitelistArray.filter((d) => d !== domain);
        chrome.storage.sync.set({ whitelist: updated }, () => {
          renderWhitelistManager(updated);
          notifyContentScript();
        });
      });

      li.appendChild(text);
      li.appendChild(removeBtn);
      whitelistList.appendChild(li);
    });
  }

  function notifyContentScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "settingsChanged" }).catch(() => {});
      }
    });
  }
});
