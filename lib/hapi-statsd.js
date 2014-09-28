var Cache = require('eidetic'),
	options = {
		maxSize: 10000,
		canPutWhenFull: true
	},
	cache = new Cache(options),
	StatsdClient = require('statsd-client'),
	Hoek = require('hoek'),
	defaults = {
		statsdClient: null,
		host: 'localhost',
		port: '8125',
		prefix: 'hapi',
		pathSeparator: '_',
		template: '{path}.{method}.{statusCode}'
	};

module.exports.register = function (plugin, options, next) {

	var routesRenamed = false,
		settings = Hoek.applyToDefaults(defaults, options || {}),
		statsdClient = options.statsdClient || new StatsdClient({
			host: settings.host,
			port: settings.port,
			prefix: settings.prefix
		}),
		normalizePath = function(path) {
			path = (path.indexOf('/') === 0) ? path.substr(1) : path;
			return path.replace(/\//g, settings.pathSeparator);
		};

	plugin.ext('onRequest', function (request, next) {
		if (!routesRenamed) {
			request.server._router.specials.notFound.route.path = '/{notFound*}';
			if (request.server._router.specials.options) {
				request.server._router.specials.options.route.path = '/{cors*}';
			}
			routesRenamed = true;
		}
		cache.put(request.id, new Date(), 300, false);
		next();
	});

	plugin.ext('onPreResponse', function (request, next) {
		var startDate = cache.get(request.id);
		if (startDate) {
			var statusCode = (request.response.isBoom) ? request.response.output.statusCode : request.response.statusCode;
			var statName = settings.template
							.replace('{path}', normalizePath(request._route.path))
							.replace('{method}', request.method.toUpperCase())
							.replace('{statusCode}', statusCode);
			
			statName = (statName.indexOf('.') === 0) ? statName.substr(1) : statName;
			statsdClient.increment(statName);
			statsdClient.timing(statName, startDate);
			cache.del(request.id);
		}
		next();
	});

	next();
};

module.exports.register.attributes = {
	pkg: require('../package.json')
};
