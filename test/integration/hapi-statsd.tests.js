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
	mockStatsdClient.incStat = '';
	mockStatsdClient.timingStat = '';
	mockStatsdClient.timingDate = '';
	server = new Hapi.Server();

	server.connection({
		host: 'localhost',
		port: 8085
	});

	var get = function (request, reply) {
		reply('Success!');
	};

	var err = function (request, reply) {
		reply(new Error());
	};

	var err407 = function (request, reply) {
		reply('error').statusCode = 407;
	};

	server.route({ method: ['GET','OPTIONS'], path: '/', handler: get, config: {cors: true} });
	server.route({ method: 'GET', path: '/err', handler: err, config: {cors: true} });
	server.route({ method: 'GET', path: '/test/{param}', handler: get, config: {cors: true} });
	server.route({ method: 'GET', path: '/default', handler: get, config: {cors: true} });
	server.route({ method: 'GET', path: '/override', handler: get, config: {cors: true} });
	server.route({ method: 'GET', path: '/rename', handler: get, config: {cors: true} });
	server.route({ method: 'GET', path: '/match/id', handler: get, config: {id: 'match-my-id', cors: true} });
	server.route({ method: 'POST', path: '/match/method', handler: get, config: { cors: true} });
	server.route({ method: 'GET', path: '/match/status', handler: err407, config: { cors: true} });

	server.register({
		register: plugin,
		options: {
			statsdClient: mockStatsdClient,
			defaultFilter: {
				enableCounter: false,
				enableTimer: true,
			},
			filters: [
				{ path: '/', enableCounter: true },
				{ path: '/err', enableCounter: true },
				{ path: '/test/{param}', enableCounter: true },
				{ path: '/override', enableCounter: true, enableTimer: false },
				{ path: '/rename', name: 'rename_stat', enableCounter: true, enableTimer: true },
				{ id: 'match-my-id', name: 'match_id_stat', enableCounter: true, enableTimer: true },
				{ method: 'POST', name: 'match_on_post', enableCounter: true, enableTimer: true },
				{ status: 407, name: 'match_on_status', enableCounter: true, enableTimer: true },
			],
		},
	}, done);
});

describe('hapi-statsd plugin tests', function() {

	it('should expose statsd client to the hapi server', function() {
		assert.equal(server.statsd, mockStatsdClient);
	});

	it('should report stats with no path in stat name', function(done) {
		server.inject('/', function(res) {
			assert(mockStatsdClient.incStat == 'GET.200');
			assert(mockStatsdClient.timingStat == 'GET.200');
			assert(mockStatsdClient.timingDate instanceof Date);
			done();
		});
	});

	it('should honor default filter', function(done) {
		server.inject('/default', function(res) {
			assert(mockStatsdClient.incStat == '');
			assert(mockStatsdClient.timingStat == 'default.GET.200');
			assert(mockStatsdClient.timingDate instanceof Date);
			done();
		});
	});

	it('should honor filter override', function(done) {
		server.inject('/override', function(res) {
			assert(mockStatsdClient.incStat == 'override.GET.200');
			assert(mockStatsdClient.timingStat == '');
			done();
		});
	});

	it('should use cached value', function(done) {
		server.inject('/override', function() {
			server.inject('/override', function() {
				assert(mockStatsdClient.incStat == 'override.GET.200');
				assert(mockStatsdClient.timingStat == '');
				done();
			});
		});
	});

	it('should rename stat', function(done) {
		server.inject('/rename', function(res) {
			assert(mockStatsdClient.incStat == 'rename_stat');
			assert(mockStatsdClient.timingStat == 'rename_stat');
			done();
		});
	});

	it('should match on route id', function(done) {
		server.inject('/match/id', function(res) {
			assert(mockStatsdClient.incStat == 'match_id_stat');
			assert(mockStatsdClient.timingStat == 'match_id_stat');
			done();
		});
	});

	it('should match on request method', function(done) {
		server.inject({method: 'POST', url: '/match/method'}, function(res) {
			assert(mockStatsdClient.incStat == 'match_on_post');
			assert(mockStatsdClient.timingStat == 'match_on_post');
			done();
		});
	});

	it('should match on status code', function(done) {
		server.inject('/match/status', function(res) {
			assert(mockStatsdClient.incStat == 'match_on_status');
			assert(mockStatsdClient.timingStat == 'match_on_status');
			done();
		});
	});

	it('should report stats with path in stat name', function(done) {
		server.inject('/test/123', function(res) {
			assert(mockStatsdClient.incStat == 'test_{param}.GET.200');
			assert(mockStatsdClient.timingStat == 'test_{param}.GET.200');
			assert(mockStatsdClient.timingDate instanceof Date);
			done();
		});
	});

	it('should report stats with generic not found path', function(done) {
		server.inject('/fnord', function(res) {
			assert(mockStatsdClient.incStat == '');
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
		}, function(res) {
			assert(mockStatsdClient.incStat == '{cors*}.OPTIONS.200');
			assert(mockStatsdClient.timingStat == '{cors*}.OPTIONS.200');
			assert(mockStatsdClient.timingDate instanceof Date);
			done();
		});
	});

	it('should not change the status code of a response', function(done) {
		server.inject('/err', function(res) {
			assert(res.statusCode === 500);
			done();
		});
	});
});
