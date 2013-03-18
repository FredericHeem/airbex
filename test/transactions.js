var expect = require('expect.js')
, transactions = require('../transactions')

describe('transactions', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				post: function(url) { routes.push('post ' + url) },
				get: function(url) { routes.push('get ' + url) }
			}
			transactions.configure(app)
			expect(routes).to.contain('get /accounts/transactions')
			expect(routes).to.contain('get /accounts/:id/transactions')
		})
	})

	describe('forUser', function() {
		it('gets transactions for the user', function(done) {
			var conn = {
				query: function(q, cb) {
					expect(q.text).to.be('SELECT * FROM account_transaction WHERE user_id = $1')
					expect(q.values).to.eql([10])
					cb(null, {
						rows: [{
							transaction_id: 5
						}, {
							transaction_id: 7
						}]
					})
				}
			}
			, req = {
				security: { userId: 10 }
			}
			, res = {
				send: function(r) {
					expect(r).to.be.an('array')
					expect(r[0].transaction_id).to.be(5)
					expect(r[1].transaction_id).to.be(7)
					done()
				}
			}

			transactions.forUser(conn, req, res, done)
		})
	})

	describe('forUserAccount', function() {
		it('gets transactions for the user account', function(done) {
			var conn = {
				query: function(q, cb) {
					expect(q.text).to.be('SELECT * FROM account_transaction WHERE account_id = $1 AND user_id = $2')
					expect(q.values).to.eql([50, 10])
					cb(null, {
						rows: [{
							transaction_id: 5
						}, {
							transaction_id: 7
						}]
					})
				}
			}
			, req = {
				security: { userId: 10 },
				params: { id: 50 }
			}
			, res = {
				send: function(r) {
					expect(r).to.be.an('array')
					expect(r[0].transaction_id).to.be(5)
					expect(r[1].transaction_id).to.be(7)
					done()
				}
			}

			transactions.forUserAccount(conn, req, res, done)
		})
	})

	describe('create', function() {
		it('is not implemented', function() {
			expect(function() {
				transactions.create()
			}).to.throwError(/TODO/)
		})
	})
})
