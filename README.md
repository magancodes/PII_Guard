# PII Guard Extension

An awesome Manifest V3 Chrome Extension that detects and hides sensitive Personal Identifiable Information (PII) on webpages.

## Features
- **Local Scanning**: Detects Emails, Phone numbers, and UPI IDs locally using Web APIs and Regular Expressions.
- **Advanced Scanning**: Uses Gemini API (optional) to accurately detect Person Names in context.
- **Masking**: Partially masks sensitive data (e.g., `9876543210` → `98****10`, `name@upi` → `n***@upi`).
- **Hover to Reveal**: Hover over any masked data to reveal it temporarily.
- **Dynamic Content**: Handles dynamically loaded content on SPA websites using `MutationObserver`.
- **Domain Whitelist**: Disable the extension on specific sites.
- **Privacy-First**: No data is sent anywhere, except when you explicitly enable the Gemini API for advanced scanning (sent directly to Google).

## Setup Instructions

1. **Clone or Download** this repository.
2. If you want to use the Advanced Gemini Detection for Names:
   - Get a Gemini API key from Google AI Studio.
   - You will enter this in the extension options.
3. Open Google Chrome and go to `chrome://extensions/`.
4. Enable **Developer mode** in the top right corner.
5. Click **Load unpacked** and select the folder containing these files.

## Future Upgrades
- Local LLM via WebGPU and transformers.js to avoid any API calls.
- Advanced context-based entity detection.
- Syncable Whitelists across devices.

## Publishing to Chrome Web Store
1. Create a `.zip` archive of the extension folder.
2. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
3. Create a new item and upload the `.zip` file.
4. Fill in the store listing details, upload promotional images.
5. Since this extension interacts with the DOM and optionally sends data to the Gemini API, ensure you provide a clear and strict Privacy Policy.
