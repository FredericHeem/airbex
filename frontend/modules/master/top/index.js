var _ = require('lodash')
, template = require('./index.html')
, format = require('util').format
, debug = require('../../../helpers/debug')('top')

module.exports = function() {
    var $el = $('<div class="top">').html(template(window.config))
    , controller = {
        $el: $el
    }
    , balancesTimer
    , marketsTimer
    ,$alert_connection = $el.find("#alert-connection")
    ,$topNav = $el.find(".navbar")
    
    $alert_connection.hide();
    
    $el.on("click", ".navbar-left li a", function(event) {
    	$(".navbar-collapse").collapse('hide');
    });
   
    function setAvailable($el, available, currency){
        $el.html(format('<span class="hidden-xs">%s</span> %s',
                numbers.format(available, 
                        { precision: numbers.getCurrencyOption(currency).scale_display}), 
                        currency))
    }
    
    function balancesChanged(balances) {
        if (!api.user) {
            debug("balancesChanged user not set")
            return
        }

        var fiats = _.filter(balances, function(x) {
            return api.currencies[x.currency].fiat
        })
        
        if(fiats.length){
            var $fiats = $el.find('.fiat .dropdown-menu')
            , $fiat = $el.find('.fiat-balance')
            $fiats.html($.map(fiats, function(item) {
                return format('<li><a href="#wallet/%s">%s</a></li>',
                        item.currency, 
                        numbers.formatCurrency(item.available, item.currency))
            }))

            var fiat = _.find(fiats, { currency: api.defaultFiatCurrency() })
            if(fiat){
                setAvailable($fiat, fiat.available, fiat.currency);
            }
        } else {
            $el.find('.fiat').css("display", "none")
        }
        
        var digitals = _.filter(balances, function(x) {
            return !api.currencies[x.currency].fiat
        }) 

        if(digitals.length){
            var $digitals = $el.find('.digital .dropdown-menu')
            , $digital = $el.find('.digital-balance')

            $digitals.html($.map(digitals, function(item) {
                return format('<li><a href="#wallet/%s">%s</a></li>',
                        item.currency, 
                        numbers.formatCurrency(item.available, item.currency))
            }))

            var digital = _.find(digitals, { currency: api.defaultDigitalCurrency() })
            if(digital){
                setAvailable($digital, digital.available, digital.currency);
            }
        }
    }

    function marketChanged(market) {
        var base_currency = api.balances[api.getBaseCurrency(market)];
        var quote_currency = api.balances[api.getQuoteCurrency(market)];
                
        if(quote_currency && api.isFiat(quote_currency.currency)){
            api.setDefaultFiat(quote_currency.currency)
            var $fiat = $el.find('.fiat-balance');
            setAvailable($fiat, quote_currency.available, quote_currency.currency);
        }
        
        if(base_currency && !api.isFiat(base_currency.currency)){
            api.setDefaultCrypto(base_currency.currency)
            var $digital = $el.find('.digital-balance');
            setAvailable($digital, base_currency.available, base_currency.currency);
        }
    }
    
    function marketsChanged(markets) {
        console.debug("markets");
        var marketname = window.config.market_default;
        if(markets && markets.length){
            var market = api.markets[marketname];
            
            var marketsMenu = $el.find('.markets .dropdown-menu')
            
            marketsMenu.html($.map(markets, function(item) {
                if(item.ask){ 
                    var qc = api.getQuoteCurrency(item.id);
                    var scale_display = api.markets[item.id].quote_scale_diplay;
                    return format('<li><a href="#trade/%s">%s <span>%s<span></a></li>',
                            item.id, item.id, 
                            numbers.format(item.ask, { precision: scale_display}))
                } else {
                    return format('<li><a href="#trade/%s">%s</a></li>', item.id, item.id)
                }
            }))

            var marketDefault = _.find(markets, { id: api.defaultMarket() })
            if(marketDefault){
                var qc = api.getQuoteCurrency(marketDefault.id);
                var scale_display = marketDefault.quote_scale_diplay;
                var askFormatted = numbers.format(marketDefault.ask || 0,{ precision: scale_display});
                var $marketItem = $el.find('.market-value')
                $marketItem.html(format('%s <span class="hidden-xs">%s<span>',
                    marketDefault.id, marketDefault.ask ? askFormatted : ""))
            }
        }
    }
    
    api.on('connect_error', function() {
        $topNav.removeClass('is-loading')
        $alert_connection.show();
    })
    
    api.on('connected', function() {
        $alert_connection.hide();
    })
    
    api.on('markets', function(markets) {
        marketsChanged(markets)
        marketsTimer && clearTimeout(marketsTimer)
        marketsTimer = setTimeout(api.markets, 30e3)
    })
    
    api.on('market', function(market) {
        marketChanged(market)
    })
    
    api.on('balances', function(balances) {
        balancesChanged(balances)
        balancesTimer && clearTimeout(balancesTimer)
        balancesTimer = setTimeout(api.balances, 30e3)
    })

    api.on('user', function(user) {
        $el.find('.user-name').text(user.firstName || user.email)
    })
    
    $el.on('remove', function() {
        balancesTimer && clearTimeout(balancesTimer)
    })

    
    api.once('bootstrapDone', function() {
        $topNav.removeClass('is-loading')
    })
    
    $topNav.addClass('is-loading')
    
    return controller
}
