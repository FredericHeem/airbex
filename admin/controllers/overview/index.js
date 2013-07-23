var template = require('./template.html')
, _ = require('lodash')
, itemTemplate = require('./bank-account-pending-verify.html')

module.exports = function() {
    var $el = $('<div class="admin">').html(template())
    , controller = {
        $el: $el
    }

    function refreshBtcHeight() {
        api.call('admin/btc/height')
        .fail(errors.alertFromXhr)
        .done(function(res) {
            $el.find('.btc-height').html(res.height)
        })
    }

    function refreshLtcHeight() {
        api.call('admin/ltc/height')
        .fail(errors.alertFromXhr)
        .done(function(res) {
            $el.find('.ltc-height').html(res.height)
        })
    }

    function refreshBankAccountsPendingVerify() {
        api.call('admin/bankaccounts')
        .fail(errors.alertFromXhr)
        .done(function(accounts) {
            var $accounts = $el.find('.bank-accounts-pending-verify .bank-accounts')

            $el.find('.bank-accounts-pending-verify')
            .toggleClass('is-empty', !accounts.length)

            $accounts
            .toggleClass('is-empty', !!accounts.length)

            if (accounts.length) {
                $accounts.html(_.map(accounts, function(a) {
                    return $(itemTemplate(a))
                }))
            }
        })
    }

    refreshBtcHeight()
    refreshLtcHeight()
    refreshBankAccountsPendingVerify()

    return controller
}
