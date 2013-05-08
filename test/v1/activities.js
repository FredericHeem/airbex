var expect = require('expect.js')
, activities = require('../../v1/activities')

describe('activities', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				get: function(url) { routes.push('get ' + url) }
			}
			activities.configure(app)
			expect(routes).to.contain('get /v1/activities')
		})
	})

	describe('activities', function() {
		it('gets activities for the user', function(done) {
			var conn = {
				query: function(q, cb) {
					expect(q.text).to.match(/created/i)
					expect(q.text).to.match(/where user_id/i)
					expect(q.text).to.match(/details/i)
					expect(q.text).to.match(/FROM activity/i)
					expect(q.text).to.match(/\$1/i)
					expect(q.values).to.eql([10])
					cb(null, {
						rows: [{
							created: 123,
							details: JSON.stringify({ a: 1 })
						}, {
							created: 234,
							details: JSON.stringify({ b: 2 })
						}]
					})
				}
			}
			, req = {
				user: 10
			}
			, res = {
				send: function(r) {
					expect(r).to.be.an('array')
					expect(r[0].created).to.be(123)
					expect(r[1].created).to.be(234)
					expect(r[1].details.b).to.be(2)
					done()
				}
			}

			activities.activities(conn, req, res, done)
		})
	})
})
