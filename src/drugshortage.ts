import * as fs from 'fs';
import cheerio from 'cheerio';
import fetch from 'node-fetch';

// Cheerio doesn't seems to export type so we have to hack around it
type Cheerio = ReturnType<typeof cheerio.load>;

type Drugshortage = {
  id: number;
  bezeichnung: string;
  detailsLink: string;
  gtin: number;
  pharmacode: number;
  firma: string;
  datumLetzteMutation: string;
  tageSeitErsterMeldung: number;
  status: string;
  datumLieferfahigkeit: string;
  company: Company | {};
  colorCode: Colour | {};
};

type Company = {
  Bewertung: number;
  Firma: string;
  'Anzahl registrierte Produkte Total': number;
  'Anzahl offene Engpässe': number;
};

type Colour = {
  '#': number;
  'Bewertung': string;
  'Art der Meldung': string;
}

const rootURL = 'https://drugshortage.ch/';

export async function main(options: { outputPath: string }) {
  console.log('Running Drugshortage');
  const outputPath = options.outputPath;
  const drugshortage = await scrape();
  console.log(`Writing to file: ${outputPath}`);
  await fs.promises.writeFile(outputPath, JSON.stringify(drugshortage));
  console.log(`Done`);
}

export async function scrape(): Promise<Drugshortage[]> {
  console.log('Fetching Drugshortage');
  const response = await fetch(`${rootURL}UebersichtaktuelleLieferengpaesse2.aspx`);
  console.log('Fetched Drugshortage');
  const $ = cheerio.load(await response.text());

  const companies = extractCompanyTable($);
  const companyByName: {[key: string]: Company} = companies.reduce((acc, company)=> ({...acc, [company.Firma]: company}), {});
  console.log(`Found ${companies.length} companies`);

  const colours = extractColourTable($);
  const colourByNumber: {[key: number]: Colour} = colours.reduce((acc, colour)=> ({...acc, [colour['#']]: colour}), {});
  console.log(`Found ${colours.length} colours`);

  console.log('Generating drugshortages');
  const drugshortages = $('#GridView1 > tbody > tr')
    .toArray()
    .slice(1) // drop table head
    .map((element, index): Drugshortage => {
      const data = {
        id: index,
        bezeichnung: $(element).find('td:nth-child(1)').text(),
        detailsLink: rootURL + $(element).find('td:nth-child(1) a').attr('href'),
        datumLieferfahigkeit: $(element).find('td:nth-child(2)').text(),
        status: $(element).find('td:nth-child(4)').text(),
        datumLetzteMutation: $(element).find('td:nth-child(5)').text(),
        firma: $(element).find('td:nth-child(6)').text(),
        gtin: parseInt($(element).find('td:nth-child(7)').text()),
        pharmacode: parseInt($(element).find('td:nth-child(8)').text()),
        tageSeitErsterMeldung: parseInt($(element).find('td:nth-child(9)').text()),
      };

      if (!(data.firma in companyByName)) {
        console.warn('Cannot find company', data.firma);
      }
      const company = companyByName[data.firma] ?? {};
      if (!(company.Bewertung in colourByNumber)) {
        console.warn('Cannot find colour', company.Bewertung, data.firma);
      }
      const colour = colourByNumber[company.Bewertung] ?? {};
      return {
        ...data,
        company,
        colorCode: colour
      };
    }
  );
  return drugshortages;
}

function extractCompanyTable($: Cheerio): Company[] {
  const rows = $('#GridView2 > tbody > tr');
  const companies = rows
    .toArray()
    .slice(1) // Skip table head
    .map((row): Company => ({
      Bewertung: parseInt($(row).find('td:nth-child(1)').text()),
      Firma: $(row).find('td:nth-child(2)').text(),
      'Anzahl registrierte Produkte Total': parseInt($(row).find('td:nth-child(3)').text()),
      'Anzahl offene Engpässe': parseInt($(row).find('td:nth-child(4)').text()),
    })
  );
  return companies;
}

function extractColourTable($: Cheerio): Colour[] {
  const rows = $('#GridView5 > tbody > tr');
  const colours = rows
    .toArray()
    .slice(1) // Skip table head
    .map((row): Colour => ({
      '#': parseInt($(row).find('td:nth-child(1)').text()),
      'Bewertung': $(row).find('td:nth-child(2)').text(),
      'Art der Meldung': $(row).find('td:nth-child(3)').text(),
    })
  );
  return colours;
}
