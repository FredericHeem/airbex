var template = require('./index.html')

module.exports = function() {
    var $el = $('<footer id="footer">').html(template(window.config))
    , controller = {
        $el: $el
    }

    return controller
}