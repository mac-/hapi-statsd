# hapi-statsd

[![Build Status](https://secure.travis-ci.org/mac-/hapi-statsd.png)](http://travis-ci.org/mac-/hapi-statsd)
[![Coverage Status](https://coveralls.io/repos/mac-/hapi-statsd/badge.png)](https://coveralls.io/r/mac-/hapi-statsd)
[![Code Climate](https://codeclimate.com/github/mac-/hapi-statsd.png)](https://codeclimate.com/github/mac-/hapi-statsd)
[![NPM version](https://badge.fury.io/js/hapi-statsd.png)](http://badge.fury.io/js/hapi-statsd)
[![Dependency Status](https://david-dm.org/mac-/hapi-statsd.png)](https://david-dm.org/mac-/hapi-statsd)

[![NPM](https://nodei.co/npm/hapi-statsd.png?downloads=true&stars=true)](https://nodei.co/npm/hapi-statsd/)

A hapi plugin for sending request round trip metrics to statsd, also exposing statsd client to the server.

## Contributing

This module makes use of a `Makefile` for building/testing purposes. After obtaining a copy of the repo, run the following commands to make sure everything is in working condition before you start your work:

	make install
	make test

Before committing a change to your fork/branch, run the following commands to make sure nothing is broken:

	make test
	make test-cov

Don't forget to bump the version in the `package.json` using the [semver](http://semver.org/spec/v2.0.0.html) spec as a guide for which part to bump. Submit a pull request when your work is complete.

***Notes:***
* Please do your best to ensure the code coverage does not drop. If new unit tests are required to maintain the same level of coverage, please include those in your pull request.
* Please follow the same coding/formatting practices that have been established in the module.

## Installation

	npm install hapi-statsd

## Usage

To install this plugin on your Hapi server, do something similar to this:

```js
var Hapi = require('@hapi/hapi');
var server = new Hapi.Server();

var hapiStatsdConfig = {};

server.register({ register: require('hapi-statsd'), options: hapiStatsdConfig }, function(err) {
	if (err) {
		console.log('error', 'Failed loading plugin: hapi-statsd');
	}
});
```

## Plugin Options

### `template`

A template to use for the stat names to send to statsd. This can be any string that could include the following tokens that get replaced with their actual values:

* `{path}` - the path that the request was routed to (e.g `'/users/{id}'`)
* `{method}` - the HTTP verb used on the request (e.g. `'GET'`)
* `{statusCode}` - the numerical status code of the response that the server sent back to the client (e.g. `200`)

Defaults to `'{path}.{method}.{statusCode}'`

### `statsdClient`

An instance of a particular statsd client that you prefer to use for sending metrics to statsd. If this is used, then the `statsdHost` and `prefix` options are ignored. Defaults to `null`

### `host`

The host athat an instance of statsd is running on. An instance of the `statsd-client` NPM module will be created and will be configured to use this host. Defaults to `'localhost'`

### `port`

The port that an instance of statsd is listening on. An instance of the `statsd-client` NPM module will be created and will be configured to use this port. Defaults to `8125`

### `prefix`

The prefix to add to every stat collected. Usually used for grouping a set of stats under one hierarchy in graphite. Defaults to `'hapi'`

### `pathSeparator`

A character or set of characters to replace the '/' (forward slash) characters in your URL path since forward slashes cannot be used in stat names. Defaults to `'_'`

### `defaultFilter`

Defines whether increment and timer stats are turned on by default. Defaults to `{ enableCounter: true, enableTimer: true }`.

### `filters`

An array of custom filters. A successful match requires one of these fields to be defined and match the route:
* `id`: The route id defined in the route's config
* `path`: The path defined in the route
* `method`: The HTTP method of the request/route
* `status`: The returned HTTP status code of the response

Parameters that are not included are considered wildcard and will match all values. Note that if none of these
parameters are included in the filter, then you will get a match on ALL route-response combinations.

In addition to matching, the field can contain the following configuration options:

* name: Defines a custom name for the stat to be reported
* enableTimer: Enable/disable the timer stat from being reported
* enableCounter: Enable/disable the count stat from being reported

Example configuration:
```js
defaultFilter: { // by default, enable timer and disable counter stats
    enableCounter: false,
    enableTimer: true,
}
filters: [
    { path: '/', enableCounter: true }, // enable counters (keep timers on as well) for this path
    { path: '/test/{param}', enableCounter: true }, // path with a parameter
    { path: '/rename', name: 'rename_stat' }, // rename the metric
    { id: 'match-my-id', enableCounter: true, enableTimer: true }, // match by route id
    { status: 407, name: 'match_on_status', enableCounter: true, enableTimer: true }, // match by status code
]
````

## Example

A Hapi route configured like this:

```js
server.route({
	method: 'GET',
	path: '/test/{param}',
	handler: function(request, reply) {
		reply('Success!');
	}
});
```

would send an increment and timing stat to statsd with the following stat name (assuming all options are set to their defaults):

	hapi.test_{param}.GET.200

As the [statsd client](https://github.com/msiebuhr/node-statsd-client) is also exposed to the hapi server, you can use any of its methods, e.g.:

```js
server.statsd.increment('systemname.subsystem.value');
server.statsd.gauge('what.you.gauge', 100);
server.statsd.set('your.set', 200);
```

## Version Compatibility

### Currently compatible with: Hapi 21.x.x

* 0.1.x - Hapi 1.x.x
* 0.2.x - Hapi 3.x.x
* 0.3.x - Hapi 3.x.x
* 0.4.x - Hapi 4.x.x
* 1.0.x - Hapi 6.x.x
* 1.1.x - Hapi 7.x.x
* 1.2.x - Hapi 8.x.x
* 2.x.x - Hapi 9.x.x
* 3.x.x - Hapi 10.x.x (Node v4)
* 4.x.x - Hapi 11.x.x
* 5.x.x - Hapi 13.x.x
* 6.x.x - Hapi 16.x.x
* 7.x.x - Hapi 17.x.x (Node v8)
* 8.x.x - Hapi 18.x.x
* 9.x.x - Hapi 21.x.x (Node v12)

# License

The MIT License (MIT)

Copyright (c) 2013 Mac Angell

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

