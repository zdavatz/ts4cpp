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

- **drugshortage.ch** — site was re-platformed from ASP.NET to WordPress (mid-2026). All `.aspx` URLs are gone (HTTP 500). Data now comes from JSON endpoints, primarily `https://www.drugshortage.ch/api_engpaesse.php` (shortage list, companies, colour legend in one payload). Other endpoints exist under `/api_*.php` for related views (abgeschlossen, ausserhandel, vertriebseinstellung, suche, etc.) — see issue #19 for the full list.
- The sister Ruby importer at `/home/zeno/.software/oddb.org/src/plugin/shortage.rb` still parses the old ASP.NET HTML and will need the same kind of rewrite.

## Conventions

- Output goes to `output/` (JSON), input fixtures to `input/`.
- Don't commit files under `input/` or `output/`.
