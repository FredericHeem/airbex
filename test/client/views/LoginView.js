var Backbone = require('backbone')
, expect = require('expect.js')
, LoginView = require('../../../lib/client/views/LoginView')

describe('LoginView', function() {
    describe('hashes', function() {
        it('is predictable', function() {
            var view = new LoginView()
            view.render()
            view.$el.find('.email').val('a@abrkn.com')
            view.$el.find('.password').val('mommy')

            var actual = view.hashes()
            expect(actual).to.eql({
                key: 'M/8m25Zu1ynedQcvSK2D',
                secret: 'M/8m25Zu1ynedQcvSK2D'
            })
        })
    })
});
