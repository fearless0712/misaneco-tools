/* 日本語表示用：入力の正規化・円表示・状態とエラーの日本語化。DOMなし。ブラウザ(window.JA) と Node(module.exports) の両方で動く。 */
(function (root) {
  var STATUS = { 'No data': '未入力', 'Loss': '赤字', 'Below target': '目標未達', 'On target': '目標達成', 'Profit': '利益あり', 'Break-even': 'とんとん' };
  var NAMES = { 'Quoted price': '売値', 'Materials': '材料費・仕入れ', 'Labour hours': '作業時間', 'Hourly labour cost': '時給',
    'Subcontract': '外注費', 'Other costs': 'その他の費用', 'Target margin': '目標利益率' };
  /* 全角の数字・記号を半角にし、末尾の「円」「%」を取り除く */
  function norm(v) {
    if (v === undefined || v === null) return v;
    return String(v).replace(/[０-９．，－]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[\u3000]/g, ' ').replace(/[円%％]\s*$/, '');
  }
  function status(s) { return STATUS[s] || s; }
  function error(msg) {
    if (!msg) return '';
    if (msg === 'Target margin must be below 100%.') return '目標利益率は100%未満にしてください。';
    var m = /^(.+) (must be a number|cannot be negative)\.$/.exec(msg);
    if (m && NAMES[m[1]]) return NAMES[m[1]] + (m[2] === 'cannot be negative' ? 'にマイナスは入力できません。' : 'は数字で入力してください。');
    return '入力内容を確認してください。';
  }
  function yen(n) { if (n === 0) n = 0; /* -0 を 0 に */
    return (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('ja-JP') + '円'; }
  /* 円未満を四捨五入（マイナスも絶対値で四捨五入） */
  function fmtYen(x) { if (x === null || x === undefined) return '—';
    var s = x < 0 ? -1 : 1; return yen(s * Math.round(Math.abs(x) + 1e-9)); }
  /* 円未満を切り上げ（目標利益率に必要な売値：目標を下回らないように） */
  function fmtYenUp(x) { if (x === null || x === undefined) return '—'; return yen(Math.ceil(x - 1e-9)); }
  var API = { norm: norm, status: status, error: error, fmtYen: fmtYen, fmtYenUp: fmtYenUp };
  if (typeof module !== 'undefined') module.exports = API; else root.JA = API;
})(this);
