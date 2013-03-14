var expect = require('expect.js')
, BitcoinEdge = require(__filename.replace('test', 'lib'))

describe('routes', function() {
	describe('bitcoinedge', function() {
		describe('getUserSecurityAccount', function() {
			it('queries the database', function() {
				var target = {
					db: {
						query: function(q, c) {
							expect(q.text).to.match(/user_security_account/)
							expect(q.values).to.eql([5, 'LTC'])
							c(null, { rows: [{ account_id: 12 }] })
						}
					},
					options: {
						securityId: 'LTC'
					}
				}

				BitcoinEdge.prototype.getUserSecurityAccount.call(target, 5, 'LTC')
				.then(function(accountId) {
					expect(accountId).to.be(12)
				})
				.done()
			})
		})

		describe('getDepositAddress', function() {
			it('queries the database', function() {
				var target = {
					db: {
						query: function(q, c) {
							expect(q.text).to.match(/from btc_deposit_address/i)
							expect(q.values).to.eql([25])
							c(null, { rows: [{ address: '1someaddress' }] })
						}
					},
					options: {
						securityId: 'BTC'
					}
				}

				BitcoinEdge.prototype.getDepositAddress.call(target, 25)
				.then(function(address) {
					expect(address).to.be('1someaddress')
				})
				.done()
			})
		})

		describe('withdraw', function() {
			it('runs the database function', function() {
				var target = {
					db: {
						query: function(q, c) {
							expect(q.text).to.match(/btc_withdraw/i)
							expect(q.values).to.eql([7, '1someaddress', 150])
							c(null, { rows: [{ request_id: 59 }] })
						}
					},
					options: {
						securityId: 'BTC'
					}
				}

				BitcoinEdge.prototype.withdraw.call(target, 7, '1someaddress', 150)
				.then(function(requestId) {
					expect(requestId).to.be(59)
				})
				.done()
			})
		})

		describe('configure', function() {
			it('configures /pivate/withdraw/sec', function() {
				var target = {
					options: {
						securityId: 'XTC'
					}
				}
				, done
				, app = {
					post: function(url, handler) {
						if (url.match(/\/private\/withdraw\/XTC/)) {
							done = true
						}

						expect(handler).to.be.a('function')
					},
					get: function() {}
				}

				BitcoinEdge.prototype.configure.call(target, app)
				expect(done).to.be.ok()
			})

			it('configures /pivate/deposit/sec/address', function() {
				var target = {
					options: {
						securityId: 'QQQ'
					}
				}
				, done
				, app = {
					post: function() {},
					get: function(url, handler) {
						if (url.match(/\/private\/deposit\/QQQ\/address/)) {
							done = true
						}

						expect(handler).to.be.a('function')
					}
				}

				BitcoinEdge.prototype.configure.call(target, app)
				expect(done).to.be.ok()
			})
		})
	})
})
