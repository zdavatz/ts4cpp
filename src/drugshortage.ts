import * as crypto from 'crypto';
import * as fs from 'fs';
import fetch from 'node-fetch';

type Drugshortage = {
  id: number;
  bezeichnung: string;
  detailsLink: string;
  gtin: number;
  pharmacode: number;
  firma: string;
  atc: string;
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
};

// Shape of https://www.drugshortage.ch/ds.php?a=engpaesse — same payload the
// homepage fetches client-side. Replaces the retired /api_engpaesse.php.
type ApiResponse = {
  engpaesse: ApiEngpass[];
  firmen: ApiFirma[];
  bewertungLegende: ApiBewertung[];
};

type ApiEngpass = {
  id: number;
  bezeichnung: string;
  firma: string;
  status: string;
  gtin: string;
  pharmacode: string;
  atc: string;
  tage: number;
  lieferdatum: string;
  mutation: string;
  bewertung: number;
};

type ApiFirma = {
  firma: string;
  bewertung: number;
  anzahlProdukte: number;
  anzahlEngpaesse: number;
};

type ApiBewertung = {
  ident: number;
  bewertung: string;
  artMeldung: string;
};

const BASE_URL = 'https://www.drugshortage.ch';
const API_URL = `${BASE_URL}/ds.php?a=engpaesse`;
const DETAIL_URL = `${BASE_URL}/index.php/detail-lieferengpass/?ID=`;

// HMAC secret is embedded verbatim in the homepage JS (ds-config / inline
// <script>). It's bot-deterrence, not auth — anyone fetching the homepage
// gets the same value — but we keep it out of source. Pull it from
// DRUGSHORTAGE_HMAC_SECRET (see .claude/settings.local.json for local dev).
const HMAC_SECRET = process.env.DRUGSHORTAGE_HMAC_SECRET;

function signHmac(apiName: string): { [k: string]: string } {
  if (!HMAC_SECRET) {
    throw new Error('DRUGSHORTAGE_HMAC_SECRET is not set (grab it from the inline <script> on https://www.drugshortage.ch/)');
  }
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 15);
  const msg = `${timestamp}|${nonce}|${apiName}`;
  const sig = crypto.createHmac('sha256', HMAC_SECRET).update(msg).digest('hex');
  return { 'X-Timestamp': timestamp, 'X-Nonce': nonce, 'X-Signature': sig };
}

export async function main(options: { outputPath: string }) {
  console.log('Running Drugshortage');
  const outputPath = options.outputPath;
  const drugshortage = await scrape();
  console.log(`Writing to file: ${outputPath}`);
  await fs.promises.writeFile(outputPath, JSON.stringify(drugshortage));
  console.log('Done');
}

export async function scrape(): Promise<Drugshortage[]> {
  console.log(`Fetching ${API_URL}`);
  const response = await fetch(API_URL, {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'ts4cpp/1.0 (+https://github.com/zdavatz/ts4cpp)',
      ...signHmac('api_engpaesse'),
    },
  });
  const data = (await response.json()) as ApiResponse;
  console.log(`Fetched ${data.engpaesse?.length ?? 0} engpaesse, ${data.firmen?.length ?? 0} firmen, ${data.bewertungLegende?.length ?? 0} legend entries`);

  const companyByName: { [key: string]: Company } = {};
  for (const f of data.firmen ?? []) {
    companyByName[f.firma] = {
      Bewertung: f.bewertung,
      Firma: f.firma,
      'Anzahl registrierte Produkte Total': f.anzahlProdukte,
      'Anzahl offene Engpässe': f.anzahlEngpaesse,
    };
  }

  const colourByNumber: { [key: number]: Colour } = {};
  for (const l of data.bewertungLegende ?? []) {
    colourByNumber[l.ident] = {
      '#': l.ident,
      Bewertung: l.bewertung,
      'Art der Meldung': l.artMeldung,
    };
  }

  return (data.engpaesse ?? []).map((e): Drugshortage => {
    if (!(e.firma in companyByName)) {
      console.warn('Cannot find company', e.firma);
    }
    if (!(e.bewertung in colourByNumber)) {
      console.warn('Cannot find colour', e.bewertung, e.firma);
    }
    return {
      id: e.id,
      bezeichnung: e.bezeichnung,
      detailsLink: DETAIL_URL + e.id,
      gtin: parseInt(e.gtin, 10),
      pharmacode: parseInt(e.pharmacode, 10),
      firma: e.firma,
      atc: e.atc,
      datumLetzteMutation: e.mutation,
      tageSeitErsterMeldung: e.tage,
      status: e.status,
      datumLieferfahigkeit: e.lieferdatum,
      company: companyByName[e.firma] ?? {},
      colorCode: colourByNumber[e.bewertung] ?? {},
    };
  });
}
