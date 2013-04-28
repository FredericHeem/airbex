var expect = require('expect.js')
, markets = require('../markets')

describe('markets', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				get: function(url) { routes.push('get ' + url) }
			}
			markets.configure(app)
			expect(routes).to.contain('get /markets')
			expect(routes).to.contain('get /markets/:id/depth')
		})
	})

	describe('markets', function() {
		it('returns the markets', function(done) {
			var conn = {
				query: function(q, c) {
					expect(q).to.match(/market/i)
					c(null, { rows: [{ market_id: 93 }] })
				}
			}
			, req = {
			}
			, res = {
				send: function(r) {
					expect(r[0].market_id).to.be(93)
					done()
				}
			}

			markets.markets(conn, req, res, done)
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

			markets.depth(conn, req, res, done)
		})
	})
})
