var name = require('../package.json').name,
	version = require('../package.json').version,
	Cache = require('eidetic'),
	options = {
		maxSize: 10000,
		canPutWhenFull: true
	},
	cache = new Cache(options),
	StatsdClient = require('statsd-client'),
	Hoek = require('hoek'),
	defaults = {
		statsdClient: null,
		statsdHost: 'localhost:8125',
		prefix: 'hapi',
		pathSeparator: '_',
		template: '{path}.{method}.{statusCode}'
	};

module.exports.name = name;

module.exports.version = version;

module.exports.register = function (plugin, options, next) {

	var routesRenamed = false,
		settings = Hoek.applyToDefaults(defaults, options || {}),
		statsdClient = options.statsdClient || new StatsdClient({
			host: settings.statsdHost.split(':')[0],
			port: settings.statsdHost.split(':')[1],
			prefix: settings.prefix
		}),
		normalizePath = function(path) {
			path = (path.indexOf('/') === 0) ? path.substr(1) : path;
			return path.replace(/\//g, settings.pathSeparator);
		};
	
	plugin.ext('onRequest', function (request, next) {
		if (!routesRenamed) {
			request.server._router.notfound.path = '/{notFound*}';
			if (request.server._router.hasOwnProperty('cors')) {
				request.server._router.cors.path = '/{cors*}';
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
