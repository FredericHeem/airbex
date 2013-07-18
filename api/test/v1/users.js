/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, mock = require('../mock')

var app = require('../..')

describe('users', function() {
	describe('patch', function() {
		it('allows updating permitted values', function(done) {
			mock(app.conn.write, 'query', function(query, cb) {
				expect(query.values).to.eql([123, 'nb-NO'])
				cb()
			})

			mock(app.userAuth, 'primary', function() {
				arguments[arguments.length - 1]()
			})

			console.log(request.get, request.del, request.patch)

			request(app)
			.patch('/v1/users/current')
			.send({
				language: 'nb-NO'
			})
			.expect(204)
			.end(function(err) {
				app.conn.write.query.restore()
				app.userAuth.primary.restore()
				done(err)
			})
		})
	})
})
