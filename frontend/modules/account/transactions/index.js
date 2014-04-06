var nav = require('../nav')
,  itemTemplate = require('./item.html')
, template = require('./index.html')

module.exports = function(skip) {
    var $el = $('<div class=account-transactions>').html(template())
    , controller = {
        $el: $el
    }
    , $trans = controller.$el.find('.transactions')

    function search() {
        var q = {}
        if (skip) q.skip = skip
        $el.addClass('is-loading')
        api.call('v1/transactions', q)
        .fail(errors.alertFromXhr)
        .done(paint)
    }

    function paint(res) {
        $trans.html($.map(res.transactions, function(tran) {
            var $item = $(itemTemplate(tran))

            $item
            .find('.amount')
            .toggleClass('success', +tran.amount > 0)
            .toggleClass('danger', +tran.amount < 0)

            return $item
        }))

        if (skip + res.transactions.length >= res.count) {
            $el.find('.pager .next')
            .addClass('disabled')
            .find('a')
            .css('pointer-events', 'none')
        } else {
            $el.find('.pager .next a')
            .attr('href', '#account/transactions/' + (skip + res.transactions.length))
        }


        if (!skip) {
            $el.find('.pager .previous')
            .addClass('disabled')
            .find('a')
            .css('pointer-events', 'none')
        } else {
            var prev = Math.max(0, skip - res.limit)
            $el.find('.pager .previous a')
            .attr('href', '#account/transactions' + (prev > 0 ? '/' + prev : ''))
        }

        $el.removeClass('is-loading')
    }

    search()

    $el.find('.account-nav').replaceWith(nav('transactions').$el)

    return controller
}
