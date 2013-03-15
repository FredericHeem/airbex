var expect = require('expect.js')
, auth = require('../auth')

describe('auth', function() {
	describe('sign', function() {
		it('is predictable', function() {
			var sign = auth.sign({ hello: 'there' })
			expect(sign).to.be('7rtwqlKNv60iY4SPBluzZaGPzgiU7UNBPTVZpW1FaaQ=')
		})
	})
})
