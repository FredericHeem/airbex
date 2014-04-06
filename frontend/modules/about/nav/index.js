var template = require('./index.html')
console.debug("about nav");
module.exports = function(tab) {
    var $el = $('<div class=account-nav>').html(template())
    , controller = {
        $el: $el
    }

    if (tab) {
        $el.find('.nav .' + tab).addClass('active')
    }

    return controller
}
