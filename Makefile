install:
	npm install
.PHONEY: install

build:
	npm run build
.PHONEY: build

clean:
	rm dist/*
.PHONEY: clean
