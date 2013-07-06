/* global describe, it */
var expect = require('expect.js')
, orders = require('../../v1/orders')

describe('orders', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				del: function(url) { routes.push('delete ' + url) },
				post: function(url) { routes.push('post ' + url) },
				get: function(url) { routes.push('get ' + url) }
			}
			orders.configure(app)
			expect(routes).to.contain('delete /v1/orders/:id')
			expect(routes).to.contain('post /v1/orders')
			expect(routes).to.contain('get /v1/orders')
		})
	})

	describe('forUser', function() {
		it('gets orders for the user', function(done) {
			var conn = {
				read: {
					query: function(q, cb) {
						expect(q.text).to.match(/user_id = \$1/)
						expect(q.values).to.eql([10])
						cb(null, {
							rows: [{
								order_id: 1
							}, {
								order_id: 7
							}]
						})
					}
				}
			}
			, req = {
				user: 10,
				app: {
					cache: {
						formatOrderVolume: function() {
							return 'formatted-v'
						},
						formatOrderPrice: function() {
							return 'formatted-p'
						}
					}
				}
			}
			, res = {
				send: function(r) {
					expect(r).to.be.an('array')
					expect(r[0].id).to.be(1)
					expect(r[1].id).to.be(7)
					done()
				}
			}

			orders.forUser(conn, req, res, done)
		})

		it('formats numbers', function(done) {
			var conn = {
				read: {
					query: function(q, cb) {
						expect(q.text).to.match(/user_id = \$1/)
						expect(q.values).to.eql([10])
						cb(null, {
							rows: [{
								order_id: 1,
								price: '1.2',
								volume: '1.34'
							}]
						})
					}
				}
			}
			, req = {
				user: 10,
				app: {
					cache: {
						formatOrderVolume: function() {
							return 'formatted-v'
						},
						formatOrderPrice: function() {
							return 'formatted-p'
						}
					}
				}
			}
			, res = {
				send: function(r) {
					expect(r).to.be.an('array')
					expect(r[0].id).to.be(1)
					expect(r[0].amount).to.be('formatted-v')
					expect(r[0].price).to.be('formatted-p')
					done()
				}
			}

			orders.forUser(conn, req, res, done)
		})
	})

	describe('create', function() {
		it('creates the order', function(done) {
			var conn = {
				build: {
					insert: function() {
						return 'built'
					}
				},

				write: {
					query: function(q, cb) {
						if (q.text.match(/activity/)) return
						expect(q.text).to.match(/INSERT INTO "order"/i)
						cb(null, { rows: [{ oid: 17 }] })
					}
				}
			}
			, req = {
				user: 8,
				apiKey: { canTrade: true },
				body: {
					market: 'BTCUSD',
					amount: '9',
					price: '12',
					type: 'ask'
				}
			}
			, res = {
				send: function(code, r) {
					expect(code).to.be(201)
					expect(r.id).to.be(17)
					done()
				}
			}

			orders.create(conn, req, res, done)
		})

		it('requires canTrade api key permission', function(done) {
			var conn = {
				build: {
					insert: function() {
						return 'built'
					}
				},

				write: {
					query: function(q, cb) {
						if (q.text.match(/activity/)) return
						expect(q.text).to.match(/INSERT INTO "order"/i)
						cb(null, { rows: [{ order_id: 17 }] })
					}
				}
			}
			, req = {
				user: 8,
				apiKey: {},
				body: {
					market: 'BTCUSD',
					amount: '9',
					price: '12',
					type: 'ask'
				}
			}
			, res = {
				send: function(code) {
					expect(code).to.be(401)
					done()
				}
			}

			orders.create(conn, req, res, done)
		})
	})

	describe('cancel', function() {
		it('cancels the order', function(done) {
			var conn = {
				write: {
					query: function(q, cb) {
						if (q.text.match(/activity/)) return
						expect(q.text).to.match(/UPDATE "order"/)
						expect(q.text).to.match(/cancelled = volume/)
						expect(q.values)
						cb(null, { rowCount: 1 })
					}
				}
			}
			, req = {
				user: 3,
				apiKey: { canTrade: true },
				params: {
					id: 9
				}
			}
			, res = {
				send: function(code) {
					expect(code).to.be(204)
					done()
				}
			}

			orders.cancel(conn, req, res, done)
		})

		it('requires canTrade api key permission', function(done) {
			var conn = {
				write: {
					query: function(q, cb) {
						if (q.text.match(/activity/)) return
						expect(q.text).to.match(/UPDATE "order"/)
						expect(q.text).to.match(/cancelled = volume/)
						expect(q.values)
						cb(null, { rowCount: 1 })
					}
				}
			}
			, req = {
				user: 3,
				apiKey: {},
				params: {
					id: 9
				}
			}
			, res = {
				send: function(code) {
					expect(code).to.be(401)
					done()
				}
			}

			orders.cancel(conn, req, res, done)
		})
	})
})
