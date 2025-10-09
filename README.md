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
```

### Optional

- You can put `zugelassene_packungen_ham.xlsx` in `input/`.
- You can also add Zulassungsnummer via `input/title-to-reg-number.json`. z.B.

    ```
      {
        "TITLE HERE": 12345,
        "ANOTHER TITLE HERE": 23456
      }
    ```
