// PII Guard Content Script

const IGNORE_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'BUTTON', 'SVG', 'IMG', 'CANVAS', 'IFRAME', 'META', 'LINK'
]);

// Basic Regex Patterns
// Covers local and intl numbers. Ex: +91 9876543210, 9876543210, 1-800-123-4567
const PATTERNS = {
  EMAIL: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  PHONE: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, 
  UPI: /[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/g,
  NUMBER: /\d+/g,
  NAME: /\b[A-Z][a-z]{2,} [A-Z][a-z]{2,}\b/g
};

let extensionSettings = null;
let currentHost = window.location.hostname;
let isGloballyEnabled = true;
let isWhitelisted = false;
let maskCount = 0;
let observer = null;
let isProcessing = false;

// Initialization
async function init() {
  const data = await new Promise(resolve => chrome.storage.sync.get(['globalEnabled', 'whitelist', 'piiSettings'], resolve));
  
  isGloballyEnabled = data.globalEnabled !== false;
  isWhitelisted = data.whitelist && data.whitelist.includes(currentHost);
  extensionSettings = data.piiSettings || { emails: true, phones: true, upi: true, names: false, numbers: false };

  if (isGloballyEnabled && !isWhitelisted) {
    scanAndMask(document.body);
    startObserver();
  }
}

// Re-init when settings change
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "settingsChanged") {
    if (observer) observer.disconnect();
    // Usually we would unmask everything, but to keep it simple, we just reload the page
    // or re-fetch settings and scan from scratch for new nodes.
    // In this basic version, we will just fetch new settings and they will apply to new mutations.
    // A page reload is recommended for unmasking gracefully.
      chrome.storage.sync.get(['globalEnabled', 'whitelist', 'piiSettings'], (data) => {
      isGloballyEnabled = data.globalEnabled !== false;
      isWhitelisted = data.whitelist && data.whitelist.includes(currentHost);
      const newSettings = data.piiSettings || { emails: true, phones: true, upi: true, names: false, numbers: false };
      
      extensionSettings = newSettings;
      
      if (isGloballyEnabled && !isWhitelisted) {
        startObserver();
        scanAndMask(document.body);
      }
    });
  }
});

function startObserver() {
  if (observer) observer.disconnect();
  observer = new MutationObserver((mutations) => {
    // Debounce to improve performance
    if (isProcessing) return;
    
    requestAnimationFrame(() => {
      isProcessing = true;
      let newNodesCount = 0;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            scanAndMask(node);
            newNodesCount++;
          }
        }
      }
      isProcessing = false;
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

function scanAndMask(rootNode) {
  if (!extensionSettings || (!extensionSettings.emails && !extensionSettings.phones && !extensionSettings.upi && !extensionSettings.names && !extensionSettings.numbers)) return;

  const walker = document.createTreeWalker(
    rootNode,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Exclude inputs, scripts, empty text, and already masked nodes
        if (IGNORE_TAGS.has(node.parentNode.tagName)) return NodeFilter.FILTER_REJECT;
        if (node.parentNode.classList && node.parentNode.classList.contains('pii-guard-mask')) return NodeFilter.FILTER_REJECT;
        if (node.parentNode.isContentEditable) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const pendingReplacements = [];
  let currentNode;

  while (currentNode = walker.nextNode()) {
    let text = currentNode.nodeValue;
    let hasMatch = false;
    let newHtml = text;

    // We do simple string replacement for known regexes.
    // For safer element creation, we build a DOM fragment.
    let replacementNodes = analyzeTextNode(currentNode);
    if (replacementNodes) {
      pendingReplacements.push({
        oldNode: currentNode,
        newNodes: replacementNodes
      });
    }
  }

  // Apply replacements
  for (const { oldNode, newNodes } of pendingReplacements) {
    const parent = oldNode.parentNode;
    if (parent) {
      newNodes.forEach(n => parent.insertBefore(n, oldNode));
      parent.removeChild(oldNode);
    }
  }
}

function analyzeTextNode(textNode) {
  const originalText = textNode.nodeValue;
  let currentString = originalText;
  let matches = [];

  // Find all matches for all active settings
  const checkPattern = (type, regex) => {
    let match;
    // reset last index
    regex.lastIndex = 0;
    while ((match = regex.exec(currentString)) !== null) {
      matches.push({
        type: type,
        value: match[0],
        index: match.index,
        end: match.index + match[0].length
      });
    }
  };

  if (extensionSettings.emails) checkPattern('EMAIL', PATTERNS.EMAIL);
  if (extensionSettings.phones) checkPattern('PHONE', PATTERNS.PHONE);
  if (extensionSettings.upi) checkPattern('UPI', PATTERNS.UPI);
  if (extensionSettings.numbers) checkPattern('NUMBER', PATTERNS.NUMBER);
  if (extensionSettings.names) checkPattern('NAME', PATTERNS.NAME);

  if (matches.length === 0) return null;

  // Sort matches by index to prevent overlap issues
  matches.sort((a, b) => a.index - b.index);

  // Filter overlapping matches
  let filteredMatches = [];
  let lastEnd = 0;
  for (const match of matches) {
    if (match.index >= lastEnd) {
      filteredMatches.push(match);
      lastEnd = match.end;
    }
  }

  if (filteredMatches.length === 0) return null;

  // Build new nodes
  const nodes = [];
  let currentIndex = 0;

  for (const match of filteredMatches) {
    // Add text before match
    if (match.index > currentIndex) {
      nodes.push(document.createTextNode(originalText.substring(currentIndex, match.index)));
    }

    // Add Masked element
    const span = document.createElement('span');
    span.className = 'pii-guard-mask';
    span.setAttribute('data-original', match.value);
    span.title = 'Blurred Data (Hover to reveal)';
    
    // Mask logic
    span.textContent = match.value; // Store the real value; CSS will blur it
    nodes.push(span);

    currentIndex = match.end;
    maskCount++;
  }

  // Add remaining text
  if (currentIndex < originalText.length) {
    nodes.push(document.createTextNode(originalText.substring(currentIndex)));
  }

  // Update badge count periodically
  updateBadge();

  return nodes;
}

const updateBadge = debounce(() => {
  try {
    chrome.runtime.sendMessage({ action: 'updateBadge', count: maskCount });
  } catch(e) {
    if (e.message.includes('Extension context invalidated')) {
      if (observer) observer.disconnect(); // Stop running since the extension updated
    }
  }
}, 500);

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Start
init();
