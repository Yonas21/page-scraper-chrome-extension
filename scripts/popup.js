async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function scrapeCurrentPage() {
  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Scraping current page…';

  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    statusEl.textContent = 'No active tab found.';
    return;
  }

  try {
    // First check if this URL was already scraped
    const existing = await findExistingByUrl(tab.url);
    const noticeEl = document.getElementById('notice');
    const rescrapeBtn = document.getElementById('rescrapeBtn');

    if (existing) {
      // Show existing preview and meta, offer rescrape option
      renderEntry(existing);
      noticeEl.textContent = `This page was already scraped on ${new Date(existing.timestamp).toLocaleString()}. Showing saved version.`;
      noticeEl.classList.remove('hidden');
      rescrapeBtn.classList.remove('hidden');
      rescrapeBtn.onclick = async () => {
        statusEl.textContent = 'Rescraping current page…';
        await performScrapeAndSave(tab, statusEl, true);
        rescrapeBtn.classList.add('hidden');
        noticeEl.classList.add('hidden');
      };
      statusEl.textContent = '';
      return; // Skip initial scrape
    }

    // No existing, perform scrape
    await performScrapeAndSave(tab, statusEl, false);
    document.getElementById('rescrapeBtn').classList.add('hidden');
    document.getElementById('notice').classList.add('hidden');
  } catch (err) {
    console.warn('Primary scrape failed', err);
    try {
      const [{ result: html }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.documentElement.outerHTML
      });

      const entry = {
        id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
        url: tab.url || '',
        title: tab.title || '',
        timestamp: new Date().toISOString(),
        html
      };

      // Save to storage
      const { scrapeHistory = [] } = await chrome.storage.local.get(['scrapeHistory']);
      scrapeHistory.unshift(entry);
      await chrome.storage.local.set({ scrapeHistory });

      // Update UI
      renderEntry(entry);
      statusEl.textContent = 'Scrape saved to history.';
    } catch (fallbackErr) {
      console.error('Scrape error', fallbackErr);
      statusEl.textContent = 'Failed to scrape this page. Some sites restrict scripting.';
    }
  }
}

document.getElementById('scrapeBtn').addEventListener('click', scrapeCurrentPage);
document.getElementById('openHistory').addEventListener('click', () => {
  // No-op: link opens history.html in a new tab
});

function injectPreviewStyles(html, baseUrl) {
  const headInject = `\n<base href="${baseUrl || ''}">\n<style>
  html, body { background: #ffffff; color: #0f172a; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.6; }
  * { box-sizing: border-box; }
  img, video, canvas, svg { max-width: 100%; height: auto; border-radius: 8px; }
  picture img, figure img { max-width: 100%; height: auto; object-fit: cover; }
  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; }
  h1, h2, h3, h4 { line-height: 1.3; margin-top: 1em; }
  pre { background: #f8fafc; padding: 12px; border-radius: 8px; overflow: auto; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #e5e7eb; padding: 8px; }
</style>\n`;
  if (html.includes('</head>')) {
    return html.replace('</head>', headInject + '</head>');
  }
  return headInject + html;
}

async function findExistingByUrl(url) {
  const { scrapeHistory = [] } = await chrome.storage.local.get(['scrapeHistory']);
  return scrapeHistory.find((e) => e.url === url);
}

async function performScrapeAndSave(tab, statusEl, isRescrape) {
  const [{ result: html }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.documentElement.outerHTML
  });
  const entry = {
    id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
    url: tab.url || '',
    title: tab.title || '',
    timestamp: new Date().toISOString(),
    html
  };
  const { scrapeHistory = [] } = await chrome.storage.local.get(['scrapeHistory']);
  scrapeHistory.unshift(entry);
  await chrome.storage.local.set({ scrapeHistory });
  renderEntry(entry);
  statusEl.textContent = isRescrape ? 'Rescrape saved to history.' : 'Scrape saved to history.';
}

let currentEntry = null;

function renderEntry(entry) {
  document.getElementById('pageTitle').textContent = entry.title;
  document.getElementById('pageUrl').textContent = entry.url;
  document.getElementById('savedAt').textContent = new Date(entry.timestamp).toLocaleString();
  const sizeBytes = new TextEncoder().encode(entry.html || '').length;
  const sizeKB = (sizeBytes / 1024).toFixed(1);
  document.getElementById('pageSize').textContent = `${sizeKB} KB`;
  document.getElementById('meta').classList.remove('hidden');
  const iframe = document.getElementById('previewFrame');
  iframe.srcdoc = injectPreviewStyles(entry.html, entry.url);
  // Set sandbox based on user toggle
  const allowScripts = !!document.getElementById('toggleScripts')?.checked;
  iframe.setAttribute('sandbox', allowScripts ? 'allow-scripts allow-same-origin' : 'allow-same-origin');
  document.getElementById('previewContainer').classList.remove('hidden');

  currentEntry = entry;
}

// Listen for toggle changes to reapply sandbox policy
const scriptsToggle = document.getElementById('toggleScripts');
if (scriptsToggle) {
  scriptsToggle.addEventListener('change', () => {
    const iframe = document.getElementById('previewFrame');
    const allowScripts = scriptsToggle.checked;
    iframe.setAttribute('sandbox', allowScripts ? 'allow-scripts allow-same-origin' : 'allow-same-origin');
  });
}

const copyBtn = document.getElementById('copyHtml');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    if (!currentEntry) return;
    try {
      await navigator.clipboard.writeText(currentEntry.html || '');
      document.getElementById('status').textContent = 'Copied HTML to clipboard.';
    } catch (_) {
      document.getElementById('status').textContent = 'Copy failed. Browser blocked clipboard.';
    }
  });
}

function sanitizeFilename(name) {
  return (name || 'scraped-page').replace(/[^a-z0-9\-_.]+/gi, '_');
}

const downloadBtn = document.getElementById('downloadHtml');
if (downloadBtn) {
  downloadBtn.addEventListener('click', async () => {
    if (!currentEntry) return;
    const title = sanitizeFilename(currentEntry.title || 'scraped-page');
    const timestamp = new Date(currentEntry.timestamp).toISOString().replace(/[:]/g, '-');
    const filename = `${title}-${timestamp}.html`;
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(currentEntry.html || '');
    try {
      await chrome.downloads.download({ url: dataUrl, filename, saveAs: true });
      document.getElementById('status').textContent = 'Download started.';
    } catch (_) {
      // Fallback via anchor if downloads API not available
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.click();
      document.getElementById('status').textContent = 'Download initiated.';
    }
  });
}

const openBtn = document.getElementById('openOriginal');
if (openBtn) {
  openBtn.addEventListener('click', () => {
    if (!currentEntry || !currentEntry.url) return;
    chrome.tabs.create({ url: currentEntry.url });
  });
}