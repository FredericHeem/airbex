var expect = require('expect.js')
, orders = require('../orders')

describe('orders', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				del: function(url) { routes.push('del ' + url) },
				post: function(url) { routes.push('post ' + url) },
				get: function(url) { routes.push('get ' + url) }
			}
			orders.configure(app)
			expect(routes).to.contain('del /orders/:id')
			expect(routes).to.contain('post /orders')
			expect(routes).to.contain('get /orders')
		})
	})

	describe('forUser', function() {
		it('gets orders for the user', function(done) {
			var conn = {
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
			, req = {
				security: { userId: 10 }
			}
			, res = {
				send: function(r) {
					expect(r).to.be.an('array')
					expect(r[0].order_id).to.be(1)
					expect(r[1].order_id).to.be(7)
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

				query: function(q, cb) {
					expect(q).to.be('built')
					cb(null, { rows: [{ order_id: 17 }] })
				}
			}
			, req = {
				security: { userId: 8 },
				body: {
					book_id: 7,
					volume: 9,
					price: 12,
					side: 1
				}
			}
			, res = {
				send: function(code, r) {
					expect(code).to.be(201)
					expect(r).to.eql({ order_id: 17 })
					done()
				}
			}

			orders.create(conn, req, res, done)
		})
	})

	describe('cancel', function() {
		it('cancels the order', function(done) {
			var conn = {
				query: function(q, cb) {
					expect(q.text).to.match(/UPDATE "order"/)
					expect(q.text).to.match(/cancelled = volume/)
					expect(q.values)
					cb(null, { rowCount: 1 })
				}
			}
			, req = {
				security: { userId: 3 },
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
	})
})
