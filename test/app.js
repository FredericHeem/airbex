var Backbone = require('backbone')
, expect = require('expect.js')
, app = require('../app')

describe('app', function() {
    describe('keyFromCredentials', function() {
        it('is predictable', function() {
            var expected = '57c5aa1587bf3ba9085ed604749e8bfad56155fae76ef3841f890753c12de512'

            var actual = app.keyFromCredentials('a@abrkn.com', 'mommy')

            expect(actual).to.eql(expected)
        })

        it('is case-insensitive', function() {
            var expected = '57c5aa1587bf3ba9085ed604749e8bfad56155fae76ef3841f890753c12de512'

            var actual = app.keyFromCredentials('A@aBrKn.CoM', 'mommy')

            expect(actual).to.eql(expected)
        })
    })
});
