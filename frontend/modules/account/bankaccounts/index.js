var template = require('./index.html')
, _ = require('lodash')
, sepa = require('../../../assets/sepa.json')
, wire = require('../../../assets/wire.json')

module.exports = function() {
    var $el = $('<div class=account-bankaccounts>').html(template())
    , controller = {
        $el: $el
    }

    function refresh() {
        $el.addClass('is-loading')

        api.call('v1/bankAccounts')
        .then(renderAccounts)
        .fail(errors.alertFromXhr)
        .finally(function() {
            $el.removeClass('is-loading')
        })
    }

    function renderAccounts(accounts) {
        var $accounts = $el.find('.accounts')
        , itemTemplate = require('./item.html')
        , $items = $.map(accounts, function(a) {
            return $(itemTemplate(_.extend({
                formatted: formatters.bankAccount(a),
                displayName: a.displayName
            }, a)))
        })

        $accounts.html($items)

        $el.toggleClass('is-empty', !accounts.length).addClass('is-loaded')
    }

//    if (!(~sepa.indexOf(api.user.country) || ~wire.indexOf(api.user.country))) {
//        $el.addClass('is-blocked')
//    }

    refresh()

    return controller
}
