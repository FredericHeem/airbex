/* global describe, it */
var expect = require('expect.js')
, currencies = require('../../v1/currencies')

describe('currencies', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				get: function(url) { routes.push('get ' + url) }
			}
			currencies.configure(app)
			expect(routes).to.contain('get /v1/currencies')
		})
	})

	describe('currencies', function() {
		it('returns the currencies', function(done) {
			var conn = {
				read: {
					query: function(q, c) {
						expect(q).to.match(/from "currency"/i)
						c(null, { rows: [{ currency: 'QQQ' }] })
					}
				}
			}
			, req = {
			}
			, res = {
				send: function(r) {
					expect(r[0].currency).to.be('QQQ')
					done()
				}
			}

			currencies.currencies(req, res, done)
		})
	})
})
