var Backbone = require('backbone')
, expect = require('expect.js')
, TransferView = require('../../views/TransferView')
, _ = require('underscore')

describe('TransferView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var view = new TransferView({
                app: {
                    user: new Backbone.Model({
                        balances: new Backbone.Collection()
                    }),
                    cache: {
                        currencies: _([{ currency_id: 'BTC' }])
                    }
                }
            })
        })
    })
})
