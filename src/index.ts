#!/usr/bin/env node
import * as Path from 'path';
import { Command } from 'commander';
import * as drugshortage from './drugshortage';
import * as swissmedic from './swissmedic';

const program = new Command();
program.option('--drugshortage', 'Fetch Drugshortage');
program.option('--chargenrueckrufe', 'Fetch Chargenrueckrufe');
program.parse(process.argv);

const options = program.opts();

(async ()=> {
  if (options.drugshortage) {
    await drugshortage.main({ outputPath: Path.join('output', 'drugshortage.json') });
  }
  if (options.chargenrueckrufe) {
    await swissmedic.main({
      chargenrueckrufeDe: { outputPath: Path.join('output', 'chargenrueckrufe_de.json') },
      chargenrueckrufeFr: { outputPath: Path.join('output', 'chargenrueckrufe_fr.json') },
      DHPC_HPC_De: { outputPath: Path.join('output', 'dhpc_hpc_de.json') },
      DHPC_HPC_Fr: { outputPath: Path.join('output', 'dhpc_hpc_fr.json') },
      packagesXlsxPath: Path.join('input', 'zugelassene_packungen_ham.xlsx'),
    });
  }
})();