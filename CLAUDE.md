# CLAUDE.md

## Build & run

```
make build                          # tsc
node dist/index.js --drugshortage   # scrape drugshortage.ch
node dist/index.js --chargenrueckrufe
node dist/index.js --migel
node dist/index.js --swissreg
```

Node >= 22.

## Cheerio imports

cheerio 1.0 has **no default export**. Use named imports:

```ts
import { load as cheerioLoad } from 'cheerio';
type Cheerio = ReturnType<typeof cheerioLoad>;
```

`import cheerio from 'cheerio'` compiles but crashes at runtime with `Cannot read properties of undefined (reading 'load')`.

## Data sources & quirks

- **drugshortage.ch** — table `#GridView1` has 11 columns: Bezeichnung, Datum Lieferfähigkeit, Alternativen, Status, Datum letzte Mutation, Firma, GTIN, Pharmacode, Tage seit erster Meldung, ATC, GENGRP. `#GridView2` = companies, `#GridView5` = colour legend. The site occasionally returns an ASP.NET "Laufzeitfehler" page when broken — scrape produces `[]` rather than throwing.
- The sister Ruby importer lives at `/home/zeno/.software/oddb.org/src/plugin/shortage.rb` and is a useful reference when scraping logic needs to change.

## Conventions

- Output goes to `output/` (JSON), input fixtures to `input/`.
- Don't commit files under `input/` or `output/`.
