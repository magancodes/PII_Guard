document.addEventListener('DOMContentLoaded', () => {
    const geminiInput = document.getElementById('gemini-key');
    const saveBtn = document.getElementById('save-btn');
    const statusMsg = document.getElementById('status');
    const whitelistList = document.getElementById('whitelist-list');

    // Load settings
    chrome.storage.sync.get(['geminiApiKey', 'whitelist'], (data) => {
        if (data.geminiApiKey) {
            geminiInput.value = data.geminiApiKey;
        }
        renderWhitelist(data.whitelist || []);
    });

    // Save settings
    saveBtn.addEventListener('click', () => {
        const key = geminiInput.value.trim();
        chrome.storage.sync.set({ geminiApiKey: key }, () => {
            statusMsg.style.display = 'block';
            setTimeout(() => {
                statusMsg.style.display = 'none';
            }, 3000);
        });
    });

    // Whitelist renderer
    function renderWhitelist(list) {
        whitelistList.innerHTML = '';
        if (list.length === 0) {
            whitelistList.innerHTML = '<li style="color: #64748B;">No domains whitelisted.</li>';
            return;
        }

        list.forEach(domain => {
            const li = document.createElement('li');
            li.innerText = domain;
            
            const btn = document.createElement('button');
            btn.className = 'remove-btn';
            btn.innerText = 'Remove';
            btn.onclick = () => removeWhitelist(domain);
            
            li.appendChild(btn);
            whitelistList.appendChild(li);
        });
    }

    function removeWhitelist(domain) {
        chrome.storage.sync.get(['whitelist'], (data) => {
            const list = data.whitelist || [];
            const newList = list.filter(d => d !== domain);
            chrome.storage.sync.set({ whitelist: newList }, () => {
                renderWhitelist(newList);
            });
        });
    }
});
