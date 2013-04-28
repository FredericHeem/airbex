var Backbone = require('backbone')
, app = require('../app')
, Views = require('../views')
, TransferRouter = module.exports = Backbone.Router.extend({
    routes: {
        'my/transfer': 'transfer'
    },

    transfer: function(currency_id) {
        if (!app.authorize()) return

        var view = new Views.TransferView({
            app: app,
            currency_id: currency_id || null
        })
        app.section(view, true)
    }
})
