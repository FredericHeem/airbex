var Backbone = require('backbone')
, expect = require('expect.js')
, CreateOrderView = require('../../views/CreateOrderView')

describe('CreateOrderView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var view = new CreateOrderView({
                market: new Backbone.Model({
                    base_currency: new Backbone.Model(),
                    quote_currency: new Backbone.Model()
                })
            })
        })
    })
})
