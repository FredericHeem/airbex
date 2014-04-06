module.exports = exports = function(app) {
    app.get('/ripple/bridge/out/bitcoin', exports.bridge)
    exports.app = app
}

exports.bridge = function(req, res, next) {
    if (req.query.type == 'quote') {
        return exports.quote(req, res, next)
    }

    return res.send(400, 'Unknown type')
}

exports.quote = function(req, res) {
    var amount = /^([\d+\.]+)\/BTC$/.exec(req.query.amount)[1]
    if (!amount) return res.send(400, 'Bad amount')
    if (isNaN(amount)) return res.send(400, 'Bad amount')

    res.send({
        status: 'success',
        type: 'ripple.bridge.out.bitcoin.quote.1',
        quote: {
            address: req.app.config.ripple_account,
            bitcoin_amount: amount,
            destination_tag: 1,
            expires: +new Date() + 1000 * 60 * 60,
            send: [
                {
                    currency: 'BTC',
                    issuer: req.app.config.ripple_account,
                    value: amount
                }
            ]
        }
    })
}
