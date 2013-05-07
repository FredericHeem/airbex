var util = require('util')
, moment = require('moment')
, num = require('num')

module.exports = function(app, api) {
    var itemTemplate = require('./item.html')
    , controller = {
        $el: $(require('./template.html')())
    }
    , $items = controller.$el.find('.activities')

    function itemsChanged(items) {
        $items.html($.map(items, function(item) {
            if (item.type == 'CreateOrder') {
                item.text =  util.format('You created an order to %s %s %s for %s %s',
                item.details.side == 'bid' ? 'buy' : 'sell',
                item.details.volume,
                item.details.market.substr(0, 3),
                num(item.details.price).mul(item.details.volume).toString(),
                item.details.market.substr(3))
            } else if (item.type == 'CancelOrder') {
                item.text = util.format('You cancelled order #%s', item.details.id)
            } else if (item.type == 'RippleWithdraw') {
                item.text = util.format('You requested to withdraw %s %s to Ripple (%s)',
                    item.details.amount, item.details.currency, item.details.address)
            } else if (item.type == 'LTCWithdraw') {
                item.text = util.format('You requested to withdraw %s LTC to %s',
                    item.details.amount, item.details.address)
            } else if (item.type == 'BTCWithdraw') {
                item.text = util.format('You requested to withdraw %s BTC to %s',
                    item.details.amount, item.details.address)
            } else if (item.type == 'SendToUser') {
                item.text = util.format('You sent %s %s to %s',
                    item.details.amount, item.details.currency, item.details.to)
            } else if (item.type == 'Created') {
                item.text = 'You created this user account'
            } else {
                item.text = JSON.stringify(item)
            }

            item.ago = moment(item.created).fromNow()

            return itemTemplate(item)
        }))
    }

    function refresh() {
        api.call('activities').done(itemsChanged)
    }

    refresh()

    return controller
}
