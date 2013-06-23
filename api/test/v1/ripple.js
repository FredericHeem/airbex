/* global describe, it */
var expect = require('expect.js')
, ripple = require('../../v1/ripple')

describe('ripple', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				post: function(url) { routes.push('post ' + url) },
				get: function(url) { routes.push('get ' + url) }
			}
			ripple.configure(app, null)
			expect(routes).to.contain('post /v1/ripple/out')
			expect(routes).to.contain('get /v1/ripple/address')
			expect(routes).to.contain('get /ripple/federation')
		})
	})

	describe('address', function() {
		it('throws if there is no ripple account', function(done) {
			var conn = {
				read: {
					query: function(q, c) {
						c(null, { rows: [] })
					}
				}
			}
			, req = {
			}
			, res = {
				send: function(code) {
					expect(code).to.be(500)
					done()
				}
			}

			ripple.address(conn, req, res, done)
		})
	})

	describe('withdraw', function() {
		it('enqueues', function(done) {
			var addr = 'rfe8yiZUymRPx35BEwGjhfkaLmgNsTytxT'
			, conn = {
				write: {
					query: function(q, c) {
						if (q.text.match(/activity/)) return
						expect(q.text).to.match(/ripple_withdraw/i)
						expect(q.values).to.eql([98, 'BTC', addr, '50.3'])
						c(null, { rows: [{ request_id: 59 }] })
					}
				}
			}
			, req = {
				user: 98,
				body: {
					address: addr,
					amount: '50.3',
					currency: 'BTC'
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
