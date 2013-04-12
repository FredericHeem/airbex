var Backbone = require('backbone')
, expect = require('expect.js')
, DepositBTCView = require('../../views/DepositBTCView')

describe('DepositBTCView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var view = new DepositBTCView({
            	model: new Backbone.Model()
            })
        })
    })
})
