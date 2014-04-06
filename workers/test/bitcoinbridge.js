/* global describe, it */
var expect = require('expect.js')
, bitcoinbridge = require('../bitcoinbridge')

describe('bitcoinbridge', function() {
    describe('parseInvoiceId', function() {
        it('parses known example', function() {
            var invoiceId = '0062A7D2DC9B144C213A94A1DB81240B6167139B3079EA303900000000000000'
            , expected = '19zeGPo3vkvUuSzs5d5BTYU13ZW5d8fJGG'
            , actual = bitcoinbridge.parseInvoiceId(invoiceId)

            expect(actual).to.be(expected)
        })
    })
})
