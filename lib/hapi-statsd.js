var StatsdClient = require('statsd-client'),
	Hoek = require('hoek'),
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

module.exports.register = function(server, options, next) {
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
			var filter = filterCache[statName];
			if(filter) {
				return filter;
			}

			var foundFilter = settings.filters.find(function(filter) {
				// a match on route id
				if (route.settings && route.settings.id && route.settings.id === filter.id) {
					return true;
				}

				return (filter.path || filter.method || filter.status) &&
					(!filter.path || route.path === filter.path) &&
					(!filter.method || route.method.toUpperCase() === filter.method.toUpperCase()) &&
					(!filter.status || status === filter.status);
			});

			filterCache[statName] = filter = Hoek.applyToDefaults(settings.defaultFilter, foundFilter || {});
			return filter;
		};

	server.decorate('server', 'statsd', statsdClient);

	server.ext('onPreResponse', function (request, reply) {
		var startDate = new Date(request.info.received);
		var statusCode = (request.response.isBoom) ? request.response.output.statusCode : request.response.statusCode;
		var method = request.method.toUpperCase();

		var path = request._route.path;
		var specials = request.connection._router.specials;

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
			.replace('{method}', method)
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

		reply.continue();
	});

	next();
};

module.exports.register.attributes = {
	pkg: require('../package.json')
};
