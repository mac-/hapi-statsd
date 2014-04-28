clean:
	rm -rf node_modules/*

install:
	npm install

test:
	./node_modules/.bin/jshint lib/* --config test/jshint/config.json
	@NODE_ENV=test ./node_modules/.bin/mocha --recursive --reporter spec --timeout 3000 test/integration

test-cov:
	@NODE_ENV=test ./node_modules/.bin/mocha --require blanket --recursive --timeout 3000 -R travis-cov test/integration

test-lcov:
	@NODE_ENV=test ./node_modules/.bin/mocha --require blanket --recursive --timeout 3000 -R mocha-lcov-reporter test/integration

test-cov-html:
	@NODE_ENV=test ./node_modules/.bin/mocha --require blanket --recursive --timeout 3000 -R html-cov test/integration > test/coverage.html
	xdg-open "file://${CURDIR}/test/coverage.html" &

check-deps:
	./node_modules/.bin/node-dependencies
	
.PHONY: test test-cov test-lcov test-cov-html
