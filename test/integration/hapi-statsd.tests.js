var assert = require('assert'),
	plugin = require('../../lib/hapi-statsd.js'),
	mockStatsdClient = {

		incStat: '',
		timingStat: '',
		timingDate: '',

		increment: function(statName) {
			this.incStat = statName;
		},

		timing: function(statName, date) {
			this.timingStat = statName;
			this.timingDate = date;
		}
	},
	Hapi = require('hapi');

beforeEach(function(done) {
	server = new Hapi.Server();

	server.connection({ 
		host: 'localhost', 
		port: 8085,
		routes: { cors: true }
	});

	var get = function (request, reply) {
		reply('Success!');
	};

	var err = function (request, reply) {
		reply(new Error());
	};

	server.route({ method: 'GET', path: '/', handler: get });
	server.route({ method: 'GET', path: '/err', handler: err });
	server.route({ method: 'GET', path: '/test/{param}', handler: get });

	server.register({
		register: plugin,
		options: { statsdClient: mockStatsdClient }
	}, done);
});

describe('hapi-statsd plugin tests', function() {

	it('should report stats with no path in stat name', function(done) {

		server.inject('/', function (res) {
			assert(mockStatsdClient.incStat == 'GET.200');
			assert(mockStatsdClient.timingStat == 'GET.200');
			assert(mockStatsdClient.timingDate instanceof Date);
			done();
		});
	});

	it('should report stats with path in stat name', function(done) {

		server.inject('/test/123', function (res) {
			assert(mockStatsdClient.incStat == 'test_{param}.GET.200');
			assert(mockStatsdClient.timingStat == 'test_{param}.GET.200');
			assert(mockStatsdClient.timingDate instanceof Date);
			done();
		});
	});

	it('should report stats with generic not found path', function(done) {
		server.inject('/fnord', function (res) {
			assert(mockStatsdClient.incStat == '{notFound*}.GET.404');
			assert(mockStatsdClient.timingStat == '{notFound*}.GET.404');
			assert(mockStatsdClient.timingDate instanceof Date);
			done();
		});
	});

	it('should report stats with generic CORS path', function(done) {
		server.inject({
			method: 'OPTIONS',
			headers: {
				Origin: 'http://test.domain.com'
			},
			url: '/'
		}, function (res) {
			assert(mockStatsdClient.incStat == '{cors*}.OPTIONS.200');
			assert(mockStatsdClient.timingStat == '{cors*}.OPTIONS.200');
			assert(mockStatsdClient.timingDate instanceof Date);
			done();
		});
	});

	it('should not change the status code of a response', function(done) {

		server.inject('/err', function (res) {
			assert(res.statusCode === 500);
			done();
		});
	});
});
