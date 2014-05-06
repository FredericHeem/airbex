var template = require('./index.html')
var num = require('num')

module.exports = function(userId) {
    var itemTemplate = require('./item.html')
    , $el = $('<div class=admin-purchaseorders>').html(template())
    , controller = {
        $el: $el
    }
    , $items = $el.find('.purchaseorders')
    , $form = $el.find('.search-form')
    var items_model = [];
    function itemsChanged(query, items) {
    	
        $items.find('tbody').html($.map(items, function(item) {
        	items_model[item.id] = item
            item.raw = JSON.stringify(item)
            item.query = query
            var $item = $(itemTemplate(item))
            $item.attr('data-id', item.id)
            return $item
        }))
    }

    function refresh(query) {
        $form.addClass('is-loading')

        api.call('admin/purchaseOrder')
        .fail(errors.alertFromXhr)
        .always(function() {
            $form.removeClass('is-loading')
        })
        .done(itemsChanged.bind(this, query))
    }

    // Credit
    $items.on('click', '.credit', function(e) {
        e.preventDefault()
        var $button = $(this)
        , id = $button.attr('data-id')
		var bankCreditInfo = {
        	"user_id": items_model[id].user_id,
			"amount" : items_model[id].amount,
			"currency_id" : items_model[id].quote_currency,
			"reference" : "",
			"purchase_order_id" : id
	    }
        api.call('admin/bankCredits', bankCreditInfo, { type: 'POST' })
        .fail(errors.alertFromXhr)
        .done(function() {
        	alertify.log("Credited")
            $button.fadeAway()
            router.now()
        })
    })
    // Approve
    $items.on('click', '.buy', function(e) {
        e.preventDefault()
        var $button = $(this)
        var id = $button.attr('data-id')
        var amount = items_model[id].amount;
        var feeRatio = 0.005
        var amountMinusFee = num(amount).mul('1.00000').div(num('1').add(feeRatio)).toString()
        var orderInfo = {
        	    user_id:items_model[id].user_id,
                market: items_model[id].market_name,
                type: "bid",
                amount: amountMinusFee,
                price:null,
                purchaseorder_id:id
        };

        api.call('admin/orders', orderInfo, { type: 'POST' })
        .fail(errors.alertFromXhr)
        .done(function() {
        	alertify.log("Crypto bought")
            $button.fadeAway()
            router.now()
        })
    }) 
    function search() {
        var q = {
            sort: {
                timestamp: 'desc'
            }
        }

        var userId = $el.field('userId').val()

        if (userId) {
            q.userId = +userId
        }

        refresh(q)
    }

    $form.on('submit', function(e) {
        e.preventDefault()
        search()
    })

    if (userId) {
        $el.field('userId').val(userId)
    }

    search()

    $el.find('.nav a[href="#purchaseorders"]').parent().addClass('active')

    $el.find('.query').focusSoon()

    return controller
}
