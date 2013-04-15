var Backbone = require('backbone')
, app = require('../app')
, Views = require('../views')
, TransferRouter = module.exports = Backbone.Router.extend({
    routes: {
        'my/deposit/BTC': 'depositBTC'
    },

    transfer: function(security_id) {
        if (!app.authorize()) return

        var view = new Views.SendView({
            app: app,
            security_id: security_id || null
        })
        app.section(view, true)
    }
})
