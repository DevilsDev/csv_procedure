/**
 * Version: 2.5.9
 * Description: Drag-and-drop upload + auth-gated download flow. Renders the per-sheet stats
 *              and offers download buttons for every CSV plus the manifest. Also includes a
 *              "Try with sample workbook" path that fetches /samples/case-mix-sample.xlsx and
 *              uploads it as if the user had dropped it in.
 * Author: Ali Kahwaji
 */

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadButton = document.getElementById('uploadBtn');
const sampleButton = document.getElementById('sampleBtn');
const removeButton = document.getElementById('removeBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const selectedFileEl = document.getElementById('selectedFile');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const resultsTitleEl = document.getElementById('resultsTitle');
const statsGridEl = document.getElementById('statsGrid');
const sheetsListEl = document.getElementById('sheetsList');
const manifestRowEl = document.getElementById('manifestRow');

const MAX_BYTES = 5 * 1024 * 1024;
const VALID_EXT = /\.(xlsx|xls|ods)$/i;
const SAMPLE_URL = '/samples/case-mix-sample.xlsx';
const SAMPLE_FILENAME = 'case-mix-sample.xlsx';

let selectedFile = null;

// ---------- helpers ----------

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function authHeaders() {
  const key = apiKeyInput && apiKeyInput.value.trim();
  return key ? { Authorization: `Bearer ${key}` } : {};
}

function setStatus(text, kind) {
  statusEl.textContent = text || '';
  statusEl.className = 'status' + (kind ? ' ' + kind : '');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// ---------- file selection ----------

function handleFileSelection(file) {
  if (!file || !VALID_EXT.test(file.name)) {
    setStatus('Please choose an Excel file (.xlsx, .xls, or .ods).', 'error');
    return;
  }
  if (file.size > MAX_BYTES) {
    setStatus(`File is ${formatBytes(file.size)} — the limit is 5 MB.`, 'error');
    return;
  }

  selectedFile = file;
  selectedFileEl.hidden = false;
  selectedFileEl.textContent = `Selected: ${file.name} (${formatBytes(file.size)})`;
  removeButton.hidden = false;
  setStatus('');
}

function clearSelection() {
  selectedFile = null;
  fileInput.value = '';
  selectedFileEl.hidden = true;
  selectedFileEl.textContent = '';
  removeButton.hidden = true;
  setStatus('');
  resultsEl.classList.remove('visible');
}

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  handleFileSelection(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => handleFileSelection(fileInput.files[0]));
removeButton.addEventListener('click', clearSelection);

// ---------- upload ----------

async function uploadCurrent() {
  if (!selectedFile) {
    setStatus('Choose a file first, or click "Try with sample workbook".', 'error');
    return;
  }
  return doUpload(selectedFile);
}

async function doUpload(file) {
  resultsEl.classList.remove('visible');
  setStatus(`Uploading ${file.name}...`);
  uploadButton.disabled = true;
  sampleButton.disabled = true;

  try {
    const form = new FormData();
    form.append('excel', file);

    const response = await fetch('/upload', {
      method: 'POST',
      body: form,
      headers: authHeaders(),
    });

    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (response.ok && isJson) {
      setStatus(payload.message || 'Upload completed.', 'success');
      renderResults(payload);
    } else {
      const message = isJson ? (payload.error || 'Upload failed.') : (payload || `HTTP ${response.status}`);
      setStatus(message, 'error');
    }
  } catch (err) {
    console.error('Upload error:', err);
    setStatus('Network error while uploading.', 'error');
  } finally {
    uploadButton.disabled = false;
    sampleButton.disabled = false;
  }
}

// ---------- results rendering ----------

function statCard(value, label) {
  return `<div class="stat"><div class="value">${escapeHtml(value)}</div><div class="label">${escapeHtml(label)}</div></div>`;
}

function renderResults(payload) {
  resultsTitleEl.textContent = 'Cleaning result';

  statsGridEl.innerHTML = [
    statCard(payload.sheetsProcessed ?? 0, 'Sheets'),
    statCard(payload.rowsProcessed ?? 0, 'Rows processed'),
    statCard(payload.duplicatesRemoved ?? 0, 'Duplicates removed'),
    statCard(payload.invalidDobCount ?? 0, 'Invalid DOB'),
    statCard(payload.missingNhiCount ?? 0, 'Missing NHI'),
  ].join('');

  const sheets = Array.isArray(payload.sheets) ? payload.sheets : [];
  sheetsListEl.innerHTML = sheets.map(sheetRow).join('');
  attachDownloadHandlers(sheetsListEl);

  if (payload.manifest) {
    manifestRowEl.innerHTML = `
      <span class="meta">Per-upload manifest: <code>${escapeHtml(payload.manifest)}</code></span>
      <button class="btn-secondary" data-download="${escapeHtml(payload.manifest)}">Download manifest</button>
    `;
    attachDownloadHandlers(manifestRowEl);
  } else {
    manifestRowEl.innerHTML = '';
  }

  resultsEl.classList.add('visible');
}

function sheetRow(sheet) {
  const stats = [
    `${sheet.rowsProcessed} rows`,
    sheet.duplicatesRemoved ? `${sheet.duplicatesRemoved} dup` : null,
    sheet.invalidDobCount ? `${sheet.invalidDobCount} invalid DOB` : null,
    sheet.missingNhiCount ? `${sheet.missingNhiCount} missing NHI` : null,
  ].filter(Boolean).join(' · ');

  return `
    <div class="sheet-row">
      <div class="name">${escapeHtml(sheet.sheetName)}</div>
      <div class="meta">${escapeHtml(stats)}</div>
      <button class="btn-secondary" data-download="${escapeHtml(sheet.fileName)}">Download CSV</button>
    </div>
  `;
}

function attachDownloadHandlers(root) {
  root.querySelectorAll('button[data-download]').forEach(btn => {
    btn.addEventListener('click', () => downloadFile(btn.getAttribute('data-download'), btn));
  });
}

async function downloadFile(filename, triggerEl) {
  if (!filename) return;
  const originalLabel = triggerEl ? triggerEl.textContent : null;
  if (triggerEl) {
    triggerEl.disabled = true;
    triggerEl.textContent = 'Downloading...';
  }
  try {
    const response = await fetch(`/downloads/${encodeURIComponent(filename)}`, {
      headers: authHeaders(),
    });
    if (!response.ok) {
      const isJson = (response.headers.get('content-type') || '').includes('application/json');
      const body = isJson ? await response.json() : await response.text();
      const message = (isJson && body.error) ? body.error : `Download failed (HTTP ${response.status}).`;
      setStatus(message, 'error');
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download error:', err);
    setStatus('Network error while downloading.', 'error');
  } finally {
    if (triggerEl) {
      triggerEl.disabled = false;
      triggerEl.textContent = originalLabel;
    }
  }
}

// ---------- sample loader ----------

async function loadSampleAndUpload() {
  setStatus('Loading sample workbook...');
  sampleButton.disabled = true;
  uploadButton.disabled = true;

  try {
    const response = await fetch(SAMPLE_URL);
    if (!response.ok) {
      setStatus(`Could not load the sample workbook (HTTP ${response.status}).`, 'error');
      return;
    }
    const blob = await response.blob();
    const file = new File([blob], SAMPLE_FILENAME, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    handleFileSelection(file);
    if (selectedFile) {
      await doUpload(file);
    }
  } catch (err) {
    console.error('Sample load error:', err);
    setStatus('Network error while loading the sample.', 'error');
  } finally {
    sampleButton.disabled = false;
    uploadButton.disabled = false;
  }
}

// ---------- wire ----------

uploadButton.addEventListener('click', uploadCurrent);
sampleButton.addEventListener('click', loadSampleAndUpload);
