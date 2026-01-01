# Privacy Policy - Boot.dev Content Extractor

> **Note:** This is the markdown version. The official web version is at [docs/privacy-policy.html](docs/privacy-policy.html)

**Last Updated:** January 2026

---

## Overview

Boot.dev Content Extractor is committed to protecting your privacy. This extension operates entirely locally in your browser and does not collect, store, or transmit any personal data to external servers owned by us.

## Data Collection

We do **NOT** collect or store:

- Personal information
- Usage statistics
- Analytics data
- Browsing history
- Any data from Boot.dev pages

## What Data We Access

**Boot.dev Page Content:** The extension reads content from Boot.dev pages you visit to extract challenges, lessons, and code. This data is processed locally in your browser and is never sent to our servers (we don't have any servers).

**User Settings:** Your preferences (export format, Notion configuration) are stored locally using your browser's storage API.

## Notion Integration (Optional)

If you choose to enable Notion integration:

- Your Notion API token is stored **locally** in your browser's encrypted storage
- The token is **only** sent directly to Notion's official API (`api.notion.com`) when you explicitly click "Send to Notion"
- We never have access to your token or your Notion data
- All communication with Notion is direct from your browser to their servers

Notion's handling of your data is governed by [Notion's Privacy Policy](https://privacycenter.notion.so/policies).

## Local Data Storage

All data is stored locally in your browser using standard browser storage APIs:

- Extension settings and preferences
- Notion API credentials (if provided)
- Export format preferences

This data remains on your device and can be cleared by uninstalling the extension or clearing browser data.

## Permissions Explanation

The extension requires these permissions:

- `activeTab` - Read content from the Boot.dev page you're currently viewing
- `storage` - Save your settings locally in your browser
- `boot.dev/*` - Access Boot.dev pages for content extraction
- `api.notion.com/*` - Send data to Notion (only when you enable this feature)

## Third-Party Services

**Notion API:** If you enable Notion integration, extracted content is sent directly from your browser to your Notion workspace. This is optional and user-initiated.

**Boot.dev:** The extension reads publicly displayed content from pages you visit while logged into Boot.dev. We don't access any data you haven't already loaded in your browser.

## Data Security

- All sensitive data (like Notion tokens) is stored using browser-provided encryption
- No data is transmitted to third parties except Notion (when you choose to use that feature)
- The extension is open source - you can audit the code at [GitHub](https://github.com/depuschm/bootdev-content-extractor)

## Children's Privacy

This extension is not intended for children under 13. We do not knowingly collect information from children.

## Changes to This Policy

We may update this privacy policy occasionally. Changes will be posted with an updated "Last Updated" date. Continued use of the extension after changes constitutes acceptance of the updated policy.

## Your Rights

You have the right to:

- View all data stored by the extension (accessible in browser DevTools)
- Delete all stored data (uninstall the extension or clear browser data)
- Opt out of optional features (like Notion integration)

## Contact

For questions or concerns about this privacy policy:

- **GitHub Issues:** [Report an issue](https://github.com/depuschm/bootdev-content-extractor/issues)
- **Contact Form:** [dietmarpuschmann.com/contact](https://dietmarpuschmann.com/contact)

## Open Source

This extension is open source software. You can review the complete source code at:

**[https://github.com/depuschm/bootdev-content-extractor](https://github.com/depuschm/bootdev-content-extractor)**

---

*Boot.dev Content Extractor v1.2.0 | Licensed under MIT License*