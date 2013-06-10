var expect = require('expect.js')
, users = require('../../v1/users')

describe('users', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				post: function(url) { routes.push('post ' + url) },
				get: function(url) { routes.push('get ' + url) }
			}
			users.configure(app)
			expect(routes).to.contain('post /v1/users')
			expect(routes).to.contain('get /v1/whoami')
		})
	})

	describe('create', function() {
		it('returns user', function(done) {
			var emailExistence = require('email-existence')
			, check = emailExistence.check
			, key = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBBB'
			, conn = {
				write: {
					query: function(q, c) {
						if (q.text.match(/activity/)) return
						expect(q.text).to.match(/select create_user/i)
						expect(q.values).to.eql(['bob@bob.com', key, true])
						c(null, { rows: [{ user_id: 89 }] })
					}
				}
			}
			, req = {
				body: {
					email: 'bob@bob.com',
					key: key,
					simple: true
				}
			}
			, res = {
				send: function(code, r) {
					expect(code).to.be(201)
					expect(r.id).to.be(89)
					done()
				}
			}

			emailExistence.check = function(email, cb) {
				emailExistence.check = check
				cb(null, true)
			}

			users.create(conn, req, res, done)
		})
	})
})
