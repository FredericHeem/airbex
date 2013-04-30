var Backbone = require('backbone')
, app = require('../app')
, WithdrawBTCView = require('../views/WithdrawBTCView')
, WithdrawLTCView = require('../views/WithdrawLTCView')
, WithdrawRouter = module.exports = Backbone.Router.extend({
    routes: {
        'my/withdraw/BTC': 'withdrawBTC',
        'my/withdraw/LTC': 'withdrawLTC'
    },

    withdrawBTC: function() {
        if (!app.authorize()) return
        var view = new WithdrawBTCView()
        app.section(view, true)
    },

    withdrawLTC: function() {
        if (!app.authorize()) return
        var view = new WithdrawLTCView()
        app.section(view, true)
    }
})
