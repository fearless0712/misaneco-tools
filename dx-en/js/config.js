/* Small Business Automation Check — settings
   submitUrl: same receiver as the Japanese version (../dx/js/config.js), a Google Apps Script web app
   that stores the posted fields as one row. When submitUrl is "" no notice is shown and no network code runs.
   The page CSP (index.html) must allow the receiver: connect-src https://script.google.com https://script.googleusercontent.com
   Only the 8 fields built by buildPayload in js/logic.js are sent (no free text, names or contact details). */
window.DX_CONFIG = {
  submitUrl: 'https://script.google.com/macros/s/AKfycbxWcxhmUZr8Q83Nu6EqEYN6wpfcWvi3ghlgAmVl0-k1XhV4AQF9KM6Xkz1TkhG_weXbDA/exec',
  fields: {
    industry: 'industry',
    tasks: 'tasks',
    env: 'env',
    methods: 'methods',
    date: 'date',
    version: 'version',
    country: 'country',
    src: 'src'
  }
};
