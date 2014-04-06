var format = require('util').format

module.exports = function(router, master, authorize) {
    return router
    .add(/^trade$/, function() {
        var market = $.cookie('tradeMarket') || api.defaultMarket()
        router.go(format('trade/%s', market), true)
    })
    .add(/^trade\/([A-Z]{6})$/, function(market) {
        router.go(format(
            'trade/%s/%s',
            market,
            $.cookie('tradeMode') == 'advanced' ? 'advanced' : 'instant'),
        true)
    })
    .add(/^trade\/([A-Z]{6})\/stats$/,
        function(market)
    {
        master(require('./stats')(market), 'trade')
    })
    .add(/^trade\/([A-Z]{6})\/(advanced|instant)$/, function(market, mode) {
        router.go(format(
            'trade/%s/%s/%s',
            market,
            mode,
            $.cookie('tradeType') == 'sell' ? 'sell' : 'buy'),
        true)
    })
    .add(/^trade\/([A-Z]{6})\/(instant|advanced)\/(buy|sell)$/,
        function(market, mode, type)
    {
        if (!authorize.user(2)) return

        $.cookie('tradeMode', mode, { expires: 10 * 356 * 7 })
        $.cookie('tradeMarket', market, { expires: 10 * 356 * 7 })
        $.cookie('tradeType', type, { expires: 10 * 356 * 7 })

        mode = mode == 'instant' ? 'market' : 'limit'
        type = type == 'buy' ? 'bid' : 'ask'

        master(require('./market')(market, mode, type), 'trade')
    })
    .add(/^trade\/orders$/, function() {
        if (!authorize.user()) return
        master(require('./orders')(), 'trade')
    })
}
