'use strict';

const StatsdClient = require('statsd-client');
const Hoek = require('hoek');
const defaults = {
    statsdClient: null,
    host: 'localhost',
    port: '8125',
    prefix: 'hapi',
    pathSeparator: '_',
    dotReplacer: '-',
    template: '{path}.{method}.{statusCode}'
};

module.exports.register = function (server, options, next) {

    const settings = Hoek.applyToDefaults(defaults, options);
    const statsdClient = options.statsdClient || new StatsdClient(settings);
    const normalizePath = (path) => {

        path =  path.substr(1); // trim starting / ,
        return path.replace(/\//g, settings.pathSeparator).replace(/\./g, settings.dotReplacer);
    };

    server.decorate('server', 'statsd', statsdClient);

    server.ext('onPreResponse', (request, reply) => {

        const startDate = new Date(request.info.received);
        const statusCode = (request.response.isBoom) ? request.response.output.statusCode : request.response.statusCode;

        let path = request._route.path;
        const specials = request.connection._router.specials;

        if (request._route === specials.notFound.route) {
            path = '/{notFound*}';
        }
        else if (request._route === specials.options.route) {
            path = '/{cors*}';
        }
        else if (request._route.path === '/' && request._route.method === 'options') {
            path = '/{cors*}';
        }

        let statName = settings.template
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
