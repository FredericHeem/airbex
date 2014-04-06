var template = require('./index.html')
, nav = require('../nav')

module.exports = function() {
    var $el = $(template())
    , controller = {
        $el: $el
    }

    $el.find('.about-nav').replaceWith(nav('terms').$el)

    return controller
}
