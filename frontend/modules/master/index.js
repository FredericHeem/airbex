var debug = require('../../helpers/debug')('snow:master')
, page
, template = require('./index.html')
, area
, $area
, header
, $top
, $nav

var master = module.exports = function(val, name) {
    if (!$area) {
        debug('master called before render')
        return val
    }

    if (val !== undefined) {
        if (page) {
            page.$el.triggerHandler('remove')
        }
        page = val
        $area.html(page.$el)
        master.area(name || null)
    }
    return page
}

master.area = function(name) {
    if (name !== undefined) {
        $nav.find('li').removeClass('active')
        name && $nav.find('.' + name).addClass('active')

        master.$el.removeClasses(/^is-area-/)
        name && master.$el.addClass('is-area-' + name)

        area = name
    }
    return area
}

master.render = function() {
    debug('rendering')

    master.$el = $('body')
    master.$el.prepend(template())

    $area = $('#area')
    header = require('./top')()
    $top = header.$el
    $nav = $top.find('.nav')
    master.$el.find('.top').replaceWith(header.$el)
    master.$el.find('.footer').replaceWith(require('./footer')().$el)

    return master.$l
}
