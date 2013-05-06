module.exports = function(app, api) {
    var balanceTemplate = require('./balance.html')
    , controller = {
        $el: $(require('./template.html')())
    }
    , $summary = controller.$el.find('.account-summary')
    , $balances = $summary.find('.balances')
    , balancesTimer = null

    function balancesChanged(balances) {
        $balances.html($.map(balances, function(item) {
            return balanceTemplate(item)
        }))
    }

    app.on('balances', function(balances) {
        balancesChanged(balances)
        balancesTimer && clearTimeout(balancesTimer)
        balancesTimer = setTimeout(api.balances, 30e3)
    })

    app.on('user', function(user) {
        $summary.find('.email').html(user.email)
        api.balances()
    })

    return controller
}
