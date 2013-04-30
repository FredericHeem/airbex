var Backbone = require('backbone')
, expect = require('expect.js')
, TransferView = require('../../views/TransferView')
, _ = require('underscore')

describe('TransferView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var view = new TransferView({
                app: {
                    cache: {
                        balances: new Backbone.Collection(),
                        currencies: new Backbone.Collection()
                    }
                }
            })
        })
    })
})
