var expect = require('expect.js')
, bitcoin = require(__filename.replace('test', 'lib'))

describe('bitcoin', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				post: function(url) { routes.push('post ' + url) },
				get: function(url) { routes.push('get ' + url) }
			}
			bitcoin.configure(app, null, 'BTC')
			expect(routes).to.contain('post /private/withdraw/BTC')
			expect(routes).to.contain('get /private/deposit/BTC/address')
		})
	})

	describe('address', function() {
		it('returns address', function(done) {
			var conn = {
				query: function(q, c) {
					expect(q.text).to.match(/from btc_deposit_address/i)
					expect(q.values).to.eql([25, 'BTC'])
					c(null, { rows: [{ address: '1someaddress' }] })
				}
			}
			, req = {
				security: { userId: 25 }
			}
			, res = {
				send: function(r) {
					expect(r.address).to.eql('1someaddress')
					done()
				}
			}

			bitcoin.address(conn, 'BTC', req, res, done)
		})
	})

	describe('withdraw', function() {
		it('enqueues', function(done) {
			var conn = {
				query: function(q, c) {
					expect(q.text).to.match(/btc_withdraw/i)
					expect(q.values).to.eql([38, '1someaddress', 150])
					c(null, { rows: [{ request_id: 59 }] })
				}
			}
			, req = {
				security: { userId: 38 },
				body: {
					address: '1someaddress',
					amount: 150
				}
			}
			, res = {
				send: function(code, r) {
					expect(code).to.be(201)
					expect(r.request_id).to.be(59)
					done()
				}
			}

			bitcoin.withdraw(conn, 'btc', req, res, done)
		})
	})
})
