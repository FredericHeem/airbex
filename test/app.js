var Backbone = require('backbone')
, expect = require('expect.js')
, app = require('../app')

describe('app', function() {
    describe('hashCredentials', function() {
        it('is predictable', function() {
            var expected = {
                key: 'M/8m25Zu1ynedQcvSK2D',
                secret: 'Ez4xdbllzJJsS287FfyR'
            }

            var actual = app.hashCredentials('a@abrkn.com', 'mommy')

            expect(actual).to.eql(expected)
        })

        it('is case-insensitive', function() {
            var expected = {
                key: 'M/8m25Zu1ynedQcvSK2D',
                secret: 'Ez4xdbllzJJsS287FfyR'
            }

            var actual = app.hashCredentials('A@aBrKn.CoM', 'mommy')

            expect(actual).to.eql(expected)
        })
    })
});
