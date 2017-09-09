var _ = require('lodash')
, template = require('./index.html')
, format = require('util').format
, itemTemplateCurrency = require('./itemCurrency.html')
, itemTemplateMarket = require('./itemMarket.html')

function fillCrypto(){
    function onCurrencies(currencies) {
        $('#ul-crypto-wallet').after($.map(currencies, function(currency) {
            return itemTemplateCurrency({currency: currency.id, name: currency.name, link: "wallet"})
        }))
        $('#ul-crypto-deposit').after($.map(currencies, function(currency) {
            var link = "deposit";
            if(api.isFiat(currency.id)){
                link = "deposit/ccc";
            }
            return itemTemplateCurrency({currency: currency.id, name: currency.name, link: link})
        }))
        $('#ul-crypto-withdraw').after($.map(currencies, function(currency) {
            if(!api.isFiat(currency.id)){
                return itemTemplateCurrency({currency: currency.id, name: currency.name, link: "withdraw"})
            }
        }))
        $('#ul-crypto-audit').after($.map(currencies, function(currency) {
            if(!api.isFiat(currency.id)){
                return itemTemplateCurrency({currency: currency.id, name: currency.name, link: "audit"})
            }
        }))
    }

    api.once('currencies', onCurrencies)
}

function fillMarkets(){
    api.once('markets', function(markets) {
        $('#ul-market').before($.map(markets, function(market) {
            return itemTemplateMarket({
                market: market.id,
                base_currency: market.bc, 
                quote_currency: market.qc
            })
        }))
    })
}

function bindEvents (){
    $('.show-sidebar').on('click', function (e) {
        e.preventDefault();
        $('div#main').toggleClass('sidebar-show');
    }); 
    $('.main-menu').on('click', 'a', function (e) {
        var parents = $(this).parents('li');
        var li = $(this).closest('li.dropdown');
        var another_items = $('.main-menu li').not(parents);
        another_items.find('a').removeClass('active');
        another_items.find('a').removeClass('active-parent');
        if ($(this).hasClass('dropdown-toggle') || $(this).closest('li').find('ul').length == 0) {
            $(this).addClass('active-parent');
            var current = $(this).next();
            if (current.is(':visible')) {
                li.find("ul.dropdown-menu").slideUp('fast');
                li.find("ul.dropdown-menu a").removeClass('active')
            }
            else {
                another_items.find("ul.dropdown-menu").slideUp('fast');
                current.slideDown('fast');
            }
        }
        
        else {
            if (li.find('a.dropdown-toggle').hasClass('active-parent')) {
                var pre = $(this).closest('ul.dropdown-menu');
                pre.find("li.dropdown").not($(this).closest('li')).find('ul.dropdown-menu').slideUp('fast');
            }
        }
        if($(this).closest('li').find('ul').length == 0){
            if($(window).width() <= 640){
                $('div#main').toggleClass('sidebar-show');
            }
        }
        
        if ($(this).hasClass('active') == false) {
            $(this).parents("ul.dropdown-menu").find('a').removeClass('active');
            $(this).addClass('active')
        }
        if ($(this).hasClass('ajax-link')) {
            //e.preventDefault();
            if ($(this).hasClass('add-full')) {
                $('#content').addClass('full-content');
            }
            else {
                $('#content').removeClass('full-content');
            }
        }
    });

    $('#top-panel').on('click','a', function(e){
        if ($(this).hasClass('ajax-link')) {
            //e.preventDefault();
            if ($(this).hasClass('add-full')) {
                $('#content').addClass('full-content');
            }
            else {
                $('#content').removeClass('full-content');
            }
        }
    }); 
}

module.exports = function($elRoot) {
    var $el = $('<div class="sidenav">').html(template(window.config))
    , controller = {
        $el: $el
    }
    
    $elRoot.replaceWith($el)

    bindEvents();
    fillCrypto();
    fillMarkets();
    
    return controller
}
