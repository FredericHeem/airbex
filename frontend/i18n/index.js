/* global -i18n */
var util = require('util')
, debug = require('../helpers/debug')('i18n')
, _ = require('lodash')
, dicts = {
    'en-US': require('./en-US.json'),
    'fr-FR': require('./fr-FR.json')
}
, fallback = 'en-US'
, mappings = {
    '^en': 'en-US',
    '^fr': 'fr-FR'
}
, moment = require('moment')

require('moment/lang/nb')

var i18n = module.exports = function(key) {
    if (!i18n.dict) throw new Error('language not set')

    var s = i18n.dict[key]
    if (typeof s == 'undefined') {
        debug(key + ' is not defined for ' + i18n.lang + ' falling back to ' + fallback)
        s = dicts[fallback][key]
    }

    if (typeof s == 'undefined') {
        debug('ERROR: missing translation key: ' + key)
        return '!!' + key + '!!'
    }

    if (i18n.debug) s = '!!' + s + '!!'

    var args = _.toArray(arguments)
    args.splice(0, 1, s)

    return util.format.apply(util, args)
}

/**
 * Return the best available match for the specified language,
 * given a desired language.
 * @param  {string} lang Desired
 * @return {string}      Available
 */
i18n.resolve = function(lang) {
    if (lang) {
        var mapping = _.find(_.keys(mappings), function(m) {
            if (new RegExp(m, 'i').test(lang)) {
                return true
            }
        })

        if (mapping && mappings[mapping] !== lang) {
            debug('language %s will be mapped to %s', lang, mappings[mapping])
            lang = mappings[mapping]
        }
    }

    if (!lang || !dicts[lang]) {
        debug('language %s not available. falling back to %s', lang || '<null>', fallback)
        lang = fallback
    }

    return lang
}

i18n.set = function(lang) {
    debug('setting language to %s', lang || '<null>')

    if (lang && $.cookie('language') != lang) {
        debug('lang %s <> language cookie', lang, $.cookie('language') || '<null>')
        debug('setting language cookie')

        // Remove obsolete cookie without path
        $.removeCookie('language')

        $.cookie('language', lang, { path: '/', expires: 365 * 10 })
    }

    if (lang && i18n.desired !== undefined && lang !== i18n.desired) {
        debug('changing language from %s to %s (refresh)', i18n.desired || '<none>', lang)

        if (!api.user) {
            return setTimeout(function() {
                window.location.reload()
            })
        }

        debug('patching user with new language (background)')

        return api.patchUser({ language: lang })
        .fail(errors.reportFromXhr)
        .done(function() {
            debug('user has been patched. reloading')
            return window.location.reload()
        })
    }

    i18n.desired = lang

    if (lang && api.user && api.user.language !== lang) {
        debug('patching user with new language (background)')

        api.patchUser({ language: lang })
        .fail(errors.reportFromXhr)
    }

    lang = i18n.resolve(lang)

    if (lang === i18n.lang) {
        debug('language is already %s', lang)
        return
    }

    debug('setting language of moment')

    if (i18n.lang == 'nb-NO') moment.lang('nb')
    else moment.lang('en')

    debug('changing html and content-language attributes')
    $('html').attr('lang', lang).attr('xml:lang', lang)
    $('meta[http-equiv="Content-Language"]').attr('content', lang)

    debug('finished setting language')

    i18n.lang = lang
    i18n.dict = dicts[lang]
}

$.fn.i18n = function() {
    $(this).html(i18n.apply(i18n, arguments))
}

i18n.detect = function() {
    var lang = (api.user ? api.user.language : null) || $.cookie('language')

    if (lang) {
        if (api.user && api.user.language) debug('setting language from user profile')
        if ($.cookie('language')) debug('setting language from cookie')
        return i18n.set(lang)
    }

    // Temporary
    debug('setting temporary language <null>')
    i18n.set(null)

    api.call('v1/language')
    .fail(function(err) {
        errors.reportFromXhr(err)
        if (!i18n.lang) i18n.set(fallback)
    })
    .done(function(res) {
        if (res.language) return i18n.set(res.language)
        lang = window.navigator.userLanguage || window.navigator.language
        if (lang) return i18n.set(res.language)
        i18n.set(null)
    })
}
