/* global describe, it */
var expect = require('expect.js')
, Cache = require('../cache')

describe('cache', function() {
    describe('parseCurrency', function() {
        it('parses 0.5 NOK as 50000', function() {
            var input = '0.5'
            var output = Cache.prototype.parseCurrency.call({
                currencies: {
                    'NOK': { scale: 5 }
                }
            }, input, 'NOK')
            expect(output).to.be('50000')
        })
    })
})
