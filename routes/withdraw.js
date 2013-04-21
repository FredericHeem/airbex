var Backbone = require('backbone')
, app = require('../app')
, Views = require('../views')
, WithdrawRouter = module.exports = Backbone.Router.extend({
    routes: {
        'my/withdraw/BTC': 'withdrawBTC',
        'my/withdraw/LTC': 'withdrawLTC'
    },

    withdrawBTC: function() {
        if (!app.authorize()) return
        var view = new Views.WithdrawBTCView()
        app.section(view, true)
    },

    withdrawLTC: function() {
        if (!app.authorize()) return
        var view = new Views.WithdrawLTCView()
        app.section(view, true)
    }
})
