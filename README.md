# Page Scraper – Chrome Extension

A minimal Chrome extension that scrapes the current page’s HTML, shows a preview in the popup, stores it as history, and lets you view any saved scrape in a detail page. It includes duplicate detection with an option to rescrape and a user-controlled toggle to allow scripts in previews.

## Features
- Scrapes `document.documentElement.outerHTML` of the active tab.
- Immediate preview in the popup via `iframe` using `srcdoc`.
- Saves entries (title, URL, timestamp, HTML) in `chrome.storage.local`.
- History page lists saved scrapes with favicon, title, URL, and when saved.
- Detail page renders a saved scrape in a sandboxed iframe.
- Duplicate detection: if a URL is already scraped, shows the saved one with a “Rescrape” option.
- Consistent preview images (fixed width/height) for cleaner visuals.
- Optional “Allow scripts in preview” toggle for dynamic rendering (unsafe by default).

## Install
- Open Chrome and go to `chrome://extensions`.
- Enable `Developer mode` (top-right).
- Click `Load unpacked` and select the folder:
  - `your-directory/Scraper-chrome-extesion`
- Pin the extension to the toolbar for quick access.

## Usage
- Open any webpage, click the extension icon.
- Click `Scrape Current Page` to capture and preview.
- If the page was previously scraped:
  - The popup shows the saved version, a banner with the saved time, and a `Rescrape` button to capture a fresh copy.
- Click `Open History` to see all saved scrapes.
- Click `View` in history to open the detail page and render the saved HTML.

## Script Execution Toggle
- Previews are sandboxed by default: `iframe` uses `sandbox="allow-same-origin"` which blocks scripts (safer).
- To allow scripts:
  - Popup: enable `Allow scripts in preview (unsafe)`.
  - Detail page: same toggle.
- When enabled, the sandbox becomes `allow-scripts allow-same-origin`, which lets page scripts run inside the preview. Only enable if you trust the content.

## Consistent Images
- Preview rendering injects CSS so images use a consistent size and aspect:
  - `img { width: 240px; height: 160px; object-fit: cover; border-radius: 8px; }`
- Update the dimensions by editing `injectPreviewStyles` in:
  - `scripts/popup.js`
  - `scripts/detail.js`

## Permissions
- `storage`: saves and loads history entries.
- `scripting`: executes a small script on the active tab to access the page HTML.
- `activeTab`, `tabs`: access current tab metadata.
- `host_permissions`: `<all_urls>` to support all websites.

## Security & Privacy
- Default preview sandbox blocks scripts for safety.
- Saved HTML is stored locally in `chrome.storage.local` on your device.
- No data is sent to remote servers.

## Troubleshooting
- “Blocked script execution…” in console:
  - Expected when sandbox blocks page scripts. Use the toggle to allow scripts if needed.
- No preview appears:
  - Some pages may restrict scripting; try rescrape or enable the script toggle.
- Extension didn’t load:
  - Ensure `manifest.json` is present and you selected the correct folder.

## Customize Behavior
- Change image sizing:
  - Edit CSS in `injectPreviewStyles` (in `scripts/popup.js` and `scripts/detail.js`).
- Replace rescrape behavior (update-in-place):
  - Instead of adding a new entry, locate the existing entry by URL and overwrite it.
- Adjust theme:
  - Styles live in `styles/*.css`. Popup, history, and detail each have their own stylesheet.

## File Structure
```
├── manifest.json
├── popup.html
├── history.html
├── detail.html
├── scripts/
│   ├── popup.js
│   ├── history.js
│   └── detail.js
├── styles/
│   ├── popup.css
│   ├── history.css
│   └── detail.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Notes
- Built on Manifest V3.
- Static setup; no build step required.
- Works across most pages; highly dynamic sites may need the script toggle for accurate previews.