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

        it('does not accept comma as decimal separator', function() {
            expect(function() {
                cache.parseCurrency('0,5')
            }).to.throwError(/invalid/i)
        })
    })

    describe('parseOrderPrice', function() {
        it('parses 0.7 NOK as 700', function() {
            cache()
            var output = cache.parseOrderPrice('0.7', 'BTCNOK')
            expect(output).to.be('700')
        })

        it('does not accept comma as decimal separator', function() {
            expect(function() {
                cache.parseOrderPrice('0,5')
            }).to.throwError(/invalid/i)
        })
    })

    describe('parseOrderVolume', function() {
        it('parses 0.7 NOK as 70000', function() {
            cache()
            var output = cache.parseOrderVolume('0.7', 'BTCNOK')
            expect(output).to.be('70000')
        })

        it('does not accept comma as decimal separator', function() {
            expect(function() {
                cache.parseOrderVolume('0,5')
            }).to.throwError(/invalid/i)
        })
    })
})
