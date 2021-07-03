clean:
	rm -rf node_modules/* package-lock.json

install:
	npm install

test:
	./node_modules/.bin/jshint lib/* --config test/jshint/config.json
	@NODE_ENV=test npm test

.PHONY: test
