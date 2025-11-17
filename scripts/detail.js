function getQueryParam(key) {
  const url = new URL(window.location.href);
  return url.searchParams.get(key);
}

async function loadEntry() {
  const id = getQueryParam('id');
  const { scrapeHistory = [] } = await chrome.storage.local.get(['scrapeHistory']);
  const entry = scrapeHistory.find((e) => e.id === id);
  if (!entry) {
    document.getElementById('title').textContent = 'Not found';
    return;
  }

  document.getElementById('title').textContent = entry.title || '(Untitled)';
  document.getElementById('url').textContent = entry.url || '';
  document.getElementById('saved').textContent = 'Saved: ' + new Date(entry.timestamp).toLocaleString();
  const sizeBytes = new TextEncoder().encode(entry.html || '').length;
  const sizeKB = (sizeBytes / 1024).toFixed(1);
  document.getElementById('saved').textContent += ` • Size: ${sizeKB} KB`;

  const frame = document.getElementById('renderFrame');
  frame.srcdoc = injectPreviewStyles(entry.html, entry.url);
  const allowScripts = !!document.getElementById('toggleScriptsDetail')?.checked;
  frame.setAttribute('sandbox', allowScripts ? 'allow-scripts allow-same-origin' : 'allow-same-origin');

  setupActions(entry);
}

loadEntry();

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

const scriptsToggleDetail = document.getElementById('toggleScriptsDetail');
if (scriptsToggleDetail) {
  scriptsToggleDetail.addEventListener('change', () => {
    const frame = document.getElementById('renderFrame');
    const allowScripts = scriptsToggleDetail.checked;
    frame.setAttribute('sandbox', allowScripts ? 'allow-scripts allow-same-origin' : 'allow-same-origin');
  });
}

function sanitizeFilename(name) {
  return (name || 'scraped-page').replace(/[^a-z0-9\-_.]+/gi, '_');
}

function setupActions(entry) {
  const copyBtn = document.getElementById('copyHtmlDetail');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(entry.html || '');
        alert('Copied HTML to clipboard.');
      } catch (_) {
        alert('Copy failed. Browser blocked clipboard.');
      }
    });
  }
  const downloadBtn = document.getElementById('downloadHtmlDetail');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      const title = sanitizeFilename(entry.title || 'scraped-page');
      const timestamp = new Date(entry.timestamp).toISOString().replace(/[:]/g, '-');
      const filename = `${title}-${timestamp}.html`;
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(entry.html || '');
      try {
        await chrome.downloads.download({ url: dataUrl, filename, saveAs: true });
      } catch (_) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        a.click();
      }
    });
  }
  const openBtn = document.getElementById('openOriginalDetail');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (!entry.url) return;
      chrome.tabs.create({ url: entry.url });
    });
  }
}