var template = require('./index.html')
var format = require('util').format

module.exports = function(currency, action) {
	
    var $el = $('<div class="wallet">').html(template({currency:currency}))
    , controller = {
        $el: $el
    }
    
    //Update currency in top nav
    api.fetchBalances()
    		
    var walletForm;

    $el.find("#wallet-receive").toggleClass("active", action == 'receive');
    $el.find("#wallet-send").toggleClass("active", action == 'send');
    
    if(action === 'send'){
        if(api.isFiat(currency)){
        	walletForm = require('../withdraw/bank')(currency)
        } else {
        	walletForm = require('../withdraw/crypto')(currency)
        }
    } else {
        if(api.isFiat(currency)){
            walletForm = require("../deposit/bank/CCC")(currency)
        } else {
        	walletForm = require('../deposit/crypto')(currency)
        }
    }
    
    $el.find("#wallet-form").replaceWith(walletForm.$el)
    return controller
}
