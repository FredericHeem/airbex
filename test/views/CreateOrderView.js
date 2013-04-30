var Backbone = require('backbone')
, expect = require('expect.js')
, Market = require('../../models/Market')
, CreateOrderView = require('../../views/CreateOrderView')

describe('CreateOrderView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var view = new CreateOrderView({
                market: new Market({
                    id: 'ABC123'
                })
            })
        })
    })
})
