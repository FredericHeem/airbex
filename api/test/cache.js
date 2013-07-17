/* global describe, it */
var expect = require('expect.js')
, cache = require('../cache')

describe('cache', function() {
    describe('parseCurrency', function() {
        it('parses 0.5 NOK as 50000', function() {
            cache()
            var output = cache.parseCurrency('0.5', 'NOK')
            expect(output).to.be('50000')
        })
    })
})
