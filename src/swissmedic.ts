import * as fs from 'fs';
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import fetch from 'node-fetch';

export type SwissmedicListRecord = {
  url: string | null;
  title: string | null;
  date: string;
  dateOrder: string;
}

export type SwissmedicDetail = {
  title: string;
  dateDoc: string;
  desc: string;
  pdf: string | null,
  prep: Array<{
    prop: string;
    field: string;
  }>;
}

export async function main(options: { 
  chargenrueckrufeDe: {outputPath: string}, 
  chargenrueckrufeFr: {outputPath: string},
  DHPC_HPC_De: {outputPath: string},
  DHPC_HPC_Fr: {outputPath: string},
}) {
  {
    console.log('Fetching Chargenrueckrufe De');
    const outputPath = options.chargenrueckrufeDe.outputPath;
    await scrapeFilteredIndexAndDetail(
      'https://www.swissmedic.ch/swissmedic/de/home/humanarzneimittel/marktueberwachung/qualitaetsmaengel-und-chargenrueckrufe/chargenrueckrufe.html', 
      outputPath
    );
    console.log(`Done`);
  }
  {
    console.log('Fetching Chargenrueckrufe Fr');
    const outputPath = options.chargenrueckrufeFr.outputPath;
    await scrapeFilteredIndexAndDetail(
      'https://www.swissmedic.ch/swissmedic/fr/home/humanarzneimittel/marktueberwachung/qualitaetsmaengel-und-chargenrueckrufe/chargenrueckrufe.html', 
      outputPath
    );
    console.log(`Done`);
  }
  {
    console.log('Fetching dhpc_hpc_de');
    const outputPath = options.DHPC_HPC_De.outputPath;
    await scrapeFilteredIndexAndDetail(
      'https://www.swissmedic.ch/swissmedic/de/home/humanarzneimittel/marktueberwachung/health-professional-communication--hpc-.html', 
      outputPath
    );
    console.log(`Done`);
  }
  {
    console.log('Fetching dhpc_hpc_fr');
    const outputPath = options.DHPC_HPC_Fr.outputPath;
    await scrapeFilteredIndexAndDetail(
      'https://www.swissmedic.ch/swissmedic/fr/home/humanarzneimittel/marktueberwachung/health-professional-communication--hpc-.html', 
      outputPath
    );
    console.log(`Done`);
  }
}

async function scrapeFilteredIndexAndDetail(url: string, outputPath: string) {
  const chargenrueckrufeDe = await scrape(url);
  const filtered = chargenrueckrufeDe.filter(filterNews);
  console.log(`Received ${filtered.length} items`);
  const urls = filtered.map(i => i.url).filter((u): u is string => u !== null);
  const details = await scrapeDetails(urls);
  const merged = filtered.map(item => ({
    ...item,
    ...(details[item.url ?? ''] ?? {})
  }));
  console.log(`Writing to file: ${outputPath}`);
  await fs.promises.writeFile(outputPath, JSON.stringify(merged));
}

async function scrape(url: string): Promise<SwissmedicListRecord[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox', 
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1280,
    height: 720
  });
  await page.goto(url, {
    waitUntil: 'load'
  });
  await page.waitForSelector('#content');
  const pageNumbers = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[data-loadpage]'))
      .map(a => a.getAttribute('data-loadpage'))
      .filter((e)=> e !== null)
      .filter((x, i, a) => a.indexOf(x) == i);
  });

  var result: SwissmedicListRecord[] = [];
  var pageTimeoutted = false;

  while (true) {
    const items = await page.evaluate((url) => {
      const rows = Array.from(document.querySelectorAll('#content .row .col-sm-12 .mod-teaser'));
      return rows.map((row): SwissmedicListRecord => {
        const href = row.querySelector('a')?.getAttribute('href');
        const absoluteURL = href ? new URL(href, url).toString() : null;
        return {
          url: absoluteURL,
          title: row.querySelector('a')?.innerText ?? null,
          date: (row.querySelector('.teaserDate') as HTMLElement)?.innerText?.replace(/\./g,'/'),
          dateOrder: (row.querySelector('.teaserDate') as HTMLElement)?.innerText?.split('.')?.reverse()?.join('/')
        }
      });
    }, url);

    result = result.concat(items);
    const nextPageNumber = pageNumbers.shift();
    if (nextPageNumber === undefined) {
      break;
    }
    console.log(`Navigating to page ${nextPageNumber}`);
    await page.click('a[data-loadpage="' + nextPageNumber + '"]');

    const startedNavigation = Date.now();
    while (true) {
      // Wait for the page to be navigated
      const selectedPageNumber = await page.$eval('li.active a[href="#"]', 
        a => (a as HTMLElement).innerText.replace(/\D/g, '')
      );
      if (selectedPageNumber === nextPageNumber) {
        break;
      }
      if (Date.now() - startedNavigation > 5000) {
        // timeout
        pageTimeoutted = true;
        break;
      }
      await new Promise(r => setTimeout(()=> r(0), 500));
    }
    if (pageTimeoutted) {
      break;
    }
  }
  await browser.close();
  return result;
}

function filterNews(news: SwissmedicListRecord): boolean {
  const exclude = [
    "KPA Breakout Session – Präsentationen", 
    "Newsdienste – Newsletter abonnieren",
    "Services Services d'information – Newsletters, flux RSS"
  ];
  if (news.title !== null && exclude.indexOf(news.title) === -1) {
    return true;
  }
  return false;
}

async function scrapeDetails(urls: string[]): Promise<{[key:string]: SwissmedicDetail}> {
  const results: {[key:string]: SwissmedicDetail} = {};
  for (const url of urls) {
    console.log('Fetching', url);
    const response = await fetch(url);
    const $ = cheerio.load(await response.text());
    const pdfURL = $('#content .mod-download a').attr('href');
    const absolutePdfURL = pdfURL !== undefined ? new URL(pdfURL, url).toString() : null;
    const result = {
      title: $('.mod h1').text(),
      dateDoc: $('.mod-headline h5').text(),
      desc: trimLines($('.mod-text article').text()),
      pdf: absolutePdfURL ?? null,
      prep: $('.table-simple tr').toArray().map(element => ({
        prop: $(element).find(':nth-child(1)').text().trim(),
        field: $(element).find(':nth-child(2)').text().trim(),
      }))
    };
    results[url] = result;
  }
  return results;
}

function extractTextFromPage(page: puppeteer.Page , selector: string): Promise<string> {
  return page.$eval(selector, a => (a as HTMLElement).innerText);
}

function trimLines(lines: string): string {
  return lines.split('\n').map(s => s.trim()).filter(s => s.length > 0).join('\n');
}