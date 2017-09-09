var template = require('./index.html')
, itemTemplate = require('./item.html')

module.exports = function() {
    var $el = $('<div class="vouchers">').html(template())
    , controller = {
        $el: $el
    }
    , $items = $el.find('.vouchers')

    function refresh() {
        api.call('v1/vouchers')
        .then(itemsUpdated)
        .fail(errors.alertFromXhr)
        
    }

    function itemsUpdated(items) {
        $el.toggleClass('is-empty', !items.length)
        $items.html($.map(items, function(item) {
            return $(itemTemplate(item))
        }))
    }

    $items.on('click', '.cancel', function(e) {
        e.preventDefault()

        var $item = $(this).closest('.voucher')
        , $button = $(this).loading(true)
        , url = 'v1/vouchers/' + $item.attr('data-id') + '/redeem'

        api.call(url, null, { type: 'POST' })
        .then(function() {
            $item.fadeAway()
            api.fetchBalances()
        })
        .fail(function(err) {
            if (err.name == 'VoucherNotFound') {
                alertify.alert('The voucher does not exist or ' +
                    'has already been redeemed')
                return
            }

            errors.alertFromXhr(err)
        })
        .finally(function() {
            $button.loading(false)
        })


    })

    refresh()

    return controller
}
