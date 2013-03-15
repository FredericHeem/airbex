var expect = require('expect.js')
, transactions = require(__filename.replace('test', 'lib'))

describe('transactions', function() {
	describe('configure', function() {
		it('adds expected routes', function() {
			var routes = []
			, app = {
				post: function(url) { routes.push('post ' + url) },
				get: function(url) { routes.push('get ' + url) }
			}
		})
	})

	describe('create', function() {
		it('is not implemented', function() {
			expect(function() {
				transactions.create()
			}).to.throwError(/TODO/)
		})
	})
})
