# PII Guard - Chrome Extension

PII Guard is a robust, privacy-first Chrome Extension designed to intelligently and locally redact Sensitive Personal Identifiable Information (PII) from webpages before your eyes. 

## Core Features
1. **Real-time DOM Masking:** Detects PII items (Emails, Phones, UPI IDs, Standalone Numbers, and Names) and instantly applies a modern, animated CSS blur effect.
2. **Hover-to-Reveal:** Want to read the hidden item? Just hover your mouse over the blurred text for 0.5 seconds to seamlessly reveal it.
3. **100% In-House Processing:** Operates strictly on your device using heavily optimized Regular Expression heuristics. No models, no APIs, completely secure.
4. **Dynamic Site Scanning:** Uses a fast `MutationObserver` mapped exactly to Chrome's DOM rendering cycle to instantly blur new elements loading dynamically in Single Page Applications like WhatsApp Web or Gmail.

## Usage
Simply install in Chrome via Developer Mode, open the stunning integrated popup panel, and toggle the components you want aggressively masked! Included is a Domain Manager to quickly disable functionality on chosen sites.
