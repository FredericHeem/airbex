var expect = require('expect.js')
, ripple = require('../ripple')

describe('ripple', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				post: function(url) { routes.push('post ' + url) },
				get: function(url) { routes.push('get ' + url) }
			}
			ripple.configure(app, null)
			expect(routes).to.contain('post /ripple/out')
			expect(routes).to.contain('get /ripple/address')
			expect(routes).to.contain('get /ripple/federation')
		})
	})

	describe('address', function() {
		it('throws if there is no ripple account', function(done) {
			var conn = {
				query: function(q, c) {
					c(null, { rows: [] })
				}
			}
			, req = {
			}
			, res = {
				send: function(code, r) {
					expect(code).to.be(500)
					done()
				}
			}

			ripple.address(conn, req, res, done)
		})
	})

	describe('withdraw', function() {
		it('enqueues', function(done) {
			var conn = {
				query: function(q, c) {
					if (q.text.match(/activity/)) return
					expect(q.text).to.match(/ripple_withdraw/i)
					expect(q.values).to.eql([98, 'QQQ', 'rsomeaddress', '50.3'])
					c(null, { rows: [{ request_id: 59 }] })
				}
			}
			, req = {
				user: 98,
				body: {
					address: 'rsomeaddress',
					amount: '50.3',
					currencyId: 'QQQ'
				}
			}
			, res = {
				send: function(code, r) {
					expect(code).to.be(201)
					expect(r.id).to.be(59)
					done()
				}
			}

			ripple.withdraw(conn, req, res, done)
		})
	})
})
