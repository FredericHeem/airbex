var template = require('./template.html')
var itemTemplate = require('./item.html')

module.exports = function() {
    var $el = $('<div class="overview">').html(template())
    , controller = {
        $el: $el
    }
    , $blockchainInfo = $el.find('.blockchain-info')

    function itemsChanged(items) {
        $blockchainInfo.html($.map(items, function(item) {
            return itemTemplate(item)
        }))
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

    function refreshLgsHeight() {
        api.call('admin/lgs/height')
        .fail(errors.alertFromXhr)
        .done(function(res) {
            $el.find('.lgs-height').html(res.height)
        })
    }
    
    function refreshWallets() {
        api.call('admin/balances/wallets')
        .fail(errors.alertFromXhr)
        .done(function(res) {
            $el.find('.btc-balance').html(res.btc)
            $el.find('.ltc-balance').html(res.ltc)
            $el.find('.lgs-balance').html(res.lgs)
        })
    }

    refreshBtcHeight()
    refreshLtcHeight()
    refreshLgsHeight()
    refreshWallets()

    return controller
}
