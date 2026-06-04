# ts4cpp
Parse Public Domain Websites for Medical Information using Typescript and Puppeteer

## Requirements
* node v22

## Installing dependencies

```
make install
```

## Building

```
make build
```

## Running

```
node dist/index.js --drugshortage
node dist/index.js --chargenrueckrufe (also for DHCP/HPC)
node dist/index.js --migel
node dist/index.js --swissreg
```

### Notes

- `--drugshortage` reads `https://www.drugshortage.ch/ds.php?a=engpaesse` (JSON, HMAC-signed — secret is from the homepage JS) and writes `output/drugshortage.json`. The old ASP.NET HTML scrape was retired when the site moved to WordPress in 2026; the short-lived `/api_engpaesse.php` was replaced by `/ds.php` shortly after.

### Optional

- You can put `zugelassene_packungen_ham.xlsx` in `input/`.
- You can also add Zulassungsnummer via `input/title-to-reg-number.json`. z.B.

    ```
      {
        "TITLE HERE": 12345,
        "ANOTHER TITLE HERE": 23456
      }
    ```
