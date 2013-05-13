var num = require('num')
, Activities = require('../activities')
, Withdraws = require('./withdraws')

module.exports = function(app, api) {
    var template = require('./template.html')
    , controller = {
        $el: $('<div class="dashboard container"></div>').html(template())
    }
    , $balances = controller.$el.find('.balances')
    , $btc = $balances.find('.btc')
    , $ltc = $balances.find('.ltc')
    , $xrp = $balances.find('.xrp')
    , activities = Activities(app, api)
    , withdraws = Withdraws(app, api)
    , $activities = controller.$el.find('.activities')
    , $withdraws = controller.$el.find('.withdraws')
    , $depositXrp = controller.$el.find('.deposit-xrp')

    $activities.replaceWith(activities.$el)
    $withdraws.replaceWith(withdraws.$el)

    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function formatNumber(n, p) {
        var s = num(n).set_precision(p || 2).toString()
        return numberWithCommas(s)
    }

    function balancesUpdated(balances) {
        var indexed = balances.reduce(function(p, c) {
            p[c.currency] = c.available
            return p
        }, {})

        $btc.find('.available').html(formatNumber(indexed['BTC']) + ' BTC')
        $ltc.find('.available').html(formatNumber(indexed['LTC']) + ' LTC')
        $xrp.find('.available').html(formatNumber(indexed['XRP']) + ' XRP')
    }

    app.balances() && balancesUpdated(app.balances())
    app.on('balances', balancesUpdated)

    app.rippleAddress().done(function(address) {
        $depositXrp.attr('href', 'https://ripple.com//send?to=' + address + '&dt=' + app.user().id)
    })

    app.section('dashboard')

    return controller
}
