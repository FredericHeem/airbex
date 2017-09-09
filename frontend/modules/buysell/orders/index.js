var template = require('./index.html')
, orderTemplate = require('./order.html')

module.exports = function() {
	var $el = $('<div class="orders">').html(template())
	, controller = {
		$el: $el
	}

	function purchaseOrderChange(items) {
		
        $el.find('.orders tbody').html($.map(items, function(item) {
            var $item = $('<tr class=po-item>').html(orderTemplate(item))
            var $status = $item.find("#status")
            if(item.state == "PaymentPending"){
            	$status.text("Pending Payment")
                $status.addClass("label-warning")
            } else if(item.state == "PaymentReviewing"){
            	$status.text("Reviewing Payment")
            	$status.addClass("label-warning")
            } else if(item.state == "PaymentApproved"){
            	$status.text("Payment Approved")
                $status.addClass("label-success")
            } else if(item.state == "Purchased"){
            	$status.text("Purchased")
                $status.addClass("label-success")  
            } else if(item.state == "Delivered"){
            	$status.text("Delivered")
                $status.addClass("label-success")  
            } else {
                $status.addClass("label-danger")
            }

            return $item
        }))
	}

	function refresh() {
		api.call('v1/purchaseOrder')
		.fail(errors.alertFromXhr)
		.done(purchaseOrderChange)
	}

	refresh();

	return controller
}