/* テスト用：GA4（匿名の閲覧数集計、10/21 将さんOK）の決まった部分だけを確認して取り除く。
   取り除いたあとのHTMLで、各ツールの「通信しない」テストをそのまま走らせる。 */
var GA_ID = 'G-EWJXRJY9M6';
var GA_CONNECT = 'https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com';
var GA_IMG = ' https://*.google-analytics.com https://*.googletagmanager.com';
function stripGA(html) {
  var problems = [];
  var tagRe = /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-EWJXRJY9M6"><\/script><script src="(?:\.\.\/)+assets\/ga\.js\?v=\d+"><\/script>\n/;
  if ((html.match(/googletagmanager\.com\/gtag/g) || []).length !== 1 || !tagRe.test(html)) problems.push('GA tag');
  html = html.replace(tagRe, '');
  if (!/<br><small class="ga-note">[^<]*(匿名|anonymously)[^<]*(送信しません|not sent)[^<]*<\/small>/.test(html)) problems.push('GA note');
  html = html.replace(/<br><small class="ga-note">[^<]*<\/small>/, '');
  var m = /(http-equiv="Content-Security-Policy" content=")([^"]*)(")/.exec(html);
  if (m) {
    var csp = m[2];
    if (csp.indexOf("script-src 'self' https://www.googletagmanager.com") < 0) problems.push('CSP script');
    csp = csp.replace("script-src 'self' https://www.googletagmanager.com", "script-src 'self'");
    if (csp.indexOf(GA_IMG) < 0) problems.push('CSP img');
    csp = csp.replace(GA_IMG, '');
    if (csp.indexOf('connect-src ' + GA_CONNECT) >= 0) csp = csp.replace('connect-src ' + GA_CONNECT, "connect-src 'none'");
    else if (csp.indexOf(' ' + GA_CONNECT) >= 0) csp = csp.replace(' ' + GA_CONNECT, '');
    else problems.push('CSP connect');
    html = html.slice(0, m.index) + m[1] + csp + m[3] + html.slice(m.index + m[0].length);
  } else problems.push('no CSP');
  return { html: html, problems: problems };
}
module.exports = { stripGA: stripGA, GA_ID: GA_ID };
