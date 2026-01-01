const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const URL =
  'https://builtin.com/companies/type/adtech-companies/biotech-companies/edtech-companies/fintech-companies/greentech-companies/healthtech-companies/hr-tech-companies/information-technology-companies/legal-tech-companies/marketing-tech-companies/size/1-10/11-50/51-200/201-500/501-1000/1000?country=USA';

const OUTPUT_PATH = 'techCompanies.csv';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
  );

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 0 });

  // ---- determine max page safely ----
  const maxPageNum = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[aria-label^="Go to page"]')];
    const nums = links
      .map(a => parseInt(a.textContent.trim(), 10))
      .filter(n => !isNaN(n));
    return nums.length ? Math.max(...nums) : 1;
  });

  console.log(`Found ${maxPageNum} pages`);

  const scrapePage = async (pageNum) => {
    const p = await browser.newPage();
    await p.goto(`${URL}&page=${pageNum}`, {
      waitUntil: 'networkidle2',
      timeout: 0
    });

    const companies = await p.evaluate(() => {
      return [...document.querySelectorAll('a.company-card-overlay')]
        .map(a => {
          const href = a.getAttribute('href'); // /company/motive
          if (!href || !href.startsWith('/company/')) return null;

          const slug = href.replace('/company/', '').trim();
          return slug;
        })
        .filter(Boolean);
    });

    console.log(`Page ${pageNum}: ${companies.length} companies`);
    await p.close();
    return companies;
  };

  const pageNumbers = Array.from({ length: maxPageNum }, (_, i) => i + 1);
  const results = await Promise.all(pageNumbers.map(scrapePage));
  const allCompanies = results.flat();

  console.log('Total extracted:', allCompanies.length);

  const uniqueCompanies = [...new Set(allCompanies)];
  console.log('Unique companies:', uniqueCompanies.length);

  const csv =
    'company_slug\n' + uniqueCompanies.map(c => `"${c}"`).join('\n');

  const outputPath = path.resolve(__dirname, OUTPUT_PATH);
  fs.writeFileSync(outputPath, csv);

  console.log(`Saved → ${outputPath}`);
  await browser.close();
})();
