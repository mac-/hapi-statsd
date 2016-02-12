'use strict';
// Load modules

const Code = require( 'code' );
const Plugin = require( '..' );
const Lab = require( 'lab' );
const Hapi = require( 'hapi' );
const Assert = require( 'assert' );

// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;
const beforeEach = lab.beforeEach;


const mockStatsdClient = {

    incStat: '',
    timingStat: '',
    timingDate: '',

    increment(statName) {

        this.incStat = statName;
    },

    timing(statName, date) {

        this.timingStat = statName;
        this.timingDate = date;
    }
};
let server;

beforeEach( (done) => {

    server = new Hapi.Server();

    server.connection( {
        host: 'localhost',
        port: 8085
    } );

    const get = (request, reply) => reply( 'Success!' );
    const err = (request, reply) => reply( new Error() );

    server.route( { method: ['GET', 'OPTIONS'], path: '/', handler: get, config: { cors: true } } );
    server.route( { method: 'GET', path: '/err', handler: err, config: { cors: true } } );
    server.route( { method: 'GET', path: '/test/{param}', handler: get, config: { cors: true } } );

    server.register( {
        register: Plugin,
        options: { statsdClient: mockStatsdClient }
    }, done );
} );

describe( 'hapi-statsd()', () => {

    it( 'should expose statsd client to the hapi server', (done) => {

        expect( server.statsd ).to.equal( mockStatsdClient );
        done();
    } );

    it( 'should report stats with no path in stat name', (done) => {

        server.inject( '/', () => {

            Assert( mockStatsdClient.incStat === 'GET.200' );
            Assert( mockStatsdClient.timingStat === 'GET.200' );
            Assert( mockStatsdClient.timingDate instanceof Date );
            done();
        } );
    } );

    it( 'should report stats with path in stat name', (done) => {

        server.inject( '/test/123', () => {

            Assert( mockStatsdClient.incStat === 'test_{param}.GET.200' );
            Assert( mockStatsdClient.timingStat === 'test_{param}.GET.200' );
            Assert( mockStatsdClient.timingDate instanceof Date );
            done();
        } );
    } );

    it( 'should report stats with generic not found path', (done) => {

        server.inject( '/fnord', () => {

            Assert( mockStatsdClient.incStat === '{notFound*}.GET.404' );
            Assert( mockStatsdClient.timingStat === '{notFound*}.GET.404' );
            Assert( mockStatsdClient.timingDate instanceof Date );
            done();
        } );
    } );

    it( 'should report stats with generic CORS path', (done) => {

        server.inject( {
            method: 'OPTIONS',
            headers: {
                Origin: 'http://test.domain.com'
            },
            url: '/'
        }, () => {

            Assert( mockStatsdClient.incStat === '{cors*}.OPTIONS.200' );
            Assert( mockStatsdClient.timingStat === '{cors*}.OPTIONS.200' );
            Assert( mockStatsdClient.timingDate instanceof Date );
            done();
        } );
    } );

    it( 'should not change the status code of a response', (done) => {

        server.inject( '/err', (res) => {

            Assert( res.statusCode === 500 );
            done();
        } );
    } );

    it( 'should work with undefined options', (done) => {

        server = new Hapi.Server();

        server.connection( {
            host: 'localhost',
            port: 8085
        } );

        const get = (request, reply) => reply( 'Success!' );
        const err = (request, reply) => reply( new Error() );

        server.route( { method: ['GET', 'OPTIONS'], path: '/', handler: get, config: { cors: true } } );
        server.route( { method: 'GET', path: '/err', handler: err, config: { cors: true } } );
        server.route( { method: 'GET', path: '/test/{param}', handler: get, config: { cors: true } } );

        server.register( {
            register: Plugin
        }, done );
    } );

} );
