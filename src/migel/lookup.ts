import fetch from 'node-fetch';
import cheerio from 'cheerio';
import { Config } from '../migel';

export type LookupResult = {
  headers: string[];
  rows: string[][];
}

export async function lookupArtikels(config: Config, positionNumber: string): Promise<LookupResult | null> {
  const url = config['lookup-url'].replace('{{positionNumber}}', positionNumber.replace(/\./g, ''));
  console.log('Fetching', url);
  const response = await fetch(url);
  console.log('Fetched');
  const $ = cheerio.load(await response.text());

  const tdsOfTheGoodTable = $('table td:first-child').toArray().filter(e => $(e).text() === 'Pharmacode');
  if (tdsOfTheGoodTable.length > 1) {
    // console.warn('More than one good table', positionNumber);
  } else if (tdsOfTheGoodTable.length === 0) {
    console.warn('No table found');
    return null;
  }
  const tbodies = tdsOfTheGoodTable.map(e => e.parent.parent);
  let rows: string[][] = [];
  let headers: string[] | null = null;

  for (const tbody of tbodies) {
    const trs = $(tbody).find('tr').toArray();
    const [first, ...restTrs] = trs;
    headers = trToStrings(first as cheerio.TagElement, $);
    const r = restTrs.map(tr => trToStrings(tr as cheerio.TagElement, $));
    rows = rows.concat(r);
  }
  if (headers === null) {
    console.warn('Cannot find header in table');
    return null;
  }
  return {
    rows, headers
  };
}

function trToStrings(tr: cheerio.TagElement, $: cheerio.Root): string[] {
  return tr.children.map(td => $(td).text().trim());
}