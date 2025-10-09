#!/usr/bin/env node
import * as Path from 'path';
import { Command } from 'commander';
import * as drugshortage from './drugshortage';
import * as swissmedic from './swissmedic';
import { download } from './downloadPackagesXlsx';
import { main as migelMain } from './migel';
import { main as swissregMain } from './swissreg';

const program = new Command();
program.option('--drugshortage', 'Fetch Drugshortage');
program.option('--chargenrueckrufe', 'Fetch Chargenrueckrufe');
// https://github.com/zdavatz/ts4cpp/issues/10
program.option('--migel', 'Fetch Migel');
program.option('--swissreg', 'Fetch Swissreg.ch');
program.parse(process.argv);

const options = program.opts();
const packagesXlsxPath = Path.join('input', 'zugelassene_packungen_ham.xlsx');

(async ()=> {
  if (options.drugshortage || options.chargenrueckrufe || options.swissreg) {
    await download();
    if (options.drugshortage) {
      await drugshortage.main({ outputPath: Path.join('output', 'drugshortage.json') });
    }
    if (options.chargenrueckrufe) {
      await swissmedic.main({
        chargenrueckrufeDe: { outputPath: Path.join('output', 'chargenrueckrufe_de.json') },
        chargenrueckrufeFr: { outputPath: Path.join('output', 'chargenrueckrufe_fr.json') },
        DHPC_HPC_De: { outputPath: Path.join('output', 'dhpc_hpc_de.json') },
        DHPC_HPC_Fr: { outputPath: Path.join('output', 'dhpc_hpc_fr.json') },
        packagesXlsxPath,
        customTitleMapPath: Path.join('input', 'title-to-reg-number.json'),
      });
    }
    if (options.swissreg) {
      await swissregMain({
        packagesXlsxPath,
        outputPath: Path.join('output', 'swissreg.json'),
      });
    }
  }
  if (options.migel) {
    await migelMain();
  }
})();
