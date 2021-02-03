#!/usr/bin/env node

import { Command } from 'commander';
import * as drugshortage from './drugshortage';

const program = new Command();
program.option('--drugshortage', 'Fetch drugshortage');
program.parse(process.argv);

const options = program.opts();
if (options.drugshortage) {
  drugshortage.main(options);
}