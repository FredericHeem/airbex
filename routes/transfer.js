var Backbone = require('backbone')
, app = require('../app')
, TransferView = require('../views/TransferView')
, TransferRouter = module.exports = Backbone.Router.extend({
    routes: {
        'my/transfer': 'transfer'
    },

    transfer: function(currency) {
        if (!app.authorize()) return

        var view = new TransferView({
            app: app,
            currency: currency || null
        })

        app.section(view, true)
    }
})
