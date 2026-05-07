/**
 * Version: 2.6.0
 * Description: DOM tests for public/js/upload.js. Loads the real public/index.html into
 *              JSDOM so the script runs against the markup users actually see.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '../public/index.html');
const SCRIPT_PATH = path.resolve(__dirname, '../public/js/upload.js');

function bootDom() {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  // JSDOM cannot fetch external script tags; strip the <script src> reference and inject manually.
  const stripped = html.replace(/<script[^>]*src="\/js\/upload\.js"[^>]*><\/script>/, '');

  const dom = new JSDOM(stripped, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
  });

  global.window = dom.window;
  global.document = dom.window.document;

  const uploadScript = fs.readFileSync(SCRIPT_PATH, 'utf8');
  const scriptEl = dom.window.document.createElement('script');
  scriptEl.textContent = uploadScript;
  dom.window.document.body.appendChild(scriptEl);

  return dom;
}

describe('public/js/upload.js DOM behavior', () => {
  let dom;

  beforeEach(() => { dom = bootDom(); });
  afterEach(() => {
    delete global.window;
    delete global.document;
    if (dom) dom.window.close();
  });

  it('initializes against the real index.html elements', () => {
    const ids = [
      'dropZone', 'fileInput', 'uploadBtn', 'sampleBtn', 'removeBtn',
      'apiKeyInput', 'status', 'progress', 'progressBar',
      'results', 'resultsTabs', 'resultsPanels',
      'historyCard', 'historyList',
    ];
    for (const id of ids) {
      expect(document.getElementById(id)).toBeTruthy();
    }
  });

  it('exposes a test API on window.__clinisync', () => {
    expect(window.__clinisync).toBeTruthy();
    expect(typeof window.__clinisync.parseCsv).toBe('function');
    expect(typeof window.__clinisync.handleFileSelection).toBe('function');
    expect(Array.isArray(window.__clinisync.history)).toBe(true);
  });

  it('shows an inline error in #status when a file exceeds 5 MB', () => {
    const file = new window.File(['a'.repeat(6 * 1024 * 1024)], 'big.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const fileInput = document.getElementById('fileInput');
    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
    fileInput.dispatchEvent(new window.Event('change'));

    const status = document.getElementById('status');
    expect(status.textContent).toMatch(/limit is 5 MB/i);
    expect(status.classList.contains('error')).toBe(true);
  });

  it('rejects an unsupported extension via #status', () => {
    const file = new window.File(['hello'], 'notes.txt', { type: 'text/plain' });
    const fileInput = document.getElementById('fileInput');
    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
    fileInput.dispatchEvent(new window.Event('change'));

    const status = document.getElementById('status');
    expect(status.textContent.toLowerCase()).toMatch(/excel/);
    expect(status.classList.contains('error')).toBe(true);
  });

  it('reveals the "Selected: ..." line when a valid file is chosen', () => {
    const file = new window.File(['x'], 'demo.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const fileInput = document.getElementById('fileInput');
    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
    fileInput.dispatchEvent(new window.Event('change'));

    const selected = document.getElementById('selectedFile');
    expect(selected.hidden).toBe(false);
    expect(selected.textContent).toMatch(/Selected: demo\.xlsx/);
    expect(document.getElementById('removeBtn').hidden).toBe(false);
  });

  it('parseCsv handles plain rows, quoted commas, and escaped quotes', () => {
    const { parseCsv } = window.__clinisync;

    expect(parseCsv('a,b,c\n1,2,3\n')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
    expect(parseCsv('h1,h2\n"a, b",c\n')).toEqual([['h1', 'h2'], ['a, b', 'c']]);
    expect(parseCsv('h\n"He said ""hi"""\n')).toEqual([['h'], ['He said "hi"']]);
    expect(parseCsv('h1,h2\r\n1,2\r\n')).toEqual([['h1', 'h2'], ['1', '2']]);
    expect(parseCsv('')).toEqual([]);
  });

  it('starts with the rules card collapsed and the results / history hidden', () => {
    const rules = document.getElementById('rulesCard');
    expect(rules.open).toBe(false);

    const results = document.getElementById('results');
    expect(results.classList.contains('visible')).toBe(false);

    expect(document.getElementById('historyCard').hidden).toBe(true);
  });
});
