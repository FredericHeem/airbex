var expect = require('expect.js')
, users = require('../users')

describe('users', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				post: function(url) { routes.push('post ' + url) },
				get: function(url) { routes.push('get ' + url) }
			}
			users.configure(app)
			expect(routes).to.contain('post /users')
			expect(routes).to.contain('get /whoami')
		})
	})

	describe('create', function() {
		it('returns user', function(done) {
			var key = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBB'
			, conn = {
				query: function(q, c) {
					expect(q.text).to.match(/select create_user/i)
					expect(q.values).to.eql(['bob@bob.com', key])
					c(null, { rows: [{ user_id: 89 }] })
				}
			}
			, req = {
				body: {
					email: 'bob@bob.com',
					key: key
				}
			}
			, res = {
				send: function(code, r) {
					expect(code).to.be(201)
					expect(r.user_id).to.be(89)
					done()
				}
			}

			users.create(conn, req, res, done)
		})
	})
})
