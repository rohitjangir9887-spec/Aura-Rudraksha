const puppeteer = require('puppeteer');
const { exec } = require('child_process');

(async () => {
  // Start prod server on 3001
  const server = exec('PORT=3001 node dist/server.cjs');
  await new Promise(r => setTimeout(r, 4000));

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => { if (msg.type() === 'error') console.log('PROD_BROWSER_ERR:', msg.text()); });
  page.on('pageerror', error => console.log('PROD_PAGE_ERR:', error.message));

  await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
  const text = await page.evaluate(() => document.body.innerText.slice(0, 100));
  console.log("Prod Result:", text.replace(/\n/g, ' '));
  
  await browser.close();
  server.kill();
})();
