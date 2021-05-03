var StatsdClient = require('statsd-client'),
	Hoek = require('@hapi/hoek'),
	defaults = {
		statsdClient: null,
		host: 'localhost',
		port: '8125',
		prefix: 'hapi',
		pathSeparator: '_',
		template: '{path}.{method}.{statusCode}',
		defaultFilter: {
			enableCounter: true,
			enableTimer: true,
		},
		filters: [],
	};

var register = function (server, options) {
	var settings = Hoek.applyToDefaults(defaults, options || {}),
		statsdClient = options.statsdClient || new StatsdClient({
			host: settings.host,
			port: settings.port,
			prefix: settings.prefix
		}),
		normalizePath = function(path) {
			path = (path.indexOf('/') === 0) ? path.substr(1) : path;
			return path.replace(/\//g, settings.pathSeparator);
		},
		filterCache = {}, //cache results so that we don't have to compute them every time
		getFilter = function(statName, route, status) {
			var cachedFilter = filterCache[statName];
			if(cachedFilter) {
				return cachedFilter;
			}

			var foundFilter = settings.filters.find(function(filter) {
				if (filter.id && route.settings && route.settings.id !== filter.id) {
					return false;
				}

				if (filter.path && route.path !== filter.path) {
					return false;
				}

				if (filter.status && status !== filter.status) {
					return false;
				}

				if (filter.method && route.method.toUpperCase() !== filter.method.toUpperCase()) {
					return false;
				}

				// If none of the above checks failed, then we have a match
				return true;
			});

			return filterCache[statName] = Hoek.applyToDefaults(settings.defaultFilter, foundFilter || {});
		};

	server.decorate('server', 'statsd', statsdClient);

	server.ext('onPreResponse', function (request, h) {
		var startDate = new Date(request.info.received);
		var statusCode = (request.response.isBoom) ? request.response.output.statusCode : request.response.statusCode;

		var path = request._route.path;
		var specials = request._core.router.specials;

		if (request._route === specials.notFound.route) {
			path = '/{notFound*}';
		}
		else if (specials.options && request._route === specials.options.route) {
			path = '/{cors*}';
		}
		else if (request._route.path === '/' && request._route.method === 'options') {
			path = '/{cors*}';
		}

		var statName = settings.template
			.replace('{path}', normalizePath(path))
			.replace('{method}', request.method.toUpperCase())
			.replace('{statusCode}', statusCode);

		statName = (statName.indexOf('.') === 0) ? statName.substr(1) : statName;

		var filter = getFilter(statName, request._route, statusCode);
		if (filter.name) {
			statName = filter.name;
		}

		if (filter.enableCounter) {
			statsdClient.increment(statName);
		}

		if (filter.enableTimer) {
			statsdClient.timing(statName, startDate);
		}

		return h.continue;
	});

};

var pkg = require('../package.json');
var name = pkg['name'];
var version = pkg['version'];

exports.plugin = {
  register: register,
  name: name,
  version: version,
  pkg: pkg
};
