var template = require('./index.html')
, debug = require('../../../helpers/debug')('depositcrypto')

isTestnet = function(){
    return (window.environment === 'prod' ? false: true)
}

get_blockchain_baseurl = function(currency, testnet){
    var name = numbers.getCurrencyOption(currency).name.toLowerCase();
    return "/explorer/" + name + "/";
}

module.exports = function(currency) {
    var currencyOption = numbers.getCurrencyOption(currency);
    var duration = (currencyOption.min_conf * currencyOption.conf_time / 60)
    var $el = $('<div class=deposit-crypto>').html(template({
        currency:currency,
        name: currencyOption.name,
        min_conf: currencyOption.min_conf,
        duration: duration
    }))
    , controller = {
        $el: $el
    }
    , $address = controller.$el.find('.address')
    , $qrCode = controller.$el.find('.qrcode')
    , $confirmation = controller.$el.find('.confirmation')

    function render(address){
        debug("cryptoAddress %s: %s", currency, address);
        if(address){
            $address.html($('<a href="' + currencyOption.name.toLowerCase() + ':' + address + '">' + address + '</a>'))
            $qrCode.html($('<img src=\'https://chart.googleapis.com/chart?chs=250x250&chld=L|0&cht=qr&chl=bitcoin:' + address + '\'>'))

            getAddressTx(currency, address)
        } else {

        }
    }
    api.once('cryptoAddress' + currency, render)
    
    if(!api.cryptoAddress[currency]){
        api.getCryptoAddress(currency)
    } else {
        render(api.cryptoAddress[currency])
    }

    $el.find(".pending_deposit").hide()
    function getConfirmation(transactions){
        if(transactions.txs.length > 0){
            var tx = transactions.txs[0];
            var confirmations = tx.confirmations || 0;
            if(confirmations <= currencyOption.min_conf){
                $confirmation.text(confirmations)
                $el.find(".pending_deposit").show()
                $el.find(".no_pending_deposit").hide()
            }
        }
    }
    
    function getAddressTx(currency, address){
        var url = get_blockchain_baseurl(currency, isTestnet()) + "api/txs?address=" + address;
        $.ajax({
            type: 'GET',
            url: url,
            success: function(response) {
                console.log("response: " +  JSON.stringify(response))
                getConfirmation(response)
            },
            error: function(error){
                console.error(error)
            }
        });
    }


    return controller
}
