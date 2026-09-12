const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => { if (msg.type() === 'error') console.log('BROWSER_ERR:', msg.text()); });
  page.on('pageerror', error => console.log('PAGE_ERR:', error.message));

  for (const p of ['/', '/shop', '/admin', '/cart']) {
    console.log("Testing:", p);
    await page.goto(`http://localhost:3000${p}`, { waitUntil: 'networkidle0' }).catch(() => {});
    const text = await page.evaluate(() => document.body.innerText.slice(0, 50));
    console.log("Result:", text.replace(/\n/g, ' '));
  }
  
  await browser.close();
})();
