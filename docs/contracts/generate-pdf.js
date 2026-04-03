const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const htmlPath = path.resolve(__dirname, 'SOW_Sprint2.html');
  const url = 'file:///' + htmlPath.split(path.sep).join('/');
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: path.resolve(__dirname, 'SOW_Sprint2.pdf'),
    format: 'A4',
    margin: { top: '60px', bottom: '80px', left: '60px', right: '60px' },
    printBackground: true,
  });
  await browser.close();
  console.log('PDF created: SOW_Sprint2.pdf');
})();
