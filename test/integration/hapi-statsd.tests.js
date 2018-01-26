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
	server = new Hapi.Server({
		host: 'localhost',
		port: 8085
	});


	var get = function (request, reply) {
		return 'Success!';
	};

	var err = function (request, reply) {
		return new Error();
	};

	server.route({ method: ['GET','OPTIONS'], path: '/', handler: get, config: {cors: true}});
	server.route({ method: 'GET', path: '/err', handler: err, config: {cors: true} });
	server.route({ method: 'GET', path: '/test/{param}', handler: get, config: {cors: true}});

	try {
		return await server.register({
			plugin: plugin,
			options: { statsdClient: mockStatsdClient }
		});
	} catch (error){
		return error
	}
});

describe('hapi-statsd plugin tests', function() {

	it('should expose statsd client to the hapi server', function() {
		assert.equal(server.statsd, mockStatsdClient);
	});

	it('should report stats with no path in stat name', async function() {
		await server.inject('/');
		assert(mockStatsdClient.incStat == 'GET.200.counter');
		assert(mockStatsdClient.timingStat == 'GET.200.timer');
		assert(mockStatsdClient.timingDate instanceof Date);		
	});

	it('should report stats with path in stat name', async function() {
		await server.inject('/test/123');
		assert(mockStatsdClient.incStat == 'test_{param}.GET.200.counter');
		assert(mockStatsdClient.timingStat == 'test_{param}.GET.200.timer');
		assert(mockStatsdClient.timingDate instanceof Date);
	});

	it('should report stats with generic not found path', async function() {
		await server.inject('/fnord')
		assert(mockStatsdClient.incStat == '{notFound*}.GET.404.counter');
		assert(mockStatsdClient.timingStat == '{notFound*}.GET.404.timer');
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
		assert(mockStatsdClient.incStat == '{cors*}.OPTIONS.200.counter');
		assert(mockStatsdClient.timingStat == '{cors*}.OPTIONS.200.timer');
		assert(mockStatsdClient.timingDate instanceof Date);
	});

	it('should not change the status code of a response', async function() {
		var res = await server.inject('/err')
		assert(res.statusCode === 500);
	});
});
