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

  const frame = document.getElementById('renderFrame');
  frame.srcdoc = injectPreviewStyles(entry.html);
  const allowScripts = !!document.getElementById('toggleScriptsDetail')?.checked;
  frame.setAttribute('sandbox', allowScripts ? 'allow-scripts allow-same-origin' : 'allow-same-origin');
}

loadEntry();

function injectPreviewStyles(html) {
  const style = `\n<style>
  /* Normalize image sizes inside preview for consistency */
  img { width: 240px; height: 160px; object-fit: cover; border-radius: 8px; }
  picture img, figure img { width: 240px; height: 160px; object-fit: cover; }
  body { background: #ffffff; }
</style>\n`;
  if (html.includes('</head>')) {
    return html.replace('</head>', style + '</head>');
  }
  return style + html;
}

const scriptsToggleDetail = document.getElementById('toggleScriptsDetail');
if (scriptsToggleDetail) {
  scriptsToggleDetail.addEventListener('change', () => {
    const frame = document.getElementById('renderFrame');
    const allowScripts = scriptsToggleDetail.checked;
    frame.setAttribute('sandbox', allowScripts ? 'allow-scripts allow-same-origin' : 'allow-same-origin');
  });
}