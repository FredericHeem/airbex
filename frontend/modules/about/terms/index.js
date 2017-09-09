var template = require('./index.html')

module.exports = function() {
    var $el = $(template())
    , controller = {
        $el: $el
    }

    return controller
}
