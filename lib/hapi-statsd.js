var StatsdClient = require('statsd-client'),
	Hoek = require('hoek'),
	defaults = {
		statsdClient: null,
		host: 'localhost',
		port: '8125',
		prefix: 'hapi',
		pathSeparator: '_',
		template: '{path}.{method}.{statusCode}'
	};

module.exports.register = function (server, options, next) {
	var settings = Hoek.applyToDefaults(defaults, options || {}),
		statsdClient = options.statsdClient || new StatsdClient({
			host: settings.host,
			port: settings.port,
			prefix: settings.prefix
		}),
		normalizePath = function(path) {
			path = (path.indexOf('/') === 0) ? path.substr(1) : path;
			return path.replace(/\//g, settings.pathSeparator);
		};

	server.decorate('server', 'statsd', statsdClient);

	server.ext('onPreResponse', function (request, reply) {
		var startDate = new Date(request.info.received);
		var statusCode = (request.response.isBoom) ? request.response.output.statusCode : request.response.statusCode;

		var path = request._route.path;
		var specials = request.connection._router.specials;

		if (request._route === specials.notFound.route) {
			path = '/{notFound*}';
		}
		else if (specials.options && request._route === specials.options.route) {
			path = '/{cors*}';
		}
		else if (request._route.path === '/' && request._route.method === 'options'){
			path = '/{cors*}';
		}

		var statName = settings.template
			.replace('{path}', normalizePath(path))
			.replace('{method}', request.method.toUpperCase())
			.replace('{statusCode}', statusCode);

		statName = (statName.indexOf('.') === 0) ? statName.substr(1) : statName;
		statsdClient.increment(statName);
		statsdClient.timing(statName, startDate);

		reply.continue();
	});

	next();
};

module.exports.register.attributes = {
	pkg: require('../package.json')
};
