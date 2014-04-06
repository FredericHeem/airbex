var _ = require('lodash')
, template = require('./index.html')
, format = require('util').format

module.exports = function() {
    var $el = $('<div class="top">').html(template())
    , controller = {
        $el: $el
    }
    , balancesTimer

    function balancesChanged(balances) {
        if (!api.user) return

        var fiats = _.filter(balances, function(x) {
            return api.currencies[x.currency].fiat
        })

        var digitals = _.filter(balances, function(x) {
            return !api.currencies[x.currency].fiat
        })

        var $fiats = $el.find('.fiat .dropdown-menu li')
        , $fiat = $el.find('.fiat-balance')
        , $digitals = $el.find('.digital .dropdown-menu li')
        , $digital = $el.find('.digital-balance')

        $fiats.html($.map(fiats, function(item) {
            return format('<a>%s</a>',
                numbers.format(item.available, { currency: item.currency, precision:2  }))
        }))

        $digitals.html($.map(digitals, function(item) {
            return format('<a>%s</a>',
                numbers.format(item.available, { currency: item.currency }))
        }))

        var fiat = _.find(fiats, { currency: api.defaultFiatCurrency() })
        , digital = _.find(digitals, { currency: api.defaultDigitalCurrency() })

        $fiat.html(numbers.format(fiat.available, { currency: fiat.currency, precision:2 }))
        $digital.html(numbers.format(digital.available, { currency: digital.currency }))
    }

    api.on('balances', function(balances) {
        balancesChanged(balances)
        balancesTimer && clearTimeout(balancesTimer)
        balancesTimer = setTimeout(api.balances, 30e3)
    })

    api.on('user', function(user) {
        $el.find('.user-name').text(user.firstName || user.email)
        if(user){
            $el.find("#reminder-profile,#reminder-identity, #reminder-phone").css('display','none');
            if(!user.firstName){
                $el.find("#reminder-profile").css('display','block');
            } else if(!user.phone){
                $el.find("#reminder-phone").css('display','block');
            } else if(!user.poi || !user.poa){
                $el.find("#reminder-identity").css('display','block');
            }
        }
        api.balances()
    })
    
    $el.on('remove', function() {
        balancesTimer && clearTimeout(balancesTimer)
    })

    return controller
}
