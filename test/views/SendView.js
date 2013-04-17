var Backbone = require('backbone')
, expect = require('expect.js')
, SendView = require('../../views/SendView')
, _ = require('underscore')

describe('SendView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var view = new SendView({
                app: {
                    user: new Backbone.Model({
                        accounts: new Backbone.Collection()
                    }),
                    cache: {
                        securities: _([{ security_id: 'BTC' }])
                    }
                }
            })
        })
    })
})
