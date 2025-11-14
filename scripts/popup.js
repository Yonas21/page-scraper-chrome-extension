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

function injectPreviewStyles(html) {
  const style = `\n<style>
  /* Normalize image sizes inside preview for consistency */
  img { width: 240px; height: 160px; object-fit: cover; border-radius: 8px; }
  picture img, figure img { width: 240px; height: 160px; object-fit: cover; }
  /* Make body background consistent when previews render */
  body { background: #ffffff; }
</style>\n`;
  if (html.includes('</head>')) {
    return html.replace('</head>', style + '</head>');
  }
  return style + html;
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

function renderEntry(entry) {
  document.getElementById('pageTitle').textContent = entry.title;
  document.getElementById('pageUrl').textContent = entry.url;
  document.getElementById('savedAt').textContent = new Date(entry.timestamp).toLocaleString();
  document.getElementById('meta').classList.remove('hidden');
  const iframe = document.getElementById('previewFrame');
  iframe.srcdoc = injectPreviewStyles(entry.html);
  // Set sandbox based on user toggle
  const allowScripts = !!document.getElementById('toggleScripts')?.checked;
  iframe.setAttribute('sandbox', allowScripts ? 'allow-scripts allow-same-origin' : 'allow-same-origin');
  document.getElementById('previewContainer').classList.remove('hidden');
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