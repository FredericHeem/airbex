var expect = require('expect.js')
, securities = require('../securities')

describe('securities', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				get: function(url) { routes.push('get ' + url) }
			}
			securities.configure(app)
			expect(routes).to.contain('get /securities')
		})
	})

	describe('securities', function() {
		it('returns the securities', function(done) {
			var conn = {
				query: function(q, c) {
					expect(q).to.match(/from "security"/i)
					c(null, { rows: [{ security_id: 'QQQ' }] })
				}
			}
			, req = {
			}
			, res = {
				send: function(r) {
					expect(r[0].security_id).to.be('QQQ')
					done()
				}
			}

			securities.securities(conn, req, res, done)
		})
	})
})
