var template = require('./index.html')
, sepa = require('../../../assets/sepa.json')
, wire = require('../../../assets/wire.json')

module.exports = function() {
    var $el = $('<div class=deposit-bank>').html(template({
        messageToRecipient: api.user.tag
    }))
    , controller = {
        $el: $el
    }

    //var allowed = ~sepa.indexOf(api.user.country) || ~wire.indexOf(api.user.country)
    //$el.toggleClass('is-allowed', !!allowed)

    return controller
}
