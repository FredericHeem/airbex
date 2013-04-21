var Backbone = require('backbone')
, app = require('../app')
, Views = require('../views')
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
            headers: app.apiHeaders()
        })

        var view = new Views.DepositBTCView({ model: model })
        app.section(view, true)
    },

    depositLTC: function() {
        if (!app.authorize()) return

        var model = new Backbone.Model({
            address: null
        })

        model.fetch({
            url: app.apiUrl + '/deposit/LTC/address',
            headers: app.apiHeaders()
        })

        var view = new Views.DepositLTCView({ model: model })
        app.section(view, true)
    }
})
