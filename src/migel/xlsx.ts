import fs from 'fs';
import Path from 'path';
import https from 'https';
import { IncomingHttpHeaders } from 'http';
import Excel from 'exceljs';
import { Config } from '../migel';

export async function download(config: Config): Promise<string> {
  const xlsxURLString = config['xlsx-url'];
  const xlsxURL = new URL(xlsxURLString);

  const options = {
    host: xlsxURL.host,
    port: xlsxURL.port,
    path: xlsxURL.pathname,
  };
  let headers = await new Promise<IncomingHttpHeaders>((resolve, reject)=> {
    const req = https.request({ ...options, method: 'HEAD' }, (res)=> {
      resolve(res.headers);
    });
    req.on('error', reject);
    req.end();
  });

  const contentLength = headers['content-length'];
  var needToDownload = true;
  const outputFilename = decodeURIComponent(Path.basename(xlsxURL.pathname));
  const filePath = Path.join('input', outputFilename);
  try {
    const stat = await fs.promises.stat(filePath);
    const size = stat.size;
    if (contentLength !== undefined && parseInt(contentLength) === size) {
      needToDownload = false;
    }
  } catch (e) {
    console.log(`Cannot read existing ${outputFilename}`);
  }
  if (!needToDownload) {
    console.log(`No need to download ${outputFilename}`);
    return filePath;
  }
  console.log(`Downloading from Migel: ${outputFilename}, size: ${contentLength}`);
  const file = fs.createWriteStream(filePath);
  await new Promise((resolve, reject)=> {
    const request = https.request({ ...options, method: 'GET' }, (res)=> {
      res.pipe(file);
      file.on('finish', ()=> {
        file.close();
        resolve(null);
      })
    });
    request.on('error', async (error)=> {
      await fs.promises.unlink(filePath);
      reject(error);
    })
    request.end();
  });
  console.log(`Downloaded`);
  return filePath;
}

export type MigelXLSXRow = {
  positionNumber: string,
  'L': string,
  'Menge / Einheit': string,
  'HVB Selbstanwendung': string,
  'HVB Pflege': string,
  'Rev.': string,
}

export async function getMigelXLSXRows(xlsxPath: string): Promise<MigelXLSXRow[]> {
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  const worksheet = workbook.worksheets[0];
  const results: MigelXLSXRow[] = [];

  worksheet.eachRow((row, rowNumber)=> {
    if (rowNumber === 1) return; // skip header
    const positionNumberCell = row.getCell('H');
    if (typeof positionNumberCell.value !== 'string') return;
    const positionNumber: string = positionNumberCell.value.trim();

    function stringAtColumn(col: string): string {
      const cell = row.getCell(col);
      const str: string =
        typeof cell.value === 'string' ? cell.value : 
        typeof cell.value === 'number' ? String(cell.value) : '';
      return str;
    }

    // L
    const columnI = stringAtColumn('I');
    // Menge / Einheit
    const columnL = stringAtColumn('L');
    // HVB Selbstanwendung
    const columnM = stringAtColumn('M');
    // HVB Pflege
    const columnN = stringAtColumn('N');
    // Rev.
    const columnP = stringAtColumn('P');

    results.push({
        positionNumber,
        'L': columnI,
        'Menge / Einheit': columnL,
        'HVB Selbstanwendung': columnM,
        'HVB Pflege': columnN,
        'Rev.': columnP,
    });
  });

  return results;
}

export function groupByPositionNumber(rows: MigelXLSXRow[]): { [key: string]: MigelXLSXRow } {
  const results: { [key: string]: MigelXLSXRow } = {};
  for (const row of rows) {
    if (!row.positionNumber.length) continue;
    if (row.positionNumber in results) {
      console.log('Repeated positionNumber: ', row.positionNumber);
    } else {
      results[row.positionNumber] = row;
    }
  }
  return results;
}
