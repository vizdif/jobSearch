const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const URL = 'https://builtin.com/companies/type/healthtech-companies/size/51-200/201-500/501-1000/1000?country=USA';
const OUTPUT_PATH = 'builtinCompanies.csv';

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    );

    // Determine the number of pages
    await page.goto(URL, { waitUntil: 'load', timeout: 0 });
    const maxPageNum = await page.evaluate(() => {
        const nodes = document.querySelectorAll('a.page-link.border.rounded.fw-bold.border-0[aria-label^="Go to page"]');
        if (nodes.length > 0) {
            return parseInt(nodes[nodes.length - 1].textContent.trim(), 10);
        }
        return 1; // Default to 1 if no pagination found
    });

    console.log(`Found ${maxPageNum} pages.`);

    // Function to scrape company data from a single page
    const scrapePage = async (pageNum) => {
        const page = await browser.newPage();
        await page.goto(`${URL}&page=${pageNum}`, { waitUntil: 'load', timeout: 0 });

        const pageCompanies = await page.evaluate(() => {
            const companyElements = document.querySelectorAll('h2.fw-extrabold.fs-xl.hover-underline.d-inline-block.company-title-clamp.mb-0');
            return Array.from(companyElements).map(element => element.innerText.trim());
        });

        console.log(`Scraped ${pageCompanies.length} companies from page ${pageNum}`);
        await page.close();
        return pageCompanies;
    };

    // Scrape all pages in parallel
    const pageNumbers = Array.from({ length: maxPageNum }, (_, i) => i + 1);
    const companiesPerPage = await Promise.all(pageNumbers.map(scrapePage));
    const companies = companiesPerPage.flat();

    console.log('Total companies extracted (before deduplication):', companies.length);

    // Remove duplicates
    const uniqueCompanies = [...new Set(companies)];
    console.log('Total unique companies extracted:', uniqueCompanies.length);

    // Write unique companies to CSV
    const csvContent = 'Company Name\n' + uniqueCompanies.map(name => `"${name}"`).join('\n');
    const outputPath = path.resolve(__dirname, OUTPUT_PATH);
    fs.writeFileSync(outputPath, csvContent);

    console.log(`Unique companies saved to ${outputPath}`);
    await browser.close();
})();
