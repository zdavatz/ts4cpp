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
      chargenrueckrufeDe: { outputPath: Path.join('output', 'chargenrueckrufe_de.json') }
    });
  }
})();