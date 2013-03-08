var Backbone = require('backbone')
, expect = require('expect.js')
, SendView = require('../../../lib/client/views/SendView')

describe('SendView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var view = new SendView({
                app: {
                    user: new Backbone.Model({
                        accounts: new Backbone.Collection()
                    })
                }
            })
        })
    })
})
