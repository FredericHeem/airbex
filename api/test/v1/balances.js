/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')

describe('balances', function() {
	describe('index', function() {
		it('returns balances', function(done) {
			var impersonate = mock.impersonate(app, 123)
			, read = mock(app.conn.read, 'query', function(query, cb) {
				expect(query.text).to.match(/FROM account/)
				expect(query.text).to.match(/user_id =/)
				expect(query.values).to.eql([123])
				cb(null, {
					rows: [
						{
							currency_id: 'BTC',
							available: 123000000,
							hold: 0,
							balance: 123000000
						},
						{
							currency_id: 'NOK',
							available: 12345
						}
					]
				})
			})

			request(app)
			.get('/v1/balances')
			.expect(200)
			.expect('Content-Type', /json/)
			.expect([
				{
					currency: 'BTC',
					balance: '1.23000000',
					hold: '0.00000000',
					available: '1.23000000'
				},
				{
					currency: 'NOK',
					balance: '0.00000',
					hold: '0.00000',
					available: '0.12345'
				}
			])
			.end(function(err) {
				impersonate.restore()
				read.restore()
				done(err)
			})
		})
	})
})
