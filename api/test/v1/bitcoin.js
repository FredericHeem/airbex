/* global describe, it */
var expect = require('expect.js')
, bitcoin = require('../../v1/bitcoin')
, andy = '1abrknajSFpnz7MHjLkVnuvCbwd96wSYt'

describe('bitcoin', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				post: function(url) { routes.push('post ' + url) },
				get: function(url) { routes.push('get ' + url) }
			}
			bitcoin.configure(app, null, null, 'BTC')
			expect(routes).to.contain('post /v1/BTC/out')
			expect(routes).to.contain('get /v1/BTC/address')
		})
	})

	describe('address', function() {
		it('returns address', function(done) {
			var conn = {
				read: {
					query: function(q, c) {
						expect(q.text).to.match(/user_currency_account/i)
						expect(q.text).to.match(/from btc_deposit_address/i)
						expect(q.values).to.eql([25, 'BTC'])
						c(null, { rows: [{ address: '1someaddress' }] })
					}
				}
			}
			, req = {
				user: 25
			}
			, res = {
				send: function(code, r) {
					expect(code).to.be(200)
					expect(r.address).to.be('1someaddress')
					done()
				}
			}

			bitcoin.address(conn, 'BTC', req, res, done)
		})
	})

	describe('withdraw', function() {
		it('enqueues', function(done) {
			var conn = {
				write: {
					query: function(q, c) {
						if (q.text.match(/activity/)) return
						expect(q.text).to.match(/btc_withdraw/i)
						expect(q.values).to.eql([38, andy, '0.15', 'BTC'])
						c(null, { rows: [{ request_id: 59 }] })
					}
				}
			}
			, req = {
				user: 38,
				body: {
					address: '1abrknajSFpnz7MHjLkVnuvCbwd96wSYt',
					amount: '0.15'
				}
			}
			, res = {
				send: function(code, r) {
					expect(code).to.be(201)
					expect(r.id).to.be(59)
					done()
				}
			}

			bitcoin.withdraw(conn, 'BTC', req, res, done)
		})
	})
})
