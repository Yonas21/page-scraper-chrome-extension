function formatItem(entry) {
  const when = new Date(entry.timestamp).toLocaleString();
  let favicon = '';
  try {
    const u = new URL(entry.url || '');
    favicon = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch (_) {
    favicon = '';
  }
  return `<li class="history-item">
    <img class="favicon" src="${favicon}" alt="favicon" onerror="this.style.visibility='hidden'" />
    <div class="info">
      <div class="title">${entry.title || '(Untitled)'}</div>
      <div class="url">${entry.url || ''}</div>
      <div class="meta">Saved: ${when}</div>
    </div>
    <div class="actions">
      <a href="detail.html?id=${encodeURIComponent(entry.id)}" class="view">View</a>
    </div>
  </li>`;
}

async function renderHistory() {
  const listEl = document.getElementById('historyList');
  const emptyEl = document.getElementById('emptyState');
  const { scrapeHistory = [] } = await chrome.storage.local.get(['scrapeHistory']);

  if (!scrapeHistory.length) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';
  listEl.innerHTML = scrapeHistory.map(formatItem).join('');
}

async function clearAll() {
  const confirmClear = confirm('Delete all saved scrapes? This cannot be undone.');
  if (!confirmClear) return;
  await chrome.storage.local.set({ scrapeHistory: [] });
  await renderHistory();
}

document.getElementById('clearHistory').addEventListener('click', clearAll);
renderHistory();