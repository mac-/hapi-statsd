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

beforeEach(async function() {
	mockStatsdClient.incStat = '';
	mockStatsdClient.timingStat = '';
	mockStatsdClient.timingDate = '';
	server = new Hapi.Server({
		host: 'localhost',
		port: 8085
	});


	var get = function (request, h) {
		return 'Success!';
	};

	var err = function (request, h) {
		return new Error();
	};

	var err407 = function (request, h) {
		return h.response('error').code(407);
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

	try {
		return await server.register({
			plugin: plugin,
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
			}
		});
	} catch (error){
		return error
	}
});

describe('hapi-statsd plugin tests', function() {

	it('should expose statsd client to the hapi server', function() {
		assert.equal(server.statsd, mockStatsdClient);
	});

	it('should honor default filter', async function() {
		await server.inject('/default')
		assert(mockStatsdClient.incStat == '');
		assert(mockStatsdClient.timingStat == 'default.GET.200');
		assert(mockStatsdClient.timingDate instanceof Date);
	});

	it('should honor filter override', async function() {
		await server.inject('/override' );
		assert(mockStatsdClient.incStat == 'override.GET.200');
		assert(mockStatsdClient.timingStat == '');
	});

	it('should use cached value', async function() {
		await server.inject('/override');
		await server.inject('/override');
		assert(mockStatsdClient.incStat == 'override.GET.200');
		assert(mockStatsdClient.timingStat == '');
	});

	it('should rename stat', async function() {
		await server.inject('/rename');
		assert(mockStatsdClient.incStat == 'rename_stat');
		assert(mockStatsdClient.timingStat == 'rename_stat');
	});

	it('should match on route id', async function() {
		await server.inject('/match/id');
		assert(mockStatsdClient.incStat == 'match_id_stat');
		assert(mockStatsdClient.timingStat == 'match_id_stat');
	});

	it('should match on request method', async function() {
		await server.inject({method: 'POST', url: '/match/method'} );
		assert(mockStatsdClient.incStat == 'match_on_post');
		assert(mockStatsdClient.timingStat == 'match_on_post');
	});

	it('should match on status code', async function() {
		await server.inject('/match/status');
		assert(mockStatsdClient.incStat == 'match_on_status');
		assert(mockStatsdClient.timingStat == 'match_on_status');
	});

	it('should report stats with no path in stat name', async function() {
		await server.inject('/');
		assert(mockStatsdClient.incStat == 'GET.200');
		assert(mockStatsdClient.timingStat == 'GET.200');
		assert(mockStatsdClient.timingDate instanceof Date);		
	});

	it('should report stats with path in stat name', async function() {
		await server.inject('/test/123');
		assert(mockStatsdClient.incStat == 'test_{param}.GET.200');
		assert(mockStatsdClient.timingStat == 'test_{param}.GET.200');
		assert(mockStatsdClient.timingDate instanceof Date);
	});

	it('should report stats with generic not found path', async function() {
		await server.inject('/fnord')
		assert(mockStatsdClient.incStat == '');
		assert(mockStatsdClient.timingStat == '{notFound*}.GET.404');
		assert(mockStatsdClient.timingDate instanceof Date);
	});

	it('should report stats with generic CORS path', async function() {
		await server.inject({
			method: 'OPTIONS',
			headers: {
				Origin: 'http://test.domain.com'
			},
			url: '/'
		})
		assert(mockStatsdClient.incStat == '{cors*}.OPTIONS.200');
		assert(mockStatsdClient.timingStat == '{cors*}.OPTIONS.200');
		assert(mockStatsdClient.timingDate instanceof Date);
	});

	it('should not change the status code of a response', async function() {
		var res = await server.inject('/err')
		assert(res.statusCode === 500);
	});
});
