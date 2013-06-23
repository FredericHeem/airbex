var debug = require('debug')('snow:language')
, util = require('util')
, language = module.exports = {}
, languageRe = /^([a-z]{1,8}(?:-[a-z]{1,8})?)(?:;q=([0-9](?:\.[0-9])?))?$/i

language.configure = function(app, conn) {
    app.get('/v1/language', language.language.bind(language, conn))
}

// http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html
language.language = function(conn, req, res) {
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

    res.send(200, { language: language })
}
