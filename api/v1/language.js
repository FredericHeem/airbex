var debug = require('debug')('snow:language')
, util = require('util')
, languageRe = /^([a-z]{1,8}(?:-[a-z]{1,8})?)(?:;q=([0-9](?:\.[0-9])?))?$/i

module.exports = exports = function(app) {
    app.get('/v1/language', exports.handler)
}

// http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html
exports.language = function(req) {
    var header = req.get('Accept-Language')
    , language = null

    if (!header) {
        debug('Accept-Language header is missing')
    } else {
        var languages = header.split(/,/g).map(function(token) {
            var match = token.match(languageRe)

            if (!match) {
                debug('skipping invalid language token %s', token)
                return null
            }

            return {
                name: match[1],
                priority: typeof match[2] == 'undefined' ? 1 : +match[2]
            }
        }).filter(function(token) {
            return !!token
        }).sort(function(a, b) {
            return b.priority - a.priority
        })

        if (!languages.length) {
            debug('No languages extracted from header %s', header)
        } else {
            language = languages[0].name
            debug('Preferring language %s (from %s)', language, util.inspect(languages))
        }
    }

    return language
}

// http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html
exports.handler = function(req, res) {
    var language = exports.language(req)

    res.send({ language: language })
}
