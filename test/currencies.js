var expect = require('expect.js')
, currencies = require('../currencies')

describe('currencies', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				get: function(url) { routes.push('get ' + url) }
			}
			currencies.configure(app)
			expect(routes).to.contain('get /currencies')
		})
	})

	describe('currencies', function() {
		it('returns the currencies', function(done) {
			var conn = {
				query: function(q, c) {
					expect(q).to.match(/from "currency"/i)
					c(null, { rows: [{ currency_id: 'QQQ' }] })
				}
			}
			, req = {
			}
			, res = {
				send: function(r) {
					expect(r[0].currency_id).to.be('QQQ')
					done()
				}
			}

			currencies.currencies(conn, req, res, done)
		})
	})
})
