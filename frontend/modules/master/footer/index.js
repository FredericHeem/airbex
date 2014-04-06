var template = require('./index.html')

module.exports = function() {
    var $el = $('<footer id="footer">').html(template())
    , controller = {
        $el: $el
    }

    return controller
}