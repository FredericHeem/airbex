var util = require('util')
, moment = require('moment')
, num = require('num')

module.exports = function(app, api) {
    var itemTemplate = require('./item.html')
    , controller = {
        $el: $(require('./template.html')())
    }
    , i18n = app.i18n
    , $items = controller.$el.find('.activities')

    function itemsChanged(items) {
        $items.html($.map(items, function(item) {
            if (item.type == 'CreateOrder') {
                item.text =  util.format(i18n('activities.CreateOrder'),
                (item.details.side || item.details.type) == 'bid' ? 'buy' : 'sell',
                item.details.volume || item.details.amount,
                item.details.market.substr(0, 3),
                num(item.details.price).mul(item.details.volume || item.details.amount).toString(),
                item.details.market.substr(3))
            } else if (item.type == 'CancelOrder') {
                item.text = util.format(i18n('activities.CancelOrder'), item.details.id)
            } else if (item.type == 'RippleWithdraw') {
                item.text = util.format(i18n('activities.RippleWithdraw'),
                    item.details.amount, item.details.currency, item.details.address)
            } else if (item.type == 'LTCWithdraw') {
                item.text = util.format(i18n('activities.LTCWithdraw'),
                    item.details.amount, item.details.address)
            } else if (item.type == 'BTCWithdraw') {
                item.text = util.format(i18n('activities.BTCWithdraw'),
                    item.details.amount, item.details.address)
            } else if (item.type == 'SendToUser') {
                item.text = util.format(i18n('activities.SendToUser'),
                    item.details.amount, item.details.currency, item.details.to)
            } else if (item.type == 'Created') {
                item.text = i18n('activities.Created')
            } else {
                item.text = JSON.stringify(item)
            }

            item.ago = moment(item.created).fromNow()

            return itemTemplate(item)
        }))
    }

    function refresh() {
        api.call('v1/activities').done(itemsChanged)
    }

    refresh()

    return controller
}
