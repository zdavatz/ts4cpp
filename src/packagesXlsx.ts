import Excel from 'exceljs';
import { SwissmedicRecord } from './swissmedic';

export async function enrichSwissmedicRecords(path:string, records: SwissmedicRecord[]) {
  console.log(`Patching records with ${path}`);
  const index = buildIndexForSwissmedicRecords(records);
  try {
    await loopXlsx(path, index, records);
  } catch (e) {
    console.error('Error during reading packages xlsx');
    console.error(e);
  }
}

type SwissmedicRecordIndex = {[key:string]: Set<number>};
/**
 * Looping through all records is slow and we should build a index.
 * Key is `{name}/{active agent}", and values are the index in the record array
 */
function buildIndexForSwissmedicRecords(records: SwissmedicRecord[]): SwissmedicRecordIndex {
  const result: SwissmedicRecordIndex = {};
  records.forEach((record, index)=> {
    const name = takeUntilNotAlphabet(record.title.split('–')[1] ?? '');
    const activeAgentMatch = record.title.match(/\(([a-zA-Z]+)\)/);
    if (name === null || activeAgentMatch === null) {
      return;
    }
    const activeAgent = activeAgentMatch[1];
    const key = `${name}/${activeAgent}`.toLowerCase();
    const existing = result[key];
    if (existing === undefined) {
      result[key] = new Set();
    }
    result[key].add(index);
  });
  return result;
}

function takeUntilNotAlphabet(input: string): string | null {
  const match = input.trim().match(/^([a-zA-Z0-9]+)/);
  if (match === null) {
    return null;
  }
  return match[1];
}

async function loopXlsx(path: string, index: SwissmedicRecordIndex, records: SwissmedicRecord[]) {
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(path);

  const worksheet = workbook.worksheets[0];
  var patchedCount = 0;
  worksheet.eachRow((row, rowNumber)=> {
    const regNumberCell = row.getCell('A');
    if (typeof regNumberCell.value !== 'number') return;
    const regNumber: number = regNumberCell.value;

    const nameCell = row.getCell('C');
    if (typeof nameCell.value !== 'string') return;
    const name: string = nameCell.value;

    const activeAgentCell = row.getCell('Q');
    if (typeof activeAgentCell.value !== 'string') return;
    const activeAgent: string = activeAgentCell.value;

    const patched = patchRecords(regNumber, name, activeAgent, index, records);
    if (patched) {
      patchedCount++;
    }
  });
  console.log(`Patched ${patchedCount} records`);
}

function patchRecords(
  regNumber: number, 
  name: string, 
  activeAgent: string, 
  index: SwissmedicRecordIndex, 
  records: SwissmedicRecord[]
): boolean {
  const trimmedName = (()=> {
    const match = name.match(/^([a-zA-Z0-9]+)/);
    if (!match) return name;
    return match[1];
  })();

  const key = `${trimmedName}/${activeAgent}`.toLowerCase();
  if (index[key] !== undefined) {
    const indexes = index[key];
    for (const i of indexes) {
      const record = records[i];
      appendRegNumber(record, regNumber);
    }
    return true;
  }

  if (activeAgent.endsWith('um')) {
    // Sometimes the active agent in Xlsx ends with um, e.g. "flucytosinum"
    // but the text from swissmedic doesn't. e.g. "Flucytosin"
    const key = `${trimmedName}/${activeAgent.slice(0, activeAgent.length - 2)}`.toLowerCase();
    if (index[key] !== undefined) {
      const indexes = index[key];
      for (const i of indexes) {
        const record = records[i];
        appendRegNumber(record, regNumber);
      }
      return true;
    }
  }
  return false;
}

function appendRegNumber(record: SwissmedicRecord, regNumber: number) {
  const regNumberStr = String(regNumber);
  var hasRegNumberAlready = false;
  for (const prep of record.prep) {
    if (prep.prop === 'Zulassungsnummer') {
      hasRegNumberAlready = true;
      const currentValue = prep.field;
      if (!currentValue.includes(regNumberStr)) {
        prep.field += ',' + regNumber;
      }
      break;
    }
  }
  if (!hasRegNumberAlready) {
    record.prep.push({
      'prop': 'Zulassungsnummer',
      'field': regNumberStr,
    },)
  }
}
