# ts4cpp
Parse Public Domain Websites for Medical Information using Typescript and Puppeteer

## Requirements
* node v14.15.0 or you risk running into [Issue #2](https://github.com/zdavatz/ts4cpp/issues/2)

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
