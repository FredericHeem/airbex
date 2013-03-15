var expect = require('expect.js')
, users = require('../users')

describe('users', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				post: function(url) { routes.push('post ' + url) }
			}
			users.configure(app)
			expect(routes).to.contain('post /public/users')
		})
	})

	describe('create', function() {
		it('returns users', function(done) {
			var conn = {
				query: function(q, c) {
					expect(q.text).to.match(/select create_user/i)
					expect(q.values).to.eql(['key', 'secreto'])
					c(null, { rows: [{ user_id: 89 }] })
				}
			}
			, req = {
				body: {
					key: 'key',
					secret: 'secreto'
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
