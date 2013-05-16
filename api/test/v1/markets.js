var expect = require('expect.js')
, markets = require('../../v1/markets')

describe('markets', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				get: function(url) { routes.push('get ' + url) }
			}
			markets.configure(app)
			expect(routes).to.contain('get /v1/markets')
			expect(routes).to.contain('get /v1/markets/:id/depth')
		})
	})

	describe('markets', function() {
		it('returns the markets', function(done) {
			var conn = {
				read: {
					query: function(q, c) {
						expect(q).to.match(/market/i)
						c(null, { rows: [{ base_currency_id: 'DRP', quote_currency_id: 'HRP'  }] })
					}
				}
			}
			, req = {
				app: {
					cache: {
						formatOrderPrice: function() {
							return 'formatted'
						},
						formatOrderVolume: function() {
							return 'formatted'
						},
					}
				}
			}
			, res = {
				send: function(r) {
					expect(r[0].id).to.be('DRPHRP')
					done()
				}
			}

			markets.markets(conn, req, res, done)
		})
	})

	describe('depth', function() {
		it('returns the depth', function(done) {
			var conn = {
				read: {
					query: function(q, c) {
						expect(q.text).to.match(/order_depth/i)
						expect(q.values).to.eql([8])
						c(null, { rows: [
							{ price: 9, volume: 123, type: 0 },
							{ price: 9.5, volume: 55, type: 0 },
							{ price: 8.5, volume: 87, type: 1 },
						]})
					}
				}
			}
			, req = {
				params: {
					id: 8
				},
				query: {},
				app: {
					cache: {
						formatOrderPrice: function(v) {
							return v.toString()
						},
						formatOrderVolume: function(v) {
							return v.toString()
						},
					}
				}
			}
			, res = {
				send: function(r) {
					expect(r.bids).to.be.an('array')
					expect(r.bids).to.have.length(2)
					expect(r.bids[0]).to.be.an('array')
					expect(r.bids[0]).to.have.length(2)
					expect(r.bids[0][0]).to.be('9')
					expect(r.bids[0][1]).to.be('123')

					expect(r.asks).to.be.an('array')
					expect(r.asks).to.have.length(1)
					expect(r.asks[0]).to.be.an('array')
					expect(r.asks[0]).to.have.length(2)
					expect(r.asks[0][0]).to.be('8.5')
					expect(r.asks[0][1]).to.be('87')

					done()
				}
			}

			markets.depth(conn, req, res, done)
		})
	})
})
