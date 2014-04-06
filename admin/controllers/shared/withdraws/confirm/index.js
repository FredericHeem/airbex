var template = require('./index.html')
, num = require('num')

module.exports = function(wr) {
    var fees = {
        'NOK': '10',
        'EUR': '5',
        'USD': '14'
    }
    , fee = fees[wr.currency] || 0
    , $el = $('<div class=confirm-withdraw>')
    .html(template({
        net: num(wr.amount).sub(fee).toString(),
        fee: fee
    }))
    , controller = {
        $el: $el
    }
    , $modal = $el.find('.modal').modal()
    , $net = $el.field('net')
    , $fee = $el.field('fee')
    , $total = $el.field('total')

    function recalculate() {
        var net = num($net.val())
        , fee = num($fee.val())
        , total = net.add(fee)
        $total.val(total.toString())

        var valid = total.eq(wr.amount)

        $el.find('.total').toggleClass('error', !valid)
        $el.find('button[type="submit"]').enabled(valid)
    }

    $fee.add($total).add($total).on('change keyup', function() {
        recalculate()
    })

    recalculate()

    $modal.modal()

    $el.on('submit', 'form', function(e) {
        e.preventDefault()
        recalculate()

        if ($el.find('.error').length) return

        var url = 'admin/withdraws/' + wr.id + '/complete'

        api.call(url, { fee: $fee.val() }, { type: 'POST' })
        .done(function() {
            $modal.modal('hide')
        })
        .fail(function(xhr) {
            errors.alertFromXhr(xhr)
        })
    })

    return controller
}
