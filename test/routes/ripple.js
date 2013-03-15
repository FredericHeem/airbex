var expect = require('expect.js')
, ripple = require(__filename.replace('test', 'lib'))

describe('ripple', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				post: function(url) { routes.push('post ' + url) }
			}
			ripple.configure(app, null)
			expect(routes).to.contain('post /private/rippleout')
		})
	})

	describe('withdraw', function() {
		it('enqueues', function(done) {
			var conn = {
				query: function(q, c) {
					expect(q.text).to.match(/ripple_withdraw/i)
					expect(q.values).to.eql([98, 'rsomeaddress', 503])
					c(null, { rows: [{ request_id: 59 }] })
				}
			}
			, req = {
				security: { userId: 38 },
				body: {
					address: 'rsomeaddress',
					amount: 503
				}
			}
			, res = {
				send: function(code, r) {
					expect(code).to.be(201)
					expect(r.request_id).to.be(59)
					ripple.getUserSecurityAccount = gusa
					done()
				}
			}
			, gusa = ripple.getUserSecurityAccount
			ripple.getUserSecurityAccount = function() {
				return {
					then: function(x) {
						x(98)
					}
				}
			}

			ripple.withdraw(conn, req, res, done)
		})
	})
})
