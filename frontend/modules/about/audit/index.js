var template = require('./index.html')
, nav = require('../nav')
, debug = require('debug')('snow:audit')



module.exports = function(currency) {
    var $el = $(template())
    , controller = {
        $el: $el
    }

    $el.find('.about-nav').replaceWith(nav('audit').$el)

    console.log('audit ', currency);

    
    return controller
}