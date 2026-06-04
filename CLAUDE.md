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

- **drugshortage.ch** — site was re-platformed from ASP.NET to WordPress (mid-2026), then the JSON endpoints were reshuffled again shortly after: `/api_engpaesse.php` is gone (404). Current source is `/ds.php?a=engpaesse` — same payload shape as before (engpaesse + firmen + bewertungLegende in one call) but now HMAC-signed. The HMAC secret is hard-coded in the homepage JS (inline `<script>` block, also referenced by `ds-config.js`); update the constant in `src/drugshortage.ts` if it ever changes. There's also a paid REST API at `/api/v1/drugshortage.php?endpoint=…` (CHF 29/mo Basic for 5000 req/day; free tier silently caps `perPage` at 11 and returns 200/empty past page 1 — not usable in practice).
- The sister Ruby importer at `/home/zeno/.software/oddb.org/src/plugin/shortage.rb` still parses the old ASP.NET HTML and will need the same kind of rewrite.

## Conventions

- Output goes to `output/` (JSON), input fixtures to `input/`.
- Don't commit files under `input/` or `output/`.
