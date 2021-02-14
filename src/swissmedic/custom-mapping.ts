import * as fs from 'fs';
import { SwissmedicRecord, appendRegNumber } from '../swissmedic';

export async function mapRegNumbersWithTitle(filePath: string, records: SwissmedicRecord[]) {
  try {
    const jsonString = await fs.promises.readFile(filePath, 'utf-8');
    const mapping = JSON.parse(jsonString);
    var patchedCount = 0;
    for (const record of records) {
      const regNumber = mapping[record.title];
      if (regNumber !== undefined) {
        appendRegNumber(record, regNumber);
        patchedCount++;
      }
    }
    console.log(`Patched ${patchedCount} records with ${filePath}`);
  } catch (e) {
    console.error('Mapping for titles not found');
    console.error(e);
  }
}
