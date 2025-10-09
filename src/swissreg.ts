import * as fs from 'fs';
import Excel from 'exceljs';

type SearchResponse = {
  results: SearchResult[];
  totalItems: number;
  pageSize: number;
  metadataAsTransit: string;
};

type SearchResult = {
  id: string[];
  grundpatentid__type_long: string[];
  grundpatentnummer__type_string_ci: string[];
};

type CertificateResponse = {
  id: string;
  timestamp: string;
  schutztitelId: string;
  schutztitelnummer: string;
  eintragungsdatum: null;
  maximaleSchutzdauer: string;
  publikationsdatum: string;
  loeschdatum: string;
  grundpatent: {
    id: number;
    nummer: string;
    typ: string;
  };
  zulassungen: Array<{
    datum: string; //	"28.05.2009"
    nummer: string; //	"58271"
  }>,
  erteilungsdatum: string;
  schutzdauerbeginn: string;
};

type PatentResponse = {
  id: string;
  schutztitelnummer: string; //	"EP1427815"
  anmeldedatum: string; //	"11.09.2002"
}

type Certificate = {
  certificateNumber: string;
  issueDate: string;
  publicationDate: string;
  registrationDate: string;
  protectionDate: string;
  basePatentDate: string;
  basePatent: string;
  iksnrs: string[];
  expiryDate: string;
  deletionDate: string;
}

export type Output = { [key: string]: Certificate };

export async function main(options: { packagesXlsxPath: string, outputPath: string }) {
  const swissmedRegNumbers = await lookupSwissmedicRegNumbers(options.packagesXlsxPath);
  console.log('Number of Swissmed Reg Numbers:', swissmedRegNumbers.size);
  const certificates: Output = {};
  for (const swissmedRegNumber of swissmedRegNumbers) {
    const searchResults = await searchESZ(swissmedRegNumber);
    for (const r of searchResults) {
      const certId = r.id[0];
      if (certId === undefined) {
        continue;
      }
      const existingCert = certificates[certId];
      if (existingCert === undefined) {
        const cert = await readResource(certId);
        const patent = await readPatent(String(cert.grundpatent.id));

        const regnrs = new Set(cert.zulassungen.map(z => z.nummer.slice(0, 5)));
        certificates[certId] = {
          certificateNumber: cert.schutztitelnummer ?? '',
          issueDate: cert.erteilungsdatum ?? '',
          publicationDate: cert.publikationsdatum ?? '',
          registrationDate: cert.eintragungsdatum ?? '',
          protectionDate: cert.schutzdauerbeginn ?? '', //         => Date.new(1998, 8, 14),
          basePatentDate: patent.anmeldedatum ?? '', //        => Date.new(1978, 8, 14),
          basePatent: cert.grundpatent.nummer ?? patent.schutztitelnummer ?? '', //             => "CH644840",
          iksnrs: [...regnrs],
          expiryDate: cert.maximaleSchutzdauer ?? '',
          deletionDate: cert.loeschdatum ?? '',
        };
      } else {
        if (!existingCert.iksnrs.includes(swissmedRegNumber))
        existingCert.iksnrs.push(swissmedRegNumber);
      }
    }
  }
  await fs.promises.writeFile(options.outputPath, JSON.stringify(certificates));
  console.log(`Wrote ${Object.keys(certificates).length} certificates to swissreg.json`);
}

const eszSearchPageSize = 64;
async function searchESZ(searchString: string): Promise<SearchResult[]> {
  console.log('Searching ESZ:', searchString);
  const result: SearchResult[] = [];
  const res = await fetch("https://www.swissreg.ch/database/resources/query/search", {
    "headers": {
      "Accept": "application/json, text/plain, */*",
      "X-IPI-VERSION": "9.0.4",
      "Content-Type": "application/json",
    },
    "body": JSON.stringify({
      target: 'esz',
      searchString,
      filters: {},
      sortByField: 'score',
      sortOrder: 'DESC',
      pageSize: eszSearchPageSize
    }),
    "method": "POST"
  });
  const json: SearchResponse = await res.json();
  result.push(...json.results);
  let hasNextPage = json.results.length === eszSearchPageSize;
  let metadataAsTransit = json.metadataAsTransit;
  while (hasNextPage) {
    const nextRes = await fetchMoreSearchResult(metadataAsTransit);
    metadataAsTransit = nextRes.metadataAsTransit;
    result.push(...nextRes.results);
    hasNextPage = nextRes.results.length === eszSearchPageSize;
  }
  console.log('Result count:', result.length);
  return result;
}

async function fetchMoreSearchResult(metadataAsTransit: string): Promise<SearchResponse> {
  const url = "https://www.swissreg.ch/database/resources/query/fetch?ps=" + eszSearchPageSize;
  console.log('Fetching URL', url);
  const res = await fetch(url, {
    "headers": {
      "Accept": "application/json, text/plain, */*",
      "Content-Type": "application/transit+json",
      "X-IPI-VERSION": "9.0.4",
    },
    "body": metadataAsTransit,
    "method": "POST"
  });
  return await res.json();
}

async function readResource(id: string): Promise<CertificateResponse> {
  const url = "https://www.swissreg.ch/database/resources/ds/" + id;
  console.log('Fetching Resource:', url);
  const res = await fetch(url, {
    "headers": {
      "Accept": "application/json, text/plain, */*",
      "X-IPI-VERSION": "9.0.4",
    },
    "method": "GET"
  });
  const json = await res.json();
  return json;
}

async function readPatent(id: string): Promise<PatentResponse> {
  const url = "https://www.swissreg.ch/database/resources/ds/urn:ige:schutztitel:patent:" + id;
  console.log('Fetching Patent:', url);
  const res = await fetch(url, {
    "headers": {
      "Accept": "application/json, text/plain, */*",
      "X-IPI-VERSION": "9.0.4",
    },
    "method": "GET"
  });
  const json = await res.json();
  return json;
}

async function lookupSwissmedicRegNumbers(path: string): Promise<Set<string>> {
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(path);

  const worksheet = workbook.worksheets[0];
  const result: Set<string> = new Set();
  worksheet.eachRow((row, rowNumber)=> {
    const regNumberCell = row.getCell('A');
    if (typeof regNumberCell.value !== 'number') return;
    const regNumber: number = regNumberCell.value;
    const regNumString = String(regNumber);
    if (regNumString.length === 5) {
      result.add(regNumString);
    }
  });
  return result;
}
