var expect = require('expect.js')
, books = require('../books')

describe('books', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				get: function(url) { routes.push('get ' + url) }
			}
			books.configure(app)
			expect(routes).to.contain('get /public/books')
			expect(routes).to.contain('get /public/books/:id/depth')
		})
	})

	describe('books', function() {
		it('returns the books', function(done) {
			var conn = {
				query: function(q, c) {
					expect(q).to.match(/books_overview/i)
					c(null, { rows: [{ book_id: 93 }] })
				}
			}
			, req = {
			}
			, res = {
				send: function(r) {
					expect(r[0].book_id).to.be(93)
					done()
				}
			}

			books.books(conn, req, res, done)
		})
	})

	describe('depth', function() {
		it('returns the depth', function(done) {
			var conn = {
				query: function(q, c) {
					expect(q.text).to.match(/order_depth/i)
					expect(q.values).to.eql([8])
					c(null, { rows: [{ price: 9 }] })
				}
			}
			, req = {
				params: {
					id: 8
				},
				query: {}
			}
			, res = {
				send: function(r) {
					expect(r[0].price).to.be(9)
					done()
				}
			}

			books.depth(conn, req, res, done)
		})
	})
})
