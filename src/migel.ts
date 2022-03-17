import { download, getMigelXLSXRows, groupByPositionNumber } from './migel/xlsx';
import { lookupArtikels } from './migel/lookup';
import Path from 'path';
import * as fs from 'fs';

export async function main() {
  const config = await getConfig();
  const downloadedPath = await download(config);
  const rows = await getMigelXLSXRows(downloadedPath);
  const results = groupByPositionNumber(rows);
  console.log(`Found ${Object.keys(results).length} position numbers`);

  let wroteHeader = false;
  const outputFilename = getOutputFilename();
  const writeStream = fs.createWriteStream(outputFilename, {
    flags: 'w',
    encoding: 'utf-8',
    autoClose: true,
    emitClose: true,
  });

  for (const positionNumber in results) {
    const xlsEntry = results[positionNumber];

    const lookedUp = await lookupArtikels(config, positionNumber);
    if (lookedUp === null) {
      console.error('Cannot look up for: ', positionNumber);
      continue;
    }
    console.log(`Found ${lookedUp.rows.length} for ${positionNumber}`);
    if (!wroteHeader) {
      const fullHeaders = [
        'Positions-Nr.',
        'HVB Selbstanwendung',
        'HVB Pflege',
      ].concat(lookedUp.headers);
      pipeToCSVStream(fullHeaders, writeStream);
      wroteHeader = true;
    }
    for (const row of lookedUp.rows) {
      pipeToCSVStream([
        positionNumber,
        xlsEntry['HVB Selbstanwendung'], 
        xlsEntry['HVB Pflege']
      ].concat(row), writeStream);
    }
  }
  writeStream.end();
  await new Promise((resolve)=> {
    writeStream.once('close', ()=> {
      resolve(null);
    })
  });
  console.log('file closed');
}

function pipeToCSVStream(strs: string[], stream: fs.WriteStream) {
  stream.write(strs.join(';')+'\n');
}

export type Config = {
  'xlsx-url': string;
  'lookup-url': string;
}

async function getConfig(): Promise<Config> {
  const path = Path.join('input', 'migel.json');
  console.log(`Getting config from: ${path}`);
  const configString = await fs.promises.readFile(path, { encoding: 'utf-8' });
  return JSON.parse(configString);
}

function getOutputFilename(): string {
  const d = new Date();
  return Path.join('output', `Migel_${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}.csv`);
}
