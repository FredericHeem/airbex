var expect = require('expect.js')
, balances = require('../balances')

describe('balances', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				post: function(url) { routes.push('post ' + url) },
				get: function(url) { routes.push('get ' + url) }
			}
			balances.configure(app, null, 'BTC')
			expect(routes).to.contain('get /balances')
		})
	})

	describe('forUser', function() {
		it('returns balances', function(done) {
			var conn = {
				query: function(q, c) {
					expect(q.text).to.match(/from account_view/i)
					expect(q.text).to.match(/currency_id/i)
					expect(q.values).to.eql([25])
					c(null, { rows: [{ account_id: 301, currency_id: 'XRP', available: '1.2' }] })
				}
			}
			, req = {
				user: 25
			}
			, res = {
				send: function(r) {
					expect(r).to.be.an('array')
					expect(r[0].currency_id).to.be('XRP')
					expect(r[0].available).to.be('1.2')
					done()
				}
			}

			balances.forUser(conn, req, res, done)
		})
	})
})
