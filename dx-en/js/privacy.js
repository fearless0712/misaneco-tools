/* privacy.html: show the current state from js/config.js */
(function () {
  'use strict';
  var on = !!(window.DX_CONFIG && typeof window.DX_CONFIG.submitUrl === 'string' && /^https:\/\/\S+$/.test(window.DX_CONFIG.submitUrl.trim()));
  var a = document.getElementById('stOn'), b = document.getElementById('stOff');
  if (a) a.hidden = !on;
  if (b) b.hidden = on;
})();
