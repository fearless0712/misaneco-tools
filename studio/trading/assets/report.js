/* © 2026 MisaNeco Works. All rights reserved. Redistribution prohibited. */
/* Trading Studio: info for a bug report (browser + node).
   Remembers only the last error (file name only, never the folder path).
   makeReport(info) uses version, browser, screen, last error and time only. Trades and amounts are never included. Nothing is sent. */
(function (root) {
  'use strict';
  var last = null;
  function clip(s, n) { s = String(s === null || s === undefined ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; }
  function baseName(u) { u = String(u || ''); var m = /([^\/\\?#]+)(?:[?#].*)?$/.exec(u); return m ? m[1] : ''; }
  function record(msg, file, line, col) { last = { msg: clip(msg, 200), file: baseName(file), line: +line || 0, col: +col || 0, at: new Date().toISOString().slice(0, 16).replace('T', ' ') }; }
  function lastError() { return last ? JSON.parse(JSON.stringify(last)) : null; }
  function errText(e) { if (!e) return 'none'; return clip(e.msg, 200) + (e.file ? ' (' + baseName(e.file) + (e.line ? ' line ' + e.line : '') + ')' : '') + (e.at ? ' at ' + clip(e.at, 20) : ''); }
  function makeReport(info) {
    info = info || {};
    return ['Trading Studio - info for a bug report', 'Version: v' + clip(info.version, 20), 'Browser: ' + clip(info.ua, 300), 'Screen: ' + clip(info.view, 30), 'Last error: ' + errText(info.error), 'Time: ' + clip(info.at, 20), '(No trades, amounts or notes are included.)'].join('\n');
  }
  var api = { makeReport: makeReport, lastError: lastError, record: record, baseName: baseName };
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('error', function (ev) { if (ev && ev.target && ev.target !== window) return; record(ev && (ev.message || (ev.error && ev.error.message)) || 'Error', ev && ev.filename, ev && ev.lineno, ev && ev.colno); });
    window.addEventListener('unhandledrejection', function (ev) { var r = ev && ev.reason; record('Unhandled: ' + (r && r.message ? r.message : String(r)), '', 0, 0); });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TSREPORT = api;
})(typeof window !== 'undefined' ? window : this);
