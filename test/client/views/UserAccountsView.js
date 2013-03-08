var Backbone = require('backbone')
, expect = require('expect.js')
, UserAccountsView = require('../../../lib/client/views/UserAccountsView')

describe('UserAccountsView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var coll = new Backbone.Collection()
            var view = new UserAccountsView({
                collection: coll
            })
        })
    })
})
