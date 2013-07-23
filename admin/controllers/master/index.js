var debug = require('../../util/debug')('snow:master')
, page
, template = require('./template.html')
, section
, $section
, header
, $top
, $nav

var master = module.exports = function(val, name) {
    if (!$section) {
        throw new Error('master called before render')
    }

    if (val !== undefined) {
        if (page && page.destroy) {
            page.destroy()
        }
        page = val
        $section.html(page.$el)
        master.section(name || null)
    }
    return page
}

master.section = function(name) {
    if (name !== undefined) {
        $nav.find('li').removeClass('active')
        name && $nav.find('.' + name).addClass('active')

        master.$el.removeClasses(/^is-section-/)
        name && master.$el.addClass('is-section-' + name)

        section = name
    }
    return section
}

master.render = function() {
    debug('rendering')

    master.$el = $('body')
    master.$el.prepend(template())

    $section = $('#section')
    header = require('../top')()
    $top = $('.top')
    $nav = $top.find('.nav')
    master.$el.find('.top').replaceWith(header.$el)

    return master.$l
}
