/* Small Business Automation Check & Action Plan (English, country-aware) — data
   - Product/tax statements are only those checked on official pages (SOURCES, with checked date).
   - No third-party prices or brand recommendations ("existing cloud service" = category only).
   - MisaNeco Works products: only features shown on their Gumroad pages; prices as shown there (USD).
   browser: window.DX_DATA / node: module.exports */
(function (root) {
  'use strict';
  var CHECKED = '2026-10-19';

  /* ---------- Sources (official pages) ---------- */
  var SOURCES = [
    { id: 's1', title: 'Get started with a Microsoft account - Power Automate | Microsoft Learn', source_url: 'https://learn.microsoft.com/en-us/power-automate/desktop-flows/getting-started-msa', claim: 'Using Power Automate (desktop) with a Microsoft account is available at no extra cost. It can fill in web forms and record your interactions as steps.', checked: CHECKED },
    { id: 's2', title: 'Prerequisites and limitations - Power Automate | Microsoft Learn', source_url: 'https://learn.microsoft.com/en-us/power-automate/desktop-flows/requirements', claim: 'Power Automate for desktop runs on Windows 10 / Windows 11 (Home, Pro, Enterprise) and Windows Server; ARM devices are not supported.', checked: CHECKED },
    { id: 's3', title: 'Power Automate license types - Power Platform | Microsoft Learn', source_url: 'https://learn.microsoft.com/en-us/power-platform/admin/power-automate-licensing/types', claim: 'Microsoft 365 and other licenses include a limited set of Power Automate capabilities; work or school accounts include basic use (cloud flows with standard connectors).', checked: CHECKED },
    { id: 's4', title: 'Quotas for Google Services | Apps Script | Google for Developers', source_url: 'https://developers.google.com/apps-script/guides/services/quotas', claim: 'Apps Script can be used with consumer accounts (such as gmail.com) with daily quotas: 100 email recipients per day for consumer accounts; script runtime 6 minutes per execution.', checked: CHECKED },
    { id: 's5', title: 'Work with macros in Excel for the web - Microsoft Support', source_url: 'https://support.microsoft.com/en-us/office/work-with-macros-in-excel-for-the-web-98784ad0-898c-43aa-a1da-4f0fb5014343', claim: "You can't create, run, or edit VBA macros in Excel for the web; use the Excel desktop app to work with macros.", checked: CHECKED },
    { id: 's6', title: 'Replace text and punctuation in documents on Mac - Apple Support', source_url: 'https://support.apple.com/guide/mac-help/mh35735/mac', claim: 'On Mac, System Settings > Keyboard > Text Replacements lets you set short text that is replaced with longer text.', checked: CHECKED },
    { id: 's7', title: 'Create a template in Gmail - Gmail Help', source_url: 'https://support.google.com/mail/answer/14864208?hl=en', claim: 'Gmail message templates can be turned on in Settings > Advanced and used from Gmail on a computer only.', checked: CHECKED },
    { id: 's8', title: 'Create email templates in Outlook - Microsoft Support', source_url: 'https://support.microsoft.com/en-us/outlook/create-email-templates-in-outlook', claim: 'Outlook email templates save messages with content that rarely changes; Mail Templates and the My Templates add-in need a qualifying Microsoft 365 subscription.', checked: CHECKED },
    { id: 's9', title: 'Use mail merge for bulk email, letters, labels, and envelopes - Microsoft Support', source_url: 'https://support.microsoft.com/en-us/office/use-mail-merge-for-bulk-email-letters-labels-and-envelopes-f488ed5b-b849-4c11-9cff-932c49474705', claim: 'Word mail merge can make labels and letters from an Excel spreadsheet (one sheet). Applies to Word for Microsoft 365 and Word 2016 or later; Word for the web cannot run a merge.', checked: CHECKED },
    { id: 's10', title: 'Choose where to save form responses - Google Docs Editors Help', source_url: 'https://support.google.com/docs/answer/2917686?hl=en', claim: 'Google Forms responses can be stored in a linked Google Sheets spreadsheet.', checked: CHECKED },
    { id: 's11', title: 'Pay taxes | U.S. Small Business Administration', source_url: 'https://www.sba.gov/business-guide/manage-your-business/pay-taxes', claim: 'Your business might need to pay state and local taxes, and tax laws vary by location. Businesses with employees are responsible for state employment taxes, which vary by state.', checked: CHECKED },
    { id: 's12', title: 'Recordkeeping | Internal Revenue Service', source_url: 'https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping', claim: 'Good records help you monitor your business, keep track of deductible expenses, prepare tax returns and support items reported on them.', checked: CHECKED },
    { id: 's13', title: 'Standard mileage rates | Internal Revenue Service', source_url: 'https://www.irs.gov/tax-professionals/standard-mileage-rates', claim: 'If you use your car for business, you may be able to take a deduction based on the mileage used; the IRS publishes standard mileage rates.', checked: CHECKED },
    { id: 's14', title: 'Employment taxes | Internal Revenue Service', source_url: 'https://www.irs.gov/businesses/small-businesses-self-employed/employment-taxes', claim: 'Employment taxes include federal income tax withholding, Social Security and Medicare taxes, and federal unemployment (FUTA) tax.', checked: CHECKED },
    { id: 's15', title: 'Register for VAT - GOV.UK', source_url: 'https://www.gov.uk/vat-registration', claim: 'You must register for VAT if your taxable turnover for the last 12 months goes over £90,000 (the VAT threshold), or you expect it to in the next 30 days.', checked: CHECKED },
    { id: 's16', title: 'VAT Notice 700/22: Making Tax Digital for VAT - GOV.UK', source_url: 'https://www.gov.uk/government/publications/vat-notice-70022-making-tax-digital-for-vat/vat-notice-70022-making-tax-digital-for-vat', claim: 'Making Tax Digital for VAT requires all VAT-registered businesses to keep records digitally and file their VAT Returns using software.', checked: CHECKED },
    { id: 's17', title: 'Running payroll - GOV.UK', source_url: 'https://www.gov.uk/running-payroll', claim: "Each time employers pay employees, they report the pay and deductions to HMRC in a Full Payment Submission (FPS).", checked: CHECKED },
    { id: 's18', title: 'Charge and collect the tax – Which rate to charge - Canada.ca', source_url: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate.html', claim: 'The GST/HST rate depends on the province or territory; in a non-participating province, the provincial sales tax (PST) applies separately from GST.', checked: CHECKED },
    { id: 's19', title: 'Payroll - Canada.ca', source_url: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll.html', claim: 'Employers calculate deductions and contributions (CPP, EI, income tax) on employee pay and open a payroll account to send (remit) deductions.', checked: CHECKED },
    { id: 's20', title: 'Motor vehicle expenses - Canada.ca', source_url: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/business-expenses/motor-vehicle-expenses.html', claim: 'CRA guidance on motor vehicle expenses covers how to record expenses with a full or simplified logbook.', checked: CHECKED },
    { id: 's21', title: 'Register for goods and services tax (GST) | business.gov.au', source_url: 'https://business.gov.au/registrations/register-for-taxes/register-for-goods-and-services-tax-gst', claim: 'You must register for GST if your GST turnover is $75,000 or more ($150,000 for non-profits); registered businesses lodge activity statements to report total sales, GST on sales and GST credits.', checked: CHECKED },
    { id: 's22', title: 'MisaNeco Works products on Gumroad (product pages)', source_url: 'https://comedyverse.gumroad.com/', claim: 'Features and prices of MisaNeco Works products are as shown on each Gumroad product page (one-time purchase).', checked: CHECKED }
  ];

  /* ---------- Countries ---------- */
  var COUNTRIES = [
    { id: 'US', label: 'United States', locale: 'en-US', taxTask: 'Sales tax report prep',
      taxNote: 'State and local tax rules vary by location (SBA). Check your state\'s guidance or ask your accountant before relying on any report.', taxSrc: ['s11'],
      payrollNote: 'Employment taxes include federal income tax withholding, Social Security and Medicare, and FUTA; state employment taxes vary by state (IRS, SBA). Check official guidance or ask your accountant / payroll provider.', payrollSrc: ['s14', 's11'],
      mileageNote: 'The IRS publishes standard mileage rates that may be used for a deduction for business use of a car. Check the IRS page for the current rate and ask your accountant what records to keep.', mileageSrc: ['s13'],
      recordsNote: 'The IRS notes that good records help you track deductible expenses and support items on your tax return. Check IRS guidance or ask your accountant what to keep.', recordsSrc: ['s12'],
      resources: [{ name: 'IRS — Small business and self-employed', url: 'https://www.irs.gov/businesses/small-businesses-self-employed' }, { name: 'SBA — Business guide', url: 'https://www.sba.gov/business-guide' }] },
    { id: 'UK', label: 'United Kingdom', locale: 'en-GB', taxTask: 'VAT return prep (Making Tax Digital)',
      taxNote: 'You must register for VAT if taxable turnover goes over the threshold (£90,000 on GOV.UK when checked). Making Tax Digital for VAT requires VAT-registered businesses to keep digital records and file VAT Returns using software. Check GOV.UK or ask your accountant.', taxSrc: ['s15', 's16'],
      payrollNote: 'Employers report pay and deductions to HMRC each payday in a Full Payment Submission (FPS). Check GOV.UK guidance or ask your accountant / payroll provider.', payrollSrc: ['s17'],
      mileageNote: 'Check GOV.UK guidance on vehicle expenses and ask your accountant what records to keep.', mileageSrc: [],
      recordsNote: 'Check GOV.UK guidance on the records you need to keep, or ask your accountant.', recordsSrc: [],
      resources: [{ name: 'GOV.UK — Business and self-employed', url: 'https://www.gov.uk/browse/business' }, { name: 'HMRC', url: 'https://www.gov.uk/government/organisations/hm-revenue-customs' }] },
    { id: 'CA', label: 'Canada', locale: 'en-CA', taxTask: 'GST/HST return prep',
      taxNote: 'The GST/HST rate depends on the province or territory; in non-participating provinces, provincial sales tax (PST) applies separately (CRA). Check CRA and provincial guidance or ask your accountant.', taxSrc: ['s18'],
      payrollNote: 'Employers calculate CPP, EI and income tax deductions and remit them through a CRA payroll account. Check CRA guidance or ask your accountant / payroll provider.', payrollSrc: ['s19'],
      mileageNote: 'CRA guidance on motor vehicle expenses refers to keeping a full or simplified logbook. Check CRA guidance and ask your accountant.', mileageSrc: ['s20'],
      recordsNote: 'Check CRA guidance on keeping records, or ask your accountant.', recordsSrc: [],
      resources: [{ name: 'CRA — Businesses', url: 'https://www.canada.ca/en/services/taxes/businesses.html' }, { name: 'Canada.ca — Business and industry', url: 'https://www.canada.ca/en/services/business.html' }] },
    { id: 'AU', label: 'Australia', locale: 'en-AU', taxTask: 'GST & activity statement (BAS) prep',
      taxNote: 'You must register for GST if your GST turnover is $75,000 or more; registered businesses lodge activity statements reporting sales, GST on sales and GST credits (business.gov.au). Check ATO guidance or ask your BAS agent / accountant.', taxSrc: ['s21'],
      payrollNote: 'Check ATO guidance on paying workers and payroll reporting, or ask your BAS agent / accountant.', payrollSrc: [],
      mileageNote: 'Check ATO guidance on car expenses and the records to keep, or ask your accountant.', mileageSrc: [],
      recordsNote: 'Check ATO guidance on record keeping, or ask your accountant.', recordsSrc: [],
      resources: [{ name: 'ATO — Businesses and organisations', url: 'https://www.ato.gov.au/businesses-and-organisations' }, { name: 'business.gov.au', url: 'https://business.gov.au/' }] },
    { id: 'OTHER', label: 'Other (English-speaking)', locale: 'en-GB', taxTask: 'Sales tax / VAT / GST report prep',
      taxNote: 'Tax rules differ by country. Check your tax authority\'s guidance or ask your accountant.', taxSrc: [],
      payrollNote: 'Payroll rules differ by country. Check official guidance or ask your accountant / payroll provider.', payrollSrc: [],
      mileageNote: 'Check your tax authority\'s guidance on vehicle expenses and records.', mileageSrc: [],
      recordsNote: 'Check your tax authority\'s guidance on record keeping.', recordsSrc: [],
      resources: [] }
  ];

  /* ---------- Method types ---------- */
  var TYPES = {
    sheet:   { label: 'Spreadsheet formulas & templates', cost: 'free', diff: 1, needs: { sheet: ['excel', 'google', 'both'] }, code: false, src: [] },
    vba:     { label: 'Excel macros (VBA)', cost: 'free', diff: 2, needs: { sheet: ['excel', 'both'] }, code: true, src: ['s5'] },
    gas:     { label: 'Google Apps Script', cost: 'free', diff: 2, needs: { sheet: ['google', 'both'] }, code: true, src: ['s4'] },
    gform:   { label: 'Google Forms + Sheets', cost: 'free', diff: 1, needs: { sheet: ['google', 'both'] }, code: false, src: ['s10'] },
    gdrive:  { label: 'Google Drive shared folders', cost: 'free', diff: 1, needs: { sheet: ['google', 'both'] }, code: false, src: [] },
    pad:     { label: 'Power Automate for desktop (Windows)', cost: 'free', diff: 2, needs: { pc: ['win'] }, code: false, src: ['s1', 's2'] },
    pacloud: { label: 'Power Automate cloud flows (Microsoft 365)', cost: 'free', diff: 2, needs: { m365: ['yes'] }, code: false, src: ['s3'] },
    text:    { label: 'Text shortcuts & email templates', cost: 'free', diff: 1, needs: {}, code: false, src: ['s6', 's7', 's8'] },
    merge:   { label: 'Word mail merge', cost: 'free', diff: 1, needs: { office: true }, code: false, src: ['s9'] },
    cloud:   { label: 'Existing cloud service (category)', cost: 'paid', diff: 1, needs: { paid: true }, code: false, src: [] },
    tool:    { label: 'MisaNeco Works tool', cost: 'buy', diff: 1, needs: { paid: true }, code: false, src: ['s22'] },
    rule:    { label: 'Standardize the process (template & checklist)', cost: 'free', diff: 1, needs: {}, code: false, fallback: true, src: [] }
  };
  var COST_LABEL = { free: 'Free (with what you have)', paid: 'Paid service needed', buy: 'One-time purchase' };
  var DIFF_LABEL = { 1: 'Easy', 2: 'Moderate', 3: 'Hard' };

  /* ---------- MisaNeco Works products (Gumroad, checked 2026-10-19, HTTP 200, USD) ----------
     demo: English-capable browser demo in ../ (switches to English for non-Japanese browsers; menu at top) */
  var GR = 'https://comedyverse.gumroad.com/l/';
  var PRODUCTS = {
    DataClean:    { name: 'DataClean', url: GR + 'iaynkf', price: '$15', demo: 'DataClean.html', bundles: ['toolkit'], what: 'Cleans a messy customer list or CSV on your computer: phone numbers, dates, emails, names and duplicates.' },
    DataLens:     { name: 'DataLens', url: GR + 'mnoqa', price: '$19', demo: 'DataLens.html', bundles: ['toolkit'], what: 'Turns a CSV or Excel export into pivots, charts, sales and ABC analysis, offline.' },
    FileFlow:     { name: 'FileFlow', url: GR + 'fmzgco', price: '$19', demo: null, bundles: ['toolkit'], what: 'Everyday PDF, image and spreadsheet chores on your own computer (for example combining PDFs, resizing images, merging CSV/Excel files).' },
    PDF2Excel:    { name: 'PDF to Excel', url: GR + 'qmvdib', price: '$19', demo: 'PDF2Excel.html', bundles: [], what: 'Converts tables in PDFs (invoices, statements) to Excel on your computer, no upload. Text-based PDFs only (not scanned images).' },
    MoneyLens:    { name: 'MoneyLens', url: GR + 'kxqeaj', price: '$19', demo: 'MoneyLens.html', bundles: [], what: 'Analyzes bank/card CSV statements offline to show where money goes and find forgotten subscriptions.' },
    SurveyLens:   { name: 'SurveyLens', url: GR + 'sxhrlr', price: '$19', demo: 'SurveyLens.html', bundles: [], what: 'Turns survey responses (Google Forms export or CSV) into charts, cross-tabs and NPS, offline.' },
    CustomerLens: { name: 'CustomerLens', url: GR + 'hgoqqb', price: '$19', demo: null, bundles: [], what: 'RFM customer analysis from your store or POS order export: who your best customers are and who is slipping away.' },
    LabelMaker:   { name: 'LabelMaker', url: GR + 'synhkp', price: '$12', demo: 'LabelMaker.html', bundles: [], what: 'Prints address labels from a CSV/Excel list on common label sheets, no mail merge setup.' },
    QRBatch:      { name: 'QRBatch', url: GR + 'mcdjc', price: '$12', demo: 'QRBatch.html', bundles: [], what: 'Bulk QR codes from a CSV/Excel list: asset tags, product links, event tickets, member IDs.' },
    DiffCheck:    { name: 'DiffCheck', url: GR + 'zoqcha', price: '$9', demo: null, bundles: [], what: 'Compares the old and new version of a spreadsheet (Excel/CSV) and shows exactly what changed.' },
    ListGrab:     { name: 'ListGrab', url: GR + 'ldxoh', price: '$12', demo: null, bundles: [], what: 'A bookmarklet that copies a table or repeating list on a web page into CSV/Excel.' },
    MailCheck:    { name: 'MailCheck', url: GR + 'ijync', price: '$12', demo: 'MailCheck.html?lang=en', bundles: [], what: 'Paste an email\'s source (or drop an .eml file) to see spoofing and phishing warning signs in plain language.' },
    LinkCheck:    { name: 'LinkCheck', url: GR + 'zbifa', price: '$7', demo: 'LinkCheck.html?lang=en', bundles: [], what: 'Checks a suspicious text message, DM or URL without opening the link.' },
    PassAudit:    { name: 'PassAudit', url: GR + 'vkjob', price: '$9', demo: 'PassAudit.html?lang=en', bundles: [], what: 'Finds reused and weak passwords in a password export (CSV) from your browser or password manager.' },
    KeyScan:      { name: 'KeyScan', url: GR + 'maogrj', price: '$15', demo: 'KeyScan.html', bundles: [], what: 'Finds API keys, tokens, private keys and hard-coded passwords left in a folder, with file and line number.' },
    RentalTracker:{ name: 'Rental Property Income & Expense Tracker', url: GR + 'cxqkwn', price: '$12', demo: null, bundles: [], needsSheet: true, what: 'A spreadsheet (Excel + Google Sheets) to track rent, expenses, tenants and lease end dates for up to 20 properties, with NOI and cash flow per property.' }
  };
  var BUNDLES = {
    toolkit: { name: 'Offline Office Toolkit (FileFlow + DataLens + DataClean)', url: GR + 'vwxibw', price: '$39', members: ['FileFlow', 'DataLens', 'DataClean'] }
  };
  /* Free tool (no purchase) */
  var FREE_TOOLS = { FileFlowLite: { name: 'FileFlow Lite (free PDF merger)', page: 'FileFlowLite.html' } };

  /* ---------- Industries ---------- */
  var CATS = [
    { id: 'trades', label: 'Trades & construction' },
    { id: 'field', label: 'Outdoor & field services' },
    { id: 'food', label: 'Food & retail' },
    { id: 'personal', label: 'Personal services' },
    { id: 'care', label: 'Health, care & education' },
    { id: 'property', label: 'Property' },
    { id: 'pro', label: 'Professional services' },
    { id: 'transport', label: 'Auto & transport' },
    { id: 'community', label: 'Nonprofit & other' }
  ];
  var INDUSTRIES = [
    { id: 'plumbing', label: 'Plumbing', cat: 'trades', syn: ['plumber', 'drain', 'pipes', 'water heater', 'gas fitter'] },
    { id: 'electrical', label: 'Electrical', cat: 'trades', syn: ['electrician', 'sparky', 'wiring', 'solar install'] },
    { id: 'hvac', label: 'HVAC', cat: 'trades', syn: ['heating', 'cooling', 'air conditioning', 'ac', 'furnace', 'boiler', 'heat pump', 'refrigeration'] },
    { id: 'handyman', label: 'Carpentry & handyman', cat: 'trades', syn: ['carpenter', 'handyman', 'joiner', 'odd jobs', 'repairs', 'tradie'] },
    { id: 'roofing', label: 'Roofing', cat: 'trades', syn: ['roofer', 'gutters', 'roof repair'] },
    { id: 'painting', label: 'Painting & decorating', cat: 'trades', syn: ['painter', 'decorator', 'drywall', 'plastering'] },
    { id: 'contractor', label: 'Construction & general contractors', cat: 'trades', syn: ['builder', 'construction', 'general contractor', 'remodeling', 'renovation', 'home improvement', 'flooring', 'tiling'] },
    { id: 'landscaping', label: 'Landscaping & lawn care', cat: 'field', syn: ['lawn', 'gardener', 'garden', 'mowing', 'tree service', 'yard'] },
    { id: 'cleaning', label: 'Cleaning (residential & commercial)', cat: 'field', syn: ['cleaner', 'janitorial', 'maid', 'house cleaning', 'office cleaning', 'carpet cleaning'] },
    { id: 'pest', label: 'Pest control', cat: 'field', syn: ['exterminator', 'termite', 'rodent', 'bugs'] },
    { id: 'restaurant', label: 'Restaurants & cafés', cat: 'food', syn: ['restaurant', 'cafe', 'café', 'coffee shop', 'bar', 'pub', 'bakery', 'takeaway', 'diner'] },
    { id: 'foodtruck', label: 'Food trucks & market stalls', cat: 'food', syn: ['food truck', 'food van', 'street food', 'catering'] },
    { id: 'retail', label: 'Retail shop', cat: 'food', syn: ['shop', 'store', 'boutique', 'gift shop', 'brick and mortar'] },
    { id: 'ecommerce', label: 'E-commerce / online store', cat: 'food', syn: ['online store', 'online shop', 'ecommerce', 'shopify', 'etsy seller', 'amazon seller', 'dropshipping'] },
    { id: 'farm', label: 'Farm & market vendor', cat: 'food', syn: ['farm', 'farmer', 'farmers market', 'produce', 'csa', 'orchard'] },
    { id: 'salon', label: 'Hair & beauty salon', cat: 'personal', syn: ['salon', 'hairdresser', 'nail salon', 'day spa', 'beauty', 'lashes', 'esthetician'] },
    { id: 'barber', label: 'Barbershop', cat: 'personal', syn: ['barber', 'barbershop'] },
    { id: 'fitness', label: 'Fitness & personal training', cat: 'personal', syn: ['gym', 'personal trainer', 'pt', 'fitness', 'bootcamp', 'crossfit'] },
    { id: 'studio', label: 'Yoga, Pilates & dance studio', cat: 'personal', syn: ['yoga', 'pilates', 'dance', 'martial arts', 'studio'] },
    { id: 'pet', label: 'Pet grooming, boarding & dog walking', cat: 'personal', syn: ['groomer', 'dog walker', 'pet sitter', 'kennel', 'boarding', 'daycare for dogs'] },
    { id: 'photo', label: 'Photographer & videographer', cat: 'personal', syn: ['photographer', 'photography', 'videographer', 'video'] },
    { id: 'events', label: 'Events & weddings', cat: 'personal', syn: ['wedding', 'event planner', 'venue', 'party', 'dj', 'florist'] },
    { id: 'health', label: 'Healthcare practice (dental, physio, chiro)', cat: 'care', syn: ['dentist', 'dental', 'physio', 'physiotherapy', 'chiropractor', 'clinic', 'therapist', 'massage', 'optometrist'] },
    { id: 'childcare', label: 'Childcare', cat: 'care', syn: ['daycare', 'nursery', 'preschool', 'after school', 'childminder'] },
    { id: 'tutoring', label: 'Tutoring & lessons', cat: 'care', syn: ['tutor', 'tuition', 'music lessons', 'language school', 'coaching classes', 'driving instructor'] },
    { id: 'realestate', label: 'Real estate agent', cat: 'property', syn: ['realtor', 'estate agent', 'broker', 'real estate'] },
    { id: 'landlord', label: 'Property management & landlords', cat: 'property', syn: ['landlord', 'property manager', 'rentals', 'letting agent', 'tenants'] },
    { id: 'str', label: 'Short-term rental host', cat: 'property', syn: ['airbnb', 'vacation rental', 'holiday let', 'bnb', 'guest house', 'short term rental'] },
    { id: 'accounting', label: 'Accounting & bookkeeping firm', cat: 'pro', syn: ['accountant', 'bookkeeper', 'cpa', 'tax preparer', 'bas agent'] },
    { id: 'law', label: 'Law firm (small)', cat: 'pro', syn: ['lawyer', 'attorney', 'solicitor', 'legal', 'paralegal'] },
    { id: 'insurance', label: 'Insurance agency', cat: 'pro', syn: ['insurance broker', 'insurance agent'] },
    { id: 'agency', label: 'Marketing & creative agency', cat: 'pro', syn: ['marketing', 'design agency', 'creative', 'social media', 'advertising', 'pr'] },
    { id: 'it', label: 'IT & web freelancer', cat: 'pro', syn: ['web developer', 'web design', 'it support', 'msp', 'software', 'developer', 'programmer'] },
    { id: 'consultant', label: 'Consultant & coach', cat: 'pro', syn: ['consultant', 'coach', 'advisor', 'freelancer', 'virtual assistant', 'writer', 'translator'] },
    { id: 'auto', label: 'Auto repair', cat: 'transport', syn: ['mechanic', 'garage', 'auto shop', 'body shop', 'tyres', 'tires', 'car repair'] },
    { id: 'moving', label: 'Moving company', cat: 'transport', syn: ['movers', 'removals', 'removalist', 'moving'] },
    { id: 'courier', label: 'Logistics & courier', cat: 'transport', syn: ['courier', 'delivery', 'logistics', 'trucking', 'haulage', 'freight', 'warehouse'] },
    { id: 'nonprofit', label: 'Nonprofit & charity', cat: 'community', syn: ['nonprofit', 'non-profit', 'charity', 'association', 'club', 'church', 'volunteer'] },
    { id: 'office', label: 'General office (any business)', cat: 'community', syn: ['office', 'admin', 'small business', 'back office'] },
    { id: 'other', label: 'Other', cat: 'community', syn: ['other'] }
  ];
  var TRADES = ['plumbing', 'electrical', 'hvac', 'handyman', 'roofing', 'painting', 'contractor'];
  var FIELD = TRADES.concat(['landscaping', 'cleaning', 'pest']);
  var IND_NOTES = {
    health: 'If you handle patient health information, follow the privacy rules that apply to your practice in your country and check a service\'s terms before putting patient information into it. This page does not give legal or clinical advice.',
    childcare: 'Children\'s and parents\' personal information should be handled under your setting\'s policies and local rules; check a service\'s terms before entering it.',
    law: 'Follow your professional body\'s rules on client confidentiality before putting client information into any tool or service.',
    accounting: 'Follow your professional body\'s rules on client confidentiality before putting client information into any tool or service.'
  };

  /* ---------- Builders ---------- */
  var TEXT_STEP = { win: 'Save it as an email template (Gmail on a computer: Settings > Advanced > Templates; Outlook: Mail Templates with a qualifying Microsoft 365 subscription)', mac: 'Add it as a Text Replacement (System Settings > Keyboard > Text Replacements), or save it as a Gmail/Outlook email template' };
  function M(id, type, title, rate, pros, cons, steps) { return { id: id, type: type, title: title, rate: rate, pros: pros, cons: cons, steps: steps }; }
  function TOOL(id, product, rate, pros, cons, steps) { return { id: id, type: 'tool', product: product, rate: rate, pros: pros, cons: cons, steps: steps }; }
  function RULE(id, title, pros, steps) { return M(id + '-rule', 'rule', title, 0.15, pros, ['The work itself does not shrink much'], steps); }
  function TASK(id, name, ind, ease, freq, min, kw, m, extra) { var t = { id: id, name: name, ind: ind, ease: ease, freq: freq, min: min, kw: kw, m: m }; if (extra) Object.keys(extra).forEach(function (k) { t[k] = extra[k]; }); return t; }
  function CLOUD(id, title, rate, pros, steps) { return M(id + '-cloud', 'cloud', title, rate, pros, ['Usually a subscription cost', 'Your data is stored with the provider'], steps || ['Write down what slows you down today and how many jobs/clients a month you handle', 'Shortlist services in this category and check they fit your country and existing tools', 'Use a free trial if one is offered, with a small part of your work', 'Check pricing, data storage and how to export/cancel before committing']); }
  function TPL(id, title, rate, steps, pros, cons) { return M(id + '-sheet', 'sheet', title, rate, pros || ['No extra cost', 'Works in Excel or Google Sheets'], cons || ['Someone still has to type the data in'], steps); }
  function TXT(id, title, rate, examples) { return M(id + '-text', 'text', title, rate, ['No extra cost', 'Takes minutes to set up'], ['You still personalise each message'], ['Pick the 3 messages you send most (' + examples + ') and write a good version of each', TEXT_STEP, 'Share the wording with your team and improve it as you go']); }
  function FORM(id, title, rate, fields) { return M(id + '-gform', 'gform', title, rate, ['People fill it in on their phone', 'Answers land in a spreadsheet automatically'], ['You need to decide the questions up front'], ['List the fields you need (' + fields + ')', 'Create a Google Form and link it to a Google Sheets spreadsheet for responses', 'Share the form link (or QR code) with the people who fill it in', 'Once a week, check the sheet for gaps']); }

  /* ---------- Tasks ----------
     ind: industries; 'common' = shown for every industry (General office).
     countryKey: name/note depends on country ('tax' | 'payroll' | 'mileage' | 'records') */
  var TASKS = [
    /* ===== Common (any business) ===== */
    TASK('invoice', 'Invoicing & payment follow-up', ['common'], 'High', 'monthly', 120,
      ['invoice', 'invoicing', 'billing', 'payment', 'overdue', 'unpaid', 'accounts receivable', 'chasing payments', 'reminder'],
      [
        TPL('invoice', 'Invoice template + client list + payment tracker', 0.5,
          ['Turn your current invoice into a spreadsheet template', 'Keep clients on a separate sheet and pull their details with a lookup (e.g. XLOOKUP/VLOOKUP)', 'Add an invoice log with sent date, due date and paid date', 'Highlight rows that are past due and unpaid with conditional formatting']),
        M('invoice-gas', 'gas', 'Apps Script: email overdue reminders from your invoice log', 0.65, ['Reminders go out without you remembering'], ['Someone needs to write and maintain the script', 'Consumer Gmail accounts can email up to 100 recipients a day'],
          ['Keep the invoice log in Google Sheets', 'Write a script that finds unpaid invoices past their due date', 'Send yourself a test reminder first, then the client version', 'Run it daily with a time-driven trigger']),
        M('invoice-pacloud', 'pacloud', 'Power Automate cloud flow: overdue reminders from an Excel table', 0.6, ['Works with Outlook and Excel on OneDrive'], ['Needs a work or school (Microsoft 365) account'],
          ['Put the invoice log in an Excel table on OneDrive', 'Create a scheduled flow that finds overdue rows', 'Send a reminder email per row; test on yourself first']),
        CLOUD('invoice', 'Cloud accounting / invoicing software', 0.75, ['Can send invoices, record payments and chase overdue ones', 'Often connects to bank feeds']),
        RULE('invoice', 'Fixed invoicing day and a follow-up schedule', ['Fewer forgotten invoices'], ['Pick one invoicing day each week or month', 'Decide when to send reminders (e.g. 3 and 14 days overdue)', 'Write the reminder wording once and reuse it'])
      ]),
    TASK('expenses', 'Expense receipts & categorising spending', ['common'], 'High', 'monthly', 90,
      ['expenses', 'receipts', 'bookkeeping', 'categorize', 'categorise', 'card statement', 'bank statement', 'subscriptions'],
      [
        TOOL('expenses-tool', 'MoneyLens', 0.5, ['Reads bank/card CSV statements and shows spending by category', 'Finds forgotten subscriptions'], ['One-time cost', 'It is a spending analysis, not a bookkeeping ledger'],
          ['Try the demo with its sample data', 'Download a few months of card/bank statements as CSV', 'Review the categories and the recurring payments it finds', 'Cancel what you no longer use and note the rest for your bookkeeping']),
        TPL('expenses', 'Expense sheet with keyword → category rules', 0.45,
          ['Paste your statement CSV into a sheet', 'Make a small table of keywords (shop names) and categories', 'Fill the category column with a formula that looks up the keyword', 'Fill blanks by hand and add new keywords as you go']),
        CLOUD('expenses', 'Cloud accounting software with bank feeds & receipt capture', 0.75, ['Imports transactions and lets you attach receipt photos']),
        RULE('expenses', 'Separate business card/account and a monthly receipts routine', ['Less sorting later'], ['Use one card/account only for business spending', 'Snap receipts into one folder the day you get them', 'Book a fixed monthly time to reconcile'])
      ], { countryKey: 'records' }),
    TASK('payroll', 'Timesheets & payroll prep', ['common'], 'High', 'monthly', 150,
      ['timesheet', 'timesheets', 'payroll', 'hours', 'overtime', 'clock in', 'rota hours', 'wages'],
      [
        TPL('payroll', 'Timesheet template with automatic totals', 0.5,
          ['One row per person per day: start, finish, break', 'Calculate hours and overtime with formulas', 'Total per person per pay period on a summary sheet', 'Hand the summary to whoever runs payroll']),
        FORM('payroll', 'Google Form for clock-in/out or weekly hours', 0.45, 'name, date, start, finish, break, job'),
        CLOUD('payroll', 'Time-tracking / payroll software', 0.8, ['Staff clock in on their phone; hours flow into payroll']),
        RULE('payroll', 'One timesheet format and a cut-off day', ['Fewer corrections'], ['Choose one timesheet format for everyone', 'Set a weekly cut-off for submitting hours', 'Have one person check before payroll'])
      ], { countryKey: 'payroll' }),
    TASK('taxprep', 'Sales tax / VAT / GST report prep', ['common'], 'Medium', 'monthly', 90,
      ['sales tax', 'vat', 'gst', 'hst', 'pst', 'bas', 'tax return', 'making tax digital', 'mtd', 'activity statement'],
      [
        TPL('taxprep', 'Sales & purchases summary with tax columns', 0.45,
          ['Export sales and purchases for the period (CSV)', 'Add columns for net amount, tax rate and tax amount', 'Summarise by period and rate with a pivot table', 'Give the summary to your accountant or check it against your software']),
        TOOL('taxprep-tool', 'DataLens', 0.4, ['Quick pivots and charts from your sales export'], ['One-time cost', 'It summarises data; it does not file returns or apply tax rules'],
          ['Try the demo with its sample data', 'Load your sales export for the period', 'Group by month and category to get totals', 'Save to Excel and use it as working papers for your accountant']),
        CLOUD('taxprep', 'Accounting software that prepares tax reports for your country', 0.75, ['Can prepare (and in some countries file) tax reports from your records']),
        RULE('taxprep', 'Monthly close checklist', ['Fewer last-minute surprises'], ['List what must be recorded before each period ends', 'Reconcile bank accounts monthly', 'Keep a folder per period for reports and notes'])
      ], { countryKey: 'tax' }),
    TASK('mileage', 'Mileage / vehicle log', ['common'], 'Medium', 'weekly', 20,
      ['mileage', 'miles', 'kilometres', 'kilometers', 'logbook', 'vehicle', 'car', 'trip log', 'odometer'],
      [
        FORM('mileage', 'Google Form trip log on your phone', 0.5, 'date, start and end location or odometer, purpose, vehicle'),
        TPL('mileage', 'Trip log spreadsheet with totals', 0.4, ['One row per trip: date, purpose, start/end odometer', 'Calculate distance with a formula', 'Total by month and by vehicle']),
        CLOUD('mileage', 'Mileage-tracking app', 0.75, ['Can record trips automatically using your phone\'s location']),
        RULE('mileage', 'Log trips the same day', ['Fewer missing trips'], ['Keep the log in one place (phone note or sheet)', 'Record each business trip the same day', 'Check odometer readings monthly'])
      ], { countryKey: 'mileage' }),
    TASK('email2sheet', 'Copying details from emails into a spreadsheet', ['common'], 'Medium', 'daily', 15,
      ['copy paste', 'data entry', 'emails', 'orders by email', 'enquiries', 'inbox', 'retyping'],
      [
        M('email2sheet-pacloud', 'pacloud', 'Power Automate cloud flow: add a row when a matching email arrives', 0.7, ['Runs automatically when the email arrives'], ['Needs a work or school (Microsoft 365) account', 'Pulling fields out of free text takes setup'],
          ['Note what the emails have in common (sender, subject)', 'Create a flow triggered by a new email that matches', 'Add a row to an Excel table on OneDrive', 'Test with a sample email']),
        M('email2sheet-gas', 'gas', 'Apps Script: copy labelled Gmail messages into Sheets', 0.7, ['Works with a personal Google account'], ['Someone needs to write and maintain the script'],
          ['Create a Gmail filter that labels these emails', 'Write a script that writes date, sender, subject and key text to a sheet', 'Run it on a time-driven trigger']),
        M('email2sheet-pad', 'pad', 'Power Automate for desktop: record the copy-paste steps', 0.55, ['No extra cost with a Microsoft account', 'Build it by recording your clicks'], ['Windows only', 'Can break if screens change'],
          ['Install Power Automate for desktop and sign in with a Microsoft account', 'Record yourself copying one email into the spreadsheet', 'Loop it over the emails and test on a few']),
        RULE('email2sheet', 'Ask senders to use a fixed format or a form', ['Much easier to copy'], ['Decide the fields you need', 'Give customers a form or a template to use', 'Match the spreadsheet columns to that format'])
      ]),
    TASK('clientlist', 'Cleaning up client / mailing lists', ['common'], 'High', 'monthly', 60,
      ['client list', 'customer list', 'mailing list', 'duplicates', 'contacts', 'crm cleanup', 'messy data'],
      [
        TOOL('clientlist-tool', 'DataClean', 0.75, ['Standardises phones, dates, emails and names; removes duplicates', 'Runs on your computer, no upload'], ['One-time cost', 'You still decide edge cases (same person or not)'],
          ['Try the demo with its sample data', 'Make a copy of your list', 'Pick the clean-up rule for each column and run it', 'Check flagged cells and save']),
        TPL('clientlist', 'Formulas + Remove Duplicates', 0.45, ['Copy the list', 'Use TRIM/PROPER/SUBSTITUTE to tidy columns into helper columns', 'Remove duplicates on the cleaned columns', 'Keep a note of the rules for next time']),
        RULE('clientlist', 'Data entry rules', ['Stops new mess'], ['Agree formats for phone numbers, addresses and names', 'Use drop-downs where possible', 'Review the list quarterly'])
      ]),
    TASK('labels', 'Mailing labels & letters', ['common'], 'High', 'yearly', 120,
      ['labels', 'mailing labels', 'envelopes', 'address labels', 'letters', 'newsletter by post', 'christmas cards'],
      [
        TOOL('labels-tool', 'LabelMaker', 0.75, ['Load a CSV/Excel list, pick the label sheet and print', 'No mail merge setup'], ['One-time cost'],
          ['Try the demo with its sample list', 'Check your label sheet size', 'Print a test page on plain paper and hold it against the labels', 'Print the real labels']),
        M('labels-merge', 'merge', 'Word mail merge for labels and letters', 0.6, ['Uses your Excel list directly', 'No extra cost'], ['Needs desktop Word', 'Label setup takes a little practice'],
          ['Keep the list on one sheet with headings in row 1', 'In Word, start a mail merge for labels and choose your label product', 'Insert the address fields', 'Print one test page on plain paper']),
        RULE('labels', 'One master mailing list', ['Less prep each time'], ['Keep one master list', 'Add a "send / don\'t send" column', 'Tidy addresses before the mailing'])
      ]),
    TASK('replies', 'Standard email replies', ['common'], 'High', 'daily', 15,
      ['email templates', 'canned responses', 'standard replies', 'faq', 'answers', 'quick replies'],
      [
        TXT('replies', 'Email templates / text replacements', 0.5, 'pricing questions, booking confirmations, follow-ups'),
        M('replies-gas', 'gas', 'Apps Script: personalised bulk emails from a sheet', 0.7, ['Merge names and details into one message for many people'], ['Someone needs to write and maintain the script', 'Consumer Gmail accounts can email up to 100 recipients a day'],
          ['Put recipients and fields in a sheet', 'Write the message with placeholders like {name}', 'Send a test to yourself first']),
        RULE('replies', 'A shared answers document', ['Consistent replies across the team'], ['Collect the common questions and best answers in one document', 'Agree a reply time (e.g. within one business day)', 'Review answers quarterly'])
      ]),
    TASK('meetings', 'Scheduling meetings', ['common'], 'Medium', 'often', 15,
      ['scheduling', 'calendar', 'meetings', 'availability', 'back and forth', 'calls'],
      [
        CLOUD('meetings', 'Online scheduling / booking page', 0.75, ['People pick a free slot themselves', 'Fewer back-and-forth emails']),
        TXT('meetings', 'Template with three proposed times', 0.35, 'propose times, confirm, reschedule'),
        RULE('meetings', 'Fixed meeting windows', ['Less scheduling overall'], ['Block regular times for client calls', 'Offer those windows first', 'Keep recurring meetings on fixed days'])
      ]),
    TASK('pdftable', 'Retyping tables from PDFs', ['common'], 'Medium', 'weekly', 30,
      ['pdf', 'statements', 'retyping', 'pdf to excel', 'invoice pdf', 'tables in pdf'],
      [
        TOOL('pdftable-tool', 'PDF2Excel', 0.7, ['Converts tables in text-based PDFs to Excel, offline'], ['One-time cost', 'Does not read scanned images'],
          ['Try the demo with its sample PDF', 'Check your PDF lets you select text', 'Convert and compare totals with the PDF', 'Adjust the column setting if columns shift']),
        TPL('pdftable', 'Paste, then split and clean with formulas', 0.3, ['Copy from the PDF into a paste sheet', 'Split columns (Text to Columns / SPLIT)', 'Turn amounts into numbers']),
        RULE('pdftable', 'Ask for the data as CSV/Excel', ['Removes the job entirely'], ['List who sends you PDF tables', 'Ask if they can send CSV or Excel instead', 'Agree a fixed format'])
      ]),
    TASK('compare', 'Comparing two spreadsheets (price lists, rosters)', ['common'], 'High', 'monthly', 45,
      ['compare', 'differences', 'reconcile lists', 'price list update', 'what changed', 'diff'],
      [
        TOOL('compare-tool', 'DiffCheck', 0.8, ['Shows added, removed and changed rows and cells'], ['One-time cost'],
          ['Read the Gumroad page to check it fits your files', 'Pick the key column (product code, ID)', 'Compare old vs new and save the list of changes']),
        TPL('compare', 'Lookup + conditional formatting', 0.5, ['Paste both versions into one workbook', 'Look up each key in the other sheet', 'Highlight cells that differ']),
        RULE('compare', 'Version names and a change note', ['Easier to see what changed'], ['Name files with dates', 'Add a "changed" column when editing', 'Keep old versions in one folder'])
      ]),
    TASK('reports', 'Reports & charts from CSV exports', ['common'], 'High', 'weekly', 60,
      ['report', 'reports', 'csv', 'charts', 'dashboard', 'pivot', 'analysis', 'kpi'],
      [
        TOOL('reports-tool', 'DataLens', 0.7, ['Pivots, charts and sales analysis from a CSV/Excel export, offline'], ['One-time cost'],
          ['Try the demo with its sample data', 'Load the export you report on', 'Choose rows, columns and values', 'Save to Excel or as a chart image']),
        TPL('reports', 'Pivot table + chart template', 0.55, ['Keep a "paste data here" sheet', 'Build a pivot table and chart from it', 'Next time just paste and refresh']),
        M('reports-vba', 'vba', 'Excel macro: import, tidy and refresh in one click', 0.75, ['One button for the whole routine'], ['Someone needs to write and maintain VBA'],
          ['Write down each step you do', 'Record a macro of the steps', 'Make it work with different file names and row counts', 'Test on a copy']),
        RULE('reports', 'Pick the few numbers that matter', ['Less time building reports'], ['Choose 3–5 numbers to track', 'Fix the report day', 'Use the same layout every time'])
      ]),
    TASK('survey', 'Customer feedback surveys', ['common'], 'High', 'yearly', 180,
      ['survey', 'feedback', 'nps', 'questionnaire', 'satisfaction'],
      [
        TOOL('survey-tool', 'SurveyLens', 0.7, ['Charts, cross-tabs and NPS from a Google Forms export or CSV, offline'], ['One-time cost'],
          ['Try the demo with its sample data', 'Download responses as CSV', 'Check question types and build the report', 'Print or save as PDF']),
        FORM('survey', 'Google Forms with a linked sheet', 0.6, 'rating questions, multiple choice, one open question'),
        RULE('survey', 'Short, consistent questions', ['Easier to analyse'], ['Use the same rating scale', 'Keep open questions to one or two', 'Run it at the same time each year'])
      ]),
    TASK('webcopy', 'Copying tables from websites', ['common'], 'Medium', 'weekly', 30,
      ['web table', 'copy from website', 'supplier prices', 'directory', 'scrape', 'listings'],
      [
        TOOL('webcopy-tool', 'ListGrab', 0.6, ['Bookmarklet that copies a table or repeating list on the page you are viewing to CSV/Excel'], ['One-time cost', 'Check each site\'s terms of use'],
          ['Read the Gumroad page to see how it works', 'Open the page with the table you need', 'Pick the table and save it as CSV']),
        TPL('webcopy', 'Paste and tidy with formulas', 0.3, ['Copy the table from the page', 'Paste into a sheet and tidy columns', 'Keep the source and date in a note']),
        RULE('webcopy', 'Ask the supplier for a file', ['No copying at all'], ['Ask suppliers for a CSV/Excel price list', 'Agree how often they send it', 'Keep the latest file in one folder'])
      ]),
    TASK('pdfwork', 'Combining PDFs & resizing photos', ['common'], 'High', 'weekly', 20,
      ['merge pdf', 'combine pdf', 'split pdf', 'resize photos', 'compress images', 'job pack'],
      [
        TOOL('pdfwork-tool', 'FileFlow', 0.6, ['PDF, image and spreadsheet chores on your own computer', 'No upload'], ['One-time cost'],
          ['Read the Gumroad page to check it covers your task', 'Try the free FileFlow Lite (PDF merge) first', 'Use FileFlow for splitting, reordering or resizing images']),
        M('pdfwork-pad', 'pad', 'Power Automate for desktop: batch file moves and renames', 0.4, ['No extra cost with a Microsoft account'], ['Windows only'],
          ['Decide the folder and naming pattern', 'Build a flow that renames/moves files', 'Test on a copy']),
        RULE('pdfwork', 'Folder and file-naming rules', ['Faster to find and assemble files'], ['Name files date_client_type', 'Keep one folder per job', 'Archive monthly'])
      ]),
    TASK('phishing', 'Checking suspicious emails & payment-change requests', ['common'], 'Medium', 'weekly', 15,
      ['phishing', 'scam', 'fake invoice', 'bank details change', 'spoofing', 'suspicious email', 'sms scam'],
      [
        TOOL('phishing-tool', 'MailCheck', 0.5, ['Lists spoofing and phishing warning signs from an email\'s source'], ['One-time cost', 'It points out warning signs; you still verify by phone'],
          ['Try the demo', 'Learn how to view the original message/source in your email app', 'Check any email that asks to change bank details']),
        TOOL('phishing-tool2', 'LinkCheck', 0.4, ['Checks suspicious texts and links without opening them'], ['One-time cost'],
          ['Try the demo', 'Paste the suspicious text or URL', 'Delete it if the brand and link do not match']),
        RULE('phishing', 'Call-back rule for any payment change', ['Stops most payment fraud'], ['Never change bank details based on an email alone', 'Call the supplier on a number you already have', 'Write the rule down and tell everyone who pays bills'])
      ]),
    TASK('passwords', 'Passwords & staff accounts', ['common'], 'Medium', 'yearly', 120,
      ['passwords', 'accounts', 'leavers', 'two-factor', '2fa', 'mfa', 'security'],
      [
        TOOL('passwords-tool', 'PassAudit', 0.6, ['Finds reused and weak passwords in an exported password file'], ['One-time cost', 'Delete the exported file afterwards'],
          ['Try the demo', 'Export saved passwords from your browser/password manager as CSV', 'Fix reused passwords on important accounts first', 'Delete the export and empty the trash']),
        TPL('passwords', 'Account register (no passwords in it)', 0.3, ['List each service, owner, admin and whether 2-step sign-in is on', 'Update it when people join or leave', 'Review twice a year']),
        RULE('passwords', 'Turn on 2-step sign-in for key accounts', ['Big security gain for little effort'], ['Start with email, banking and admin accounts', 'Remove leavers\' access the day they leave', 'Use a password manager\'s generator'])
      ]),

    /* ===== Trades & field services ===== */
    TASK('quote', 'Estimates, quotes & proposals', FIELD.concat(['auto', 'moving', 'courier', 'events', 'photo', 'agency', 'it', 'consultant']), 'Medium', 'often', 45,
      ['estimate', 'quote', 'quotation', 'proposal', 'bid', 'tender', 'pricing'],
      [
        TPL('quote', 'Quote template with a price list', 0.5,
          ['Make a price list of your common items/labour rates', 'Build a quote template that pulls prices with a lookup', 'Calculate subtotal, tax and total automatically', 'Number quotes and keep a quote log with status (sent, won, lost)']),
        M('quote-vba', 'vba', 'Excel macro: save the quote as PDF and log it', 0.6, ['Save and log in one click'], ['Someone needs to write and maintain VBA'],
          ['Prepare the template and a quote log sheet', 'Record a macro that saves the quote as PDF', 'Add a step that writes number, client and total to the log', 'Test in a separate folder']),
        CLOUD('quote', 'Field-service / quoting software', 0.7, ['Quotes can turn into jobs and invoices without retyping']),
        RULE('quote', 'One template and a follow-up date for every quote', ['More quotes followed up'], ['Use one up-to-date template', 'Put a follow-up date on every quote', 'Review open quotes weekly'])
      ]),
    TASK('dispatch', 'Job scheduling & dispatch', FIELD.concat(['moving', 'courier']), 'Medium', 'daily', 30,
      ['scheduling', 'dispatch', 'jobs', 'calendar', 'crew', 'routes', 'technicians', 'work orders'],
      [
        TPL('dispatch', 'Job board: days × crew with colour coding', 0.4,
          ['Rows for crew/vans, columns for days', 'Colour by job type or status', 'Count jobs per person per day with formulas', 'Share as PDF or a shared file each evening']),
        CLOUD('dispatch', 'Field-service scheduling & dispatch software', 0.7, ['Crews see their jobs on their phone', 'Jobs link to quotes and invoices']),
        M('dispatch-text', 'text', 'Templates for job confirmations and "on my way" messages', 0.3, ['No extra cost'], ['Scheduling itself is still manual'],
          ['Write confirmation, reminder and "on my way" messages', TEXT_STEP, 'Send the reminder the day before']),
        RULE('dispatch', 'Booking cut-off and next-day plan', ['Fewer reshuffles'], ['Set a cut-off time for next-day jobs', 'Plan tomorrow at the same time each day', 'One person owns the schedule'])
      ]),
    TASK('jobphotos', 'Job photos & job records', FIELD.concat(['auto']), 'Medium', 'daily', 20,
      ['photos', 'job photos', 'before and after', 'site photos', 'evidence', 'job records'],
      [
        M('jobphotos-gdrive', 'gdrive', 'Shared folder per job, uploaded from the phone', 0.5, ['Office sees photos the same day'], ['Uses your Google Drive storage', 'Needs a naming rule'],
          ['Create a folder per job (jobnumber_address)', 'Share it with the crew and install the Drive app on their phones', 'Upload photos at the end of each job', 'Use subfolders: before / during / after']),
        TOOL('jobphotos-tool', 'FileFlow', 0.3, ['Batch resize/convert images and combine PDFs for a job pack'], ['One-time cost', 'It does not organise photos into jobs for you'],
          ['Read the Gumroad page to check it fits', 'Resize a batch of photos for emailing', 'Combine the job PDF documents into one pack']),
        CLOUD('jobphotos', 'Field-service app with photo attachments', 0.6, ['Photos attach to the job automatically']),
        RULE('jobphotos', 'Photo checklist per job', ['Fewer missing photos'], ['List the photos needed for each job type', 'Upload before leaving site', 'Name folders the same way every time'])
      ]),
    TASK('jobsheet', 'Job sheets & service reports', FIELD, 'Medium', 'daily', 15,
      ['job sheet', 'service report', 'work order', 'completion', 'checklist', 'sign off', 'inspection'],
      [
        FORM('jobsheet', 'Google Form job sheet on the phone', 0.55, 'job number, work done, materials used, time on site, follow-up needed'),
        TPL('jobsheet', 'Job sheet template with drop-downs', 0.3, ['One row per job', 'Drop-downs for job type and status', 'Monthly totals by job type']),
        CLOUD('jobsheet', 'Field-service app with digital forms & signatures', 0.7, ['Customer can sign on the device', 'Report goes straight to the office']),
        RULE('jobsheet', 'Fill in the sheet before leaving site', ['Fewer missing details'], ['Keep the form short', 'Make it part of finishing a job', 'Office checks yesterday\'s sheets each morning'])
      ]),
    TASK('materials', 'Materials & parts purchasing log', TRADES.concat(['landscaping', 'auto']), 'Medium', 'weekly', 30,
      ['materials', 'parts', 'purchase orders', 'suppliers', 'stock', 'van stock'],
      [
        TPL('materials', 'Purchase log by job', 0.45, ['Columns: date, supplier, item, qty, cost, job', 'Total by job to see true job cost', 'Flag orders not yet delivered']),
        FORM('materials', 'Google Form to log purchases from the supplier counter', 0.4, 'job, supplier, items, amount, receipt photo link'),
        RULE('materials', 'One person approves orders', ['Fewer duplicate orders'], ['Decide who can order', 'Note the job number on every order', 'Match supplier statements monthly'])
      ]),
    TASK('recurring', 'Recurring service plans & reminders', ['hvac', 'plumbing', 'landscaping', 'pest', 'cleaning', 'auto', 'pet', 'salon'], 'Medium', 'weekly', 30,
      ['maintenance plan', 'service reminder', 'annual service', 'recurring visits', 'renewal', 'due date', 'rebook'],
      [
        TPL('recurring', 'Service due-date list', 0.45, ['List customers, service type, last date, interval', 'Calculate the next due date', 'Highlight those due this month']),
        M('recurring-gas', 'gas', 'Apps Script: monthly email of who is due', 0.6, ['You get the list without looking'], ['Someone needs to write and maintain the script'],
          ['Keep the due-date list in Google Sheets', 'Script the "due this month" filter', 'Email it to yourself monthly with a trigger']),
        TOOL('recurring-tool', 'LabelMaker', 0.25, ['Print postcard/letter labels for customers who are due'], ['One-time cost', 'Choosing who is due is done in the sheet'],
          ['Try the demo', 'Filter the due customers and export them', 'Print labels on your label sheet']),
        CLOUD('recurring', 'Software with recurring jobs and automated reminders', 0.7, ['Creates the next visit and reminds the customer']),
        RULE('recurring', 'Book the next visit before you leave', ['Fewer forgotten services'], ['Offer the next visit date at the end of each job', 'Write it on the job sheet', 'Check the due list on the first of each month'])
      ]),
    TASK('subs', 'Subcontractor scheduling & payments', ['contractor', 'events', 'agency', 'roofing', 'painting'], 'Medium', 'weekly', 45,
      ['subcontractors', 'subs', 'freelancers', 'suppliers', 'contractor payments', '1099', 'cis'],
      [
        TPL('subs', 'Subcontractor register: jobs, amounts, invoices, paid', 0.45, ['Columns: sub, job, agreed amount, invoice received, paid date', 'Highlight payments due this week', 'Total per sub per month']),
        TXT('subs', 'Booking message template', 0.3, 'job booking, schedule change, payment confirmation'),
        RULE('subs', 'Written booking and fixed payment run', ['Fewer disputes'], ['Confirm every booking in writing', 'Pay on a fixed day', 'Keep invoices in one folder'])
      ]),

    /* ===== Food & retail / personal services ===== */
    TASK('booking', 'Appointment booking & reminders', ['salon', 'barber', 'fitness', 'studio', 'pet', 'health', 'photo', 'tutoring', 'auto'], 'Medium', 'daily', 20,
      ['booking', 'appointments', 'reservations', 'no-shows', 'reminders', 'calendar', 'walk-ins'],
      [
        CLOUD('booking', 'Online booking software with reminders', 0.65, ['Clients book free slots themselves', 'Automatic reminders can reduce no-shows']),
        FORM('booking', 'Google Form booking requests into a sheet', 0.35, 'name, contact, preferred time, service (no health details)'),
        TXT('booking', 'Confirmation and reminder templates', 0.3, 'confirmation, reminder the day before, reschedule'),
        RULE('booking', 'One booking diary', ['Fewer double bookings'], ['Put all bookings into one diary', 'Confirm every booking the same way', 'Send reminders at a set time'])
      ]),
    TASK('rota', 'Staff rota & hours', ['restaurant', 'foodtruck', 'retail', 'salon', 'fitness', 'childcare', 'health', 'cleaning', 'courier', 'moving', 'str'], 'Medium', 'weekly', 60,
      ['rota', 'roster', 'schedule', 'shifts', 'staff schedule', 'availability', 'cover'],
      [
        TPL('rota', 'Rota template with cover check', 0.4, ['Days across, staff down', 'Set the staff needed per shift and highlight gaps', 'Total hours per person', 'Share as PDF']),
        CLOUD('rota', 'Staff scheduling app', 0.6, ['Staff see shifts and swap them on their phone']),
        FORM('rota', 'Google Form for availability', 0.3, 'name, week, days/times available'),
        RULE('rota', 'Availability deadline and swap rules', ['Fewer last-minute changes'], ['Fix a weekly availability deadline', 'Agree how swaps are approved', 'Publish the rota on the same day each week'])
      ]),
    TASK('stock', 'Inventory & reordering', ['restaurant', 'foodtruck', 'retail', 'ecommerce', 'salon', 'pet', 'auto', 'farm', 'courier'], 'Medium', 'weekly', 45,
      ['inventory', 'stock', 'reorder', 'stocktake', 'supplies', 'out of stock', 'par levels'],
      [
        TPL('stock', 'Stock sheet with reorder points', 0.45, ['Item, location, on hand, reorder point, supplier', 'Highlight items below the reorder point', 'Count on a fixed day']),
        TOOL('stock-tool', 'QRBatch', 0.25, ['Bulk QR labels for shelves, bins or assets from your item list'], ['One-time cost', 'You still need a way to record scans'],
          ['Try the demo', 'Export your item list', 'Print QR labels with the item name underneath', 'Test-scan a few with your phone']),
        CLOUD('stock', 'Inventory features in your POS or e-commerce platform', 0.7, ['Stock updates as you sell']),
        RULE('stock', 'Count day and reorder owner', ['Fewer stock-outs'], ['Fix a weekly count day', 'One person places orders', 'Keep a "running low" list by the till'])
      ]),
    TASK('dailysales', 'Daily sales report', ['restaurant', 'foodtruck', 'retail', 'ecommerce', 'salon', 'barber', 'fitness', 'farm'], 'High', 'daily', 15,
      ['daily sales', 'z report', 'takings', 'end of day', 'cash up', 'sales report', 'pos report'],
      [
        TOOL('dailysales-tool', 'DataLens', 0.6, ['Daily/monthly totals and charts from your POS export'], ['One-time cost', 'Needs a CSV/Excel export'],
          ['Try the demo', 'Export a month of sales from your POS', 'Group by day, category or item', 'Save to Excel and compare months']),
        TPL('dailysales', 'Daily takings sheet with monthly totals', 0.45, ['One row per day: sales, transactions, cash/card', 'Monthly and weekday totals with formulas', 'A chart against last month']),
        RULE('dailysales', 'End-of-day routine', ['Consistent numbers'], ['Write the close-up steps', 'Pick 3 numbers to watch', 'Review weekly'])
      ]),
    TASK('reviews', 'Review & enquiry replies', ['restaurant', 'retail', 'ecommerce', 'salon', 'barber', 'pet', 'fitness', 'auto', 'str', 'photo', 'events', 'cleaning', 'plumbing', 'electrical', 'hvac', 'handyman', 'roofing', 'painting'], 'High', 'daily', 15,
      ['reviews', 'replies', 'enquiries', 'inquiries', 'messages', 'google reviews', 'dm'],
      [
        TXT('reviews', 'Reply templates for reviews and common enquiries', 0.5, 'thank-you for a review, pricing enquiry, opening hours'),
        RULE('reviews', 'Reply routine and owner', ['Faster, consistent replies'], ['Pick one time a day to reply', 'Decide who replies', 'Escalate complaints to the owner'])
      ]),
    TASK('repeat', 'Repeat customer analysis', ['retail', 'ecommerce', 'salon', 'barber', 'restaurant', 'pet', 'fitness'], 'Medium', 'monthly', 60,
      ['repeat customers', 'loyalty', 'retention', 'lapsed', 'rfm', 'best customers', 'churn'],
      [
        TOOL('repeat-tool', 'CustomerLens', 0.6, ['RFM scoring from your store/POS order export: best customers and who is slipping away'], ['One-time cost', 'Needs a customer ID or email in the export'],
          ['Read the Gumroad page to check your export fits', 'Export orders with customer, date and amount', 'Run the analysis and save the segment lists', 'Plan a message for lapsed customers (respect marketing consent)']),
        TPL('repeat', 'Last visit and visit count per customer', 0.4, ['Put all orders/visits in one sheet', 'Calculate last date and count per customer', 'Highlight customers not seen for 90 days']),
        RULE('repeat', 'Rebook at checkout', ['More return visits'], ['Offer the next booking at checkout', 'Decide when to send a "we miss you" message', 'Track how many rebook'])
      ]),
    TASK('clientcard', 'Client records & visit history', ['salon', 'barber', 'pet', 'fitness', 'health'], 'Medium', 'daily', 15,
      ['client records', 'client card', 'visit history', 'notes', 'treatment notes', 'formula card'],
      [
        TPL('clientcard', 'Client record sheet (ID, visit date, service, notes)', 0.4, ['Use a client ID instead of full details where possible', 'One row per visit', 'Decide who can open the file and where it is stored']),
        FORM('clientcard', 'Google Form after each visit', 0.35, 'client ID, service, staff, notes'),
        CLOUD('clientcard', 'Booking software with client records', 0.6, ['Bookings and history in one place']),
        RULE('clientcard', 'Standard notes format', ['Anyone can pick up a client'], ['Agree what to note', 'Write notes straight after the visit', 'Review access to records'])
      ]),
    TASK('intake', 'Client intake & onboarding forms', ['health', 'childcare', 'tutoring', 'law', 'accounting', 'consultant', 'agency', 'it', 'insurance', 'pet', 'fitness', 'photo', 'events'], 'High', 'weekly', 30,
      ['intake', 'onboarding', 'new client', 'enrolment', 'enrollment', 'registration', 'forms', 'questionnaire'],
      [
        FORM('intake', 'Google Form intake that fills a sheet', 0.55, 'contact details, what they need, how they heard about you (avoid sensitive data unless your rules allow it)'),
        CLOUD('intake', 'Client portal / form & e-signature service', 0.7, ['Forms, documents and signatures in one place']),
        M('intake-merge', 'merge', 'Word mail merge for welcome letters and engagement documents', 0.35, ['Uses your existing letter template'], ['Needs desktop Word'],
          ['Keep new clients in an Excel sheet', 'Add merge fields to your welcome letter', 'Print or save one test']),
        RULE('intake', 'One onboarding checklist', ['Nothing missed'], ['List every onboarding step', 'Send the same welcome email', 'Tick off steps in a shared checklist'])
      ]),

    /* ===== Memberships, classes, community ===== */
    TASK('members', 'Memberships & recurring billing', ['fitness', 'studio', 'tutoring', 'childcare', 'nonprofit'], 'High', 'monthly', 90,
      ['membership', 'recurring billing', 'fees', 'tuition', 'dues', 'direct debit', 'subscriptions', 'late payments'],
      [
        TPL('members', 'Member × month payment grid', 0.45, ['Members down, months across', 'Enter payment dates; highlight unpaid after the due day', 'Monthly totals']),
        CLOUD('members', 'Membership / recurring billing software', 0.75, ['Collects payments automatically and flags failures']),
        TOOL('members-tool', 'QRBatch', 0.15, ['Print member ID cards with QR codes from your member list'], ['One-time cost', 'It does not handle billing'],
          ['Try the demo', 'Export member IDs and names', 'Print cards with the QR and name']),
        RULE('members', 'Fixed due date and late-payment message', ['Earlier follow-up'], ['Same due date every month', 'Record payments the day they arrive', 'Send the late note on a fixed day'])
      ]),
    TASK('attendance', 'Attendance & class lists', ['studio', 'tutoring', 'childcare', 'fitness', 'nonprofit', 'events'], 'Medium', 'daily', 15,
      ['attendance', 'register', 'sign in', 'class list', 'check-in', 'roll call'],
      [
        FORM('attendance', 'Google Form check-in', 0.5, 'date, class/session, name or ID, present/absent'),
        TPL('attendance', 'Register sheet with totals', 0.35, ['Names down, dates across', 'Drop-down for present/absent', 'Attendance rate per person']),
        CLOUD('attendance', 'Class booking/attendance software', 0.6, ['Check-in on a tablet or phone']),
        RULE('attendance', 'Take the register at the start', ['Fewer gaps'], ['Same routine every session', 'One person owns the register', 'Weekly check'])
      ]),
    TASK('newsletter', 'Updates to parents, members or tenants', ['tutoring', 'childcare', 'studio', 'nonprofit', 'fitness', 'landlord'], 'Medium', 'monthly', 60,
      ['newsletter', 'updates', 'parents', 'members', 'tenants', 'announcements', 'bulk email'],
      [
        M('newsletter-gas', 'gas', 'Apps Script: personalised emails from your list', 0.7, ['Names and details merged in'], ['Someone needs to write and maintain the script', 'Consumer Gmail: up to 100 recipients a day'],
          ['Keep the list in Google Sheets', 'Write the message with placeholders', 'Test on yourself, then send']),
        M('newsletter-pacloud', 'pacloud', 'Power Automate cloud flow: email each row of a list', 0.65, ['Works with Outlook and Excel'], ['Needs a Microsoft 365 work/school account'],
          ['Put the list in an Excel table on OneDrive', 'Create a flow that emails each row', 'Test on yourself']),
        CLOUD('newsletter', 'Email newsletter service', 0.7, ['Templates, unsubscribe handling and open stats']),
        TXT('newsletter', 'Reusable update templates', 0.3, 'closure notice, event reminder, payment reminder')
      ]),
    TASK('donors', 'Donor tracking & thank-you letters', ['nonprofit'], 'Medium', 'monthly', 90,
      ['donors', 'donations', 'thank you letters', 'fundraising', 'gift aid', 'receipts', 'supporters'],
      [
        TPL('donors', 'Donor register with thank-you status', 0.45, ['Donor ID, name, date, amount, thank-you sent', 'Highlight gifts not yet thanked', 'Yearly totals per donor']),
        TOOL('donors-tool', 'LabelMaker', 0.4, ['Print envelope labels for thank-you letters'], ['One-time cost'], ['Try the demo', 'Export donors to thank this month', 'Print labels']),
        TOOL('donors-tool2', 'DataClean', 0.35, ['Tidy and de-duplicate the donor list'], ['One-time cost'], ['Try the demo', 'Copy the donor list', 'Clean and review flagged cells']),
        M('donors-merge', 'merge', 'Word mail merge thank-you letters', 0.45, ['Name and amount merged in'], ['Needs desktop Word'], ['Add merge fields to your letter', 'Link the donor sheet', 'Print one test']),
        RULE('donors', 'Thank within a set number of days', ['No donor forgotten'], ['Record gifts the day they arrive', 'Set a thank-you deadline', 'Review the list monthly'])
      ]),
    TASK('volunteers', 'Volunteer & helper rota', ['nonprofit', 'events'], 'Medium', 'monthly', 60,
      ['volunteers', 'helpers', 'rota', 'sign up', 'shifts'],
      [
        FORM('volunteers', 'Google Form sign-up by shift', 0.45, 'name, contact, shifts available'),
        TPL('volunteers', 'Rota grid with count per shift', 0.4, ['Shifts down, dates across', 'Count volunteers per shift', 'Share as PDF']),
        RULE('volunteers', 'Role descriptions', ['Easier to recruit'], ['Write a short description per role', 'Set a sign-up deadline', 'Thank volunteers after each event'])
      ]),
    TASK('guests', 'Guest lists, seating & name badges', ['events', 'nonprofit'], 'Medium', 'monthly', 90,
      ['guest list', 'seating', 'name badges', 'rsvp', 'tickets', 'check-in'],
      [
        TOOL('guests-tool', 'QRBatch', 0.45, ['Bulk QR codes with names for tickets, check-in or place cards'], ['One-time cost', 'It does not plan seating'],
          ['Try the demo', 'Export guests (ID, name, table)', 'Print codes with name and table underneath', 'Test-print one sheet']),
        M('guests-merge', 'merge', 'Word mail merge name badges', 0.45, ['Uses the guest sheet'], ['Needs desktop Word'], ['Pick a badge label product', 'Insert name fields', 'Print a test']),
        TPL('guests', 'Seating sheet with table counts', 0.35, ['Add a table column to the guest list', 'Count guests per table', 'Highlight over-full tables']),
        RULE('guests', 'RSVP deadline and one change contact', ['Fewer reprints'], ['Set an RSVP deadline', 'One person handles changes', 'Date the final version'])
      ]),

    /* ===== Property ===== */
    TASK('leads', 'Lead tracking & follow-up', ['realestate', 'insurance', 'contractor', 'consultant', 'agency'], 'Medium', 'daily', 20,
      ['leads', 'prospects', 'follow up', 'enquiries', 'pipeline', 'crm'],
      [
        TPL('leads', 'Lead sheet with next-contact date', 0.4, ['Date, source, name, need, next contact, status', 'Highlight leads due today', 'Count leads and wins by source']),
        M('leads-gas', 'gas', 'Apps Script: log enquiry emails into the lead sheet', 0.6, ['New enquiries appear automatically'], ['Someone needs to write and maintain the script'], ['Label enquiry emails with a Gmail filter', 'Script them into the sheet', 'Run on a trigger']),
        CLOUD('leads', 'CRM software', 0.7, ['Pipelines, reminders and email history']),
        RULE('leads', 'Every lead gets a next step', ['Fewer lost leads'], ['Respond to new leads within a set time', 'Give every lead a next-contact date', 'Review the pipeline weekly'])
      ]),
    TASK('listings', 'Listing details & marketing flyers', ['realestate', 'str'], 'Medium', 'weekly', 60,
      ['listings', 'flyers', 'property details', 'brochure', 'descriptions', 'photos'],
      [
        TPL('listings', 'Listing data sheet feeding a flyer template', 0.4, ['One row per property with all details', 'Flyer template that pulls details by ID', 'A checklist for required details']),
        M('listings-merge', 'merge', 'Word mail merge flyers from the listing sheet', 0.4, ['Reuses one designed template'], ['Needs desktop Word', 'Photos still placed by hand'], ['Add merge fields to a flyer template', 'Link the listing sheet', 'Produce one test flyer']),
        RULE('listings', 'Listing checklist', ['Fewer missing details'], ['List what every listing must include', 'Second person checks before publishing', 'Keep photos in one folder per property'])
      ]),
    TASK('rent', 'Rent collection & arrears follow-up', ['landlord'], 'High', 'monthly', 60,
      ['rent', 'arrears', 'late rent', 'tenants', 'rent roll', 'payments'],
      [
        TOOL('rent-tool', 'RentalTracker', 0.5, ['Tracks rent, expenses, tenants and lease end dates for up to 20 properties', 'Excel + Google Sheets'], ['One-time cost', 'It is a tracker; it does not collect payments'],
          ['Read the Gumroad page to check it fits', 'Enter properties, tenants and rents', 'Record payments each month and review arrears']),
        TPL('rent', 'Rent roll with paid dates', 0.45, ['Tenants down, months across', 'Enter paid dates; highlight late ones', 'Total due vs received']),
        CLOUD('rent', 'Property management software with online rent collection', 0.75, ['Tenants pay online; late payments are flagged']),
        RULE('rent', 'Fixed due date and arrears steps', ['Earlier follow-up'], ['Same due date for all leases where possible', 'Check payments the day after', 'Write the reminder sequence once'])
      ]),
    TASK('maint', 'Maintenance requests', ['landlord', 'str'], 'Medium', 'weekly', 30,
      ['maintenance', 'repairs', 'work orders', 'requests', 'tenant issues', 'contractors'],
      [
        FORM('maint', 'Google Form for tenant/guest repair requests', 0.5, 'property, issue, urgency, photos link, access times'),
        TPL('maint', 'Repair log with status and cost', 0.35, ['Date, property, issue, contractor, status, cost', 'Highlight open requests older than 7 days', 'Cost per property per year']),
        CLOUD('maint', 'Property management software with maintenance tracking', 0.65, ['Requests, contractors and updates in one place']),
        RULE('maint', 'Urgency levels and response times', ['Faster, fairer responses'], ['Define urgent / soon / routine', 'Agree response times', 'Keep a list of trusted contractors'])
      ]),
    TASK('propincome', 'Income & expenses per property', ['landlord', 'str', 'realestate'], 'High', 'monthly', 60,
      ['rental income', 'property expenses', 'noi', 'cash flow', 'per property', 'schedule e'],
      [
        TOOL('propincome-tool', 'RentalTracker', 0.6, ['NOI and cash flow per property; rent, expenses and tenants for up to 20 properties'], ['One-time cost'],
          ['Read the Gumroad page', 'Enter each property and its expenses', 'Review NOI and cash flow monthly']),
        TPL('propincome', 'Income/expense sheet with property column', 0.45, ['One row per transaction with a property column', 'Pivot by property and month', 'Compare with last year']),
        CLOUD('propincome', 'Accounting software with tracking by property', 0.7, ['Tag each transaction to a property']),
        RULE('propincome', 'Separate account per property (or clear tags)', ['Easier year-end'], ['Tag every transaction with a property', 'Keep receipts per property', 'Review monthly'])
      ], { countryKey: 'records' }),
    TASK('strcal', 'Bookings across platforms (one calendar)', ['str'], 'Medium', 'daily', 20,
      ['airbnb', 'bookings', 'double booking', 'calendar sync', 'channel manager', 'availability'],
      [
        TPL('strcal', 'Booking register with overlap check', 0.35, ['One row per booking: platform, dates, guests', 'A dates × unit grid that flags overlaps', 'Check every morning']),
        CLOUD('strcal', 'Channel manager / vacation rental software', 0.7, ['Keeps availability in sync across platforms']),
        RULE('strcal', 'Block dates on other platforms immediately', ['Fewer double bookings'], ['List all booking channels', 'Block dates elsewhere as soon as a booking arrives', 'Check calendars twice a day'])
      ]),
    TASK('turnover', 'Cleaning & turnover checklists', ['str', 'cleaning'], 'Medium', 'daily', 15,
      ['turnover', 'cleaning checklist', 'changeover', 'linen', 'restock', 'inspection'],
      [
        FORM('turnover', 'Google Form turnover checklist', 0.5, 'unit, date, cleaner, checklist items, restocked items, damage notes'),
        TPL('turnover', 'Checklist sheet per unit', 0.3, ['Checklist items down, dates across', 'Restock list with par levels', 'Monthly issue log']),
        RULE('turnover', 'Same checklist every time', ['Consistent standards'], ['Write the checklist with photos of "done right"', 'Inspect randomly', 'Update the list after issues'])
      ]),
    TASK('guestmsg', 'Guest messages (check-in, house rules)', ['str'], 'High', 'daily', 15,
      ['guest messages', 'check-in instructions', 'house rules', 'welcome', 'wifi'],
      [ TXT('guestmsg', 'Message templates', 0.5, 'booking thanks, check-in instructions, checkout reminder'),
        RULE('guestmsg', 'Welcome guide', ['Fewer questions'], ['Write a one-page welcome guide', 'Send it at a fixed time before arrival', 'Update it after common questions']) ]),

    /* ===== Professional ===== */
    TASK('projects', 'Projects & deadlines', ['agency', 'it', 'consultant', 'photo', 'events', 'law', 'accounting'], 'Medium', 'weekly', 45,
      ['projects', 'deadlines', 'tasks', 'matters', 'deliverables', 'workload'],
      [
        TPL('projects', 'Project list with due dates and status', 0.4, ['Client, project, owner, due date, status', 'Highlight due within 7 days', 'Weekly review view']),
        CLOUD('projects', 'Project management software', 0.6, ['Tasks, deadlines and files in one place']),
        RULE('projects', 'Weekly planning slot', ['Fewer missed deadlines'], ['Review all projects at the same time weekly', 'Every task has an owner and date', 'Agree how changes are recorded'])
      ]),
    TASK('timetrack', 'Time tracking & billable hours', ['agency', 'it', 'consultant', 'law', 'accounting'], 'Medium', 'daily', 10,
      ['time tracking', 'billable hours', 'timesheet', 'hourly', 'utilisation', 'utilization'],
      [
        TPL('timetrack', 'Time log with client totals', 0.5, ['Date, client, task, hours', 'Pivot by client per month', 'Multiply by rates for invoicing']),
        CLOUD('timetrack', 'Time-tracking software', 0.7, ['Start/stop timers; hours flow into invoices']),
        RULE('timetrack', 'Log time at the end of each day', ['Fewer lost hours'], ['Agree client/task categories', '5 minutes at the end of each day', 'Review before invoicing'])
      ]),
    TASK('docs', 'Collecting documents from clients', ['accounting', 'law', 'insurance', 'realestate', 'landlord'], 'Medium', 'weekly', 45,
      ['documents', 'paperwork', 'checklist', 'missing documents', 'chasing clients', 'year end'],
      [
        TPL('docs', 'Client × document checklist', 0.4, ['Clients down, documents across', 'Enter received dates; highlight missing items past the deadline', 'Send reminders from the list']),
        M('docs-pacloud', 'pacloud', 'Power Automate cloud flow: reminders for missing documents', 0.6, ['Reminders go out automatically'], ['Needs a Microsoft 365 work/school account'], ['Keep the checklist in an Excel table on OneDrive', 'Create a scheduled flow for missing items', 'Test on yourself']),
        CLOUD('docs', 'Client portal / document request service', 0.7, ['Clients upload directly; you see what is missing']),
        RULE('docs', 'Standard document list and deadline', ['Fewer chasers'], ['Send one standard list per client type', 'Set a clear deadline', 'Agree how files should be named'])
      ]),
    TASK('renewals', 'Renewals & deadline tracking', ['insurance', 'accounting', 'law', 'it', 'landlord'], 'High', 'weekly', 30,
      ['renewals', 'deadlines', 'expiry', 'lease end', 'domain renewal', 'policy renewal', 'filing deadlines'],
      [
        TPL('renewals', 'Deadline list with days remaining', 0.5, ['Client/item, deadline, owner, status', 'Days remaining with a formula; colour under 30 days', 'Monday review']),
        M('renewals-gas', 'gas', 'Apps Script: morning email of upcoming deadlines', 0.65, ['You do not need to check the sheet'], ['Someone needs to write and maintain the script'], ['Keep the list in Google Sheets', 'Script "due in 30 days"', 'Email yourself daily']),
        M('renewals-pacloud', 'pacloud', 'Power Automate cloud flow: deadline reminders', 0.6, ['Works with Outlook and Excel'], ['Needs a Microsoft 365 work/school account'], ['Excel table on OneDrive', 'Scheduled flow for upcoming rows', 'Test on yourself']),
        RULE('renewals', 'Calendar every deadline when it is created', ['Simple and immediate'], ['Add each deadline to a shared calendar', 'Set two reminders', 'Monthly cross-check'])
      ]),
    TASK('bankdata', 'Client bank statements into spreadsheets', ['accounting'], 'High', 'monthly', 120,
      ['bank statements', 'pdf statements', 'bookkeeping', 'client data', 'transactions'],
      [
        TOOL('bankdata-tool', 'PDF2Excel', 0.65, ['Converts text-based PDF statements to Excel, offline (no upload)'], ['One-time cost', 'Scanned statements are not supported'],
          ['Try the demo', 'Convert one client statement', 'Check totals against the PDF', 'Use the column setting if columns shift']),
        TOOL('bankdata-tool2', 'DataClean', 0.3, ['Tidy dates and text in exported transaction lists'], ['One-time cost'], ['Try the demo', 'Clean the converted file', 'Review flagged cells']),
        RULE('bankdata', 'Ask clients for CSV exports', ['Removes conversion work'], ['Show clients how to download CSV', 'Set a monthly deadline', 'One folder per client per month'])
      ]),
    TASK('secrets', 'Checking projects for leaked API keys', ['it'], 'Medium', 'monthly', 30,
      ['api keys', 'secrets', 'tokens', 'passwords in code', 'security review', 'git'],
      [
        TOOL('secrets-tool', 'KeyScan', 0.6, ['Finds API keys, tokens and hard-coded passwords in a folder, with file and line'], ['One-time cost'],
          ['Try the demo', 'Scan a project folder before sharing or publishing', 'Rotate any real key it finds']),
        RULE('secrets', 'Keep secrets out of code', ['Fewer leaks'], ['Use environment variables', 'Add secret files to .gitignore', 'Rotate keys when people leave'])
      ]),

    /* ===== Other specific ===== */
    TASK('orders', 'Online orders → shipping labels', ['ecommerce', 'farm', 'retail'], 'High', 'daily', 20,
      ['orders', 'shipping', 'labels', 'fulfilment', 'fulfillment', 'packing', 'dispatch notes'],
      [
        TOOL('orders-tool', 'LabelMaker', 0.5, ['Address labels from your order export'], ['One-time cost', 'It does not create carrier postage labels'],
          ['Try the demo', 'Export today\'s orders (name, address)', 'Test-print on plain paper, then print']),
        TPL('orders', 'Reformat the export for your carrier\'s CSV import', 0.45, ['Check your carrier supports CSV import', 'Map columns in a sheet', 'Save as CSV and import']),
        CLOUD('orders', 'Shipping software connected to your store', 0.75, ['Orders flow in; postage labels print in batches']),
        RULE('orders', 'Fixed packing time', ['Fewer mistakes'], ['Pack once or twice a day at fixed times', 'Use a packing checklist', 'Mark orders shipped the same day'])
      ]),
    TASK('catalog', 'Product catalogue & price list updates', ['ecommerce', 'retail'], 'High', 'monthly', 60,
      ['catalog', 'catalogue', 'product data', 'prices', 'price list', 'sku', 'bulk edit'],
      [
        TOOL('catalog-tool', 'DiffCheck', 0.5, ['See exactly which products/prices changed between two files'], ['One-time cost'], ['Read the Gumroad page', 'Compare supplier price lists old vs new', 'Apply only the changes']),
        TOOL('catalog-tool2', 'DataClean', 0.4, ['Tidy product data before bulk upload'], ['One-time cost'], ['Try the demo', 'Clean the export', 'Re-import after checking']),
        TPL('catalog', 'Bulk edit in a spreadsheet', 0.4, ['Export products as CSV', 'Edit prices with formulas', 'Import back (test with a few first)']),
        RULE('catalog', 'One master product sheet', ['Fewer mismatches'], ['Keep one master file', 'Date every price change', 'Update all channels from it'])
      ]),
    TASK('vehicle', 'Vehicle service history', ['auto'], 'Medium', 'daily', 20,
      ['service history', 'vehicle records', 'registration', 'job card', 'parts used'],
      [
        TPL('vehicle', 'Service history sheet searchable by registration', 0.45, ['Registration, customer, date, work, parts, mileage', 'Search box by registration', 'Next service due date formula']),
        FORM('vehicle', 'Google Form job card', 0.35, 'registration, work done, parts, mileage, technician'),
        CLOUD('vehicle', 'Garage management software', 0.7, ['Job cards, history, invoices and reminders together']),
        RULE('vehicle', 'Job card for every job', ['Complete history'], ['Same job card fields', 'Filled in by the technician', 'Office checks daily'])
      ]),
    TASK('routes', 'Route sheets & proof of delivery', ['courier', 'moving', 'foodtruck'], 'Medium', 'daily', 30,
      ['routes', 'delivery', 'drops', 'proof of delivery', 'pod', 'driver sheet', 'locations'],
      [
        TPL('routes', 'Route sheet: stops per vehicle with totals', 0.4, ['Stops with time windows', 'Assign vehicles and count stops/weight', 'Print or share per driver']),
        FORM('routes', 'Google Form proof of delivery', 0.45, 'stop, time, received by, photo link, notes'),
        CLOUD('routes', 'Route planning / delivery software', 0.7, ['Suggests stop order and records proof of delivery']),
        RULE('routes', 'Cut-off and next-day plan', ['Fewer changes'], ['Fix an order cut-off', 'Plan routes at a set time', 'Drivers report issues the same day'])
      ]),
    TASK('harvest', 'Harvest, sales & market log', ['farm', 'foodtruck'], 'High', 'daily', 20,
      ['harvest', 'market sales', 'produce', 'yield', 'stall', 'farmers market', 'csa boxes'],
      [
        FORM('harvest', 'Google Form log on the phone', 0.45, 'date, crop/product, quantity, where sold, amount'),
        TOOL('harvest-tool', 'DataLens', 0.5, ['Totals by product, market and month with charts'], ['One-time cost'], ['Try the demo', 'Export the log', 'Summarise by product and market']),
        TPL('harvest', 'Log sheet with pivot summary', 0.4, ['One row per sale or harvest', 'Pivot by product and month', 'Compare seasons']),
        RULE('harvest', 'Log the same day', ['Better season records'], ['Keep the form short', 'Log at the end of each market day', 'Review monthly'])
      ]),
    TASK('progress', 'Student progress notes & reports', ['tutoring', 'childcare', 'studio'], 'Medium', 'weekly', 45,
      ['progress', 'reports', 'student notes', 'parent reports', 'assessment', 'lesson notes'],
      [
        FORM('progress', 'Google Form lesson notes', 0.45, 'student ID, date, topic, progress, next steps'),
        M('progress-merge', 'merge', 'Word mail merge progress reports', 0.45, ['One template, many reports'], ['Needs desktop Word'], ['Summarise notes per student in a sheet', 'Add merge fields to a report template', 'Print one test']),
        TPL('progress', 'Notes sheet per student', 0.3, ['One row per lesson', 'Filter by student', 'Termly summary column']),
        RULE('progress', 'Two-minute note after each lesson', ['Reports write themselves'], ['Fixed note format', 'Write it straight after the lesson', 'Review before parent meetings'])
      ])
  ];

  /* ---------- Popular per industry (static; no usage data yet) ---------- */
  var COMMON_POP = ['invoice', 'expenses', 'payroll', 'taxprep', 'replies', 'reports', 'clientlist', 'phishing'];
  var TRADE_POP = ['quote', 'dispatch', 'invoice', 'jobsheet', 'jobphotos', 'materials', 'reviews', 'mileage'];
  var POPULAR = {
    office: COMMON_POP, other: COMMON_POP,
    plumbing: TRADE_POP, electrical: TRADE_POP, handyman: TRADE_POP, roofing: TRADE_POP, painting: TRADE_POP,
    hvac: ['quote', 'dispatch', 'recurring', 'invoice', 'jobsheet', 'jobphotos', 'reviews'],
    contractor: ['quote', 'dispatch', 'subs', 'jobphotos', 'invoice', 'materials', 'leads'],
    landscaping: ['quote', 'dispatch', 'recurring', 'invoice', 'jobphotos', 'mileage'],
    cleaning: ['quote', 'dispatch', 'rota', 'turnover', 'invoice', 'jobsheet', 'reviews'],
    pest: ['quote', 'dispatch', 'recurring', 'jobsheet', 'invoice', 'mileage'],
    restaurant: ['rota', 'stock', 'dailysales', 'reviews', 'payroll', 'repeat'],
    foodtruck: ['dailysales', 'stock', 'routes', 'rota', 'harvest', 'taxprep'],
    retail: ['stock', 'dailysales', 'rota', 'repeat', 'catalog', 'reviews'],
    ecommerce: ['orders', 'stock', 'catalog', 'repeat', 'dailysales', 'reviews', 'taxprep'],
    farm: ['harvest', 'dailysales', 'stock', 'orders', 'invoice', 'mileage'],
    salon: ['booking', 'clientcard', 'rota', 'stock', 'repeat', 'reviews', 'recurring'],
    barber: ['booking', 'clientcard', 'dailysales', 'repeat', 'reviews'],
    fitness: ['members', 'booking', 'attendance', 'rota', 'newsletter', 'clientcard'],
    studio: ['members', 'attendance', 'booking', 'newsletter', 'progress'],
    pet: ['booking', 'clientcard', 'recurring', 'stock', 'reviews', 'intake'],
    photo: ['booking', 'quote', 'projects', 'intake', 'invoice', 'reviews'],
    events: ['quote', 'guests', 'subs', 'volunteers', 'projects', 'invoice'],
    health: ['booking', 'rota', 'intake', 'clientcard', 'invoice', 'replies'],
    childcare: ['attendance', 'members', 'newsletter', 'intake', 'rota', 'progress'],
    tutoring: ['booking', 'members', 'attendance', 'progress', 'newsletter', 'intake'],
    realestate: ['leads', 'listings', 'docs', 'replies', 'mileage', 'propincome'],
    landlord: ['rent', 'maint', 'propincome', 'renewals', 'newsletter', 'docs'],
    str: ['strcal', 'turnover', 'guestmsg', 'reviews', 'propincome', 'maint'],
    accounting: ['docs', 'bankdata', 'renewals', 'timetrack', 'intake', 'projects'],
    law: ['intake', 'timetrack', 'docs', 'renewals', 'projects', 'invoice'],
    insurance: ['renewals', 'leads', 'docs', 'intake', 'replies'],
    agency: ['projects', 'timetrack', 'quote', 'invoice', 'subs', 'intake'],
    it: ['projects', 'timetrack', 'quote', 'renewals', 'invoice', 'secrets'],
    consultant: ['intake', 'projects', 'timetrack', 'quote', 'invoice', 'leads'],
    auto: ['booking', 'vehicle', 'quote', 'materials', 'recurring', 'reviews'],
    moving: ['quote', 'dispatch', 'routes', 'rota', 'invoice', 'mileage'],
    courier: ['routes', 'dispatch', 'rota', 'mileage', 'invoice'],
    nonprofit: ['donors', 'members', 'newsletter', 'volunteers', 'attendance', 'guests']
  };

  var DATA = {
    CHECKED: CHECKED, SOURCES: SOURCES, COUNTRIES: COUNTRIES, TYPES: TYPES, COST_LABEL: COST_LABEL, DIFF_LABEL: DIFF_LABEL,
    PRODUCTS: PRODUCTS, BUNDLES: BUNDLES, FREE_TOOLS: FREE_TOOLS, CATS: CATS, INDUSTRIES: INDUSTRIES, IND_NOTES: IND_NOTES, TASKS: TASKS, POPULAR: POPULAR
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.DX_DATA = DATA;
})(typeof window !== 'undefined' ? window : this);
