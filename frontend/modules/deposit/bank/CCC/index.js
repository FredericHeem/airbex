var template = require('./index.html')

var accountMap = {
    "EUR":"9120161737",
    "USD":"9120161794"
}

module.exports = function(currency) {
    var $el = $('<div class=deposit-ccc>').html(template({
        messageToRecipient: api.user.tag,
        currency:currency,
        accountNo:accountMap[currency]
    }))
    , controller = {
        $el: $el
    }

    return controller
}
