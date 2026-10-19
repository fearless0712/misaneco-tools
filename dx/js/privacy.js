/* privacy.html：送信先の設定（js/config.js）に合わせて、いまの状態を表示する */
(function () {
  'use strict';
  var on = !!(window.DX_CONFIG && typeof window.DX_CONFIG.submitUrl === 'string' && /^https:\/\/\S+$/.test(window.DX_CONFIG.submitUrl.trim()));
  var a = document.getElementById('stOn'), b = document.getElementById('stOff');
  if (a) a.hidden = !on;
  if (b) b.hidden = on;
})();
