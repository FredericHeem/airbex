var Backbone = require('backbone')
, app = require('../app')
, Views = require('../views')
, DepositRouter = module.exports = Backbone.Router.extend({
    routes: {
        'my/deposit/BTC': 'depositBTC'
    },

    depositBTC: function() {
        if (!app.authorize()) return

        var model = new Backbone.Model({
            address: null
        })

        model.fetch({
            url: app.api.url + '/private/deposit/BTC/address',
            headers: app.api.headers()
        })

        var view = new Views.DepositBTCView({ model: model })
        app.section(view, true)
    }
})
