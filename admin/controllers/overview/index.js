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

    
    function refreshWallets() {
        api.call('admin/balances/wallets')
        .fail(errors.alertFromXhr)
        .done(function(res) {
            itemsChanged(res);
        })
    }


    refreshWallets()

    return controller
}
