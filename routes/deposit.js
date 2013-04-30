var Backbone = require('backbone')
, app = require('../app')
, DepositBTCView = require('../views/DepositBTCView')
, DepositLTCView = require('../views/DepositLTCView')
, DepositRouter = module.exports = Backbone.Router.extend({
    routes: {
        'my/deposit/BTC': 'depositBTC',
        'my/deposit/LTC': 'depositLTC',
    },

    depositBTC: function() {
        if (!app.authorize()) return

        var model = new Backbone.Model({
            address: null
        })

        model.fetch({
            url: app.apiUrl + '/deposit/BTC/address',
            username: 'api',
            password: app.apiKey
        })

        var view = new DepositBTCView({ model: model })
        app.section(view, true)
    },

    depositLTC: function() {
        if (!app.authorize()) return

        var model = new Backbone.Model({
            address: null
        })

        model.fetch({
            url: app.apiUrl + '/deposit/LTC/address',
            username: 'api',
            password: app.apiKey
        })

        var view = new DepositLTCView({ model: model })
        app.section(view, true)
    }
})
