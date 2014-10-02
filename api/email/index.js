var assert = require('assert')
, _ = require('lodash')
, ejs = require('ejs')
, fs = require('fs')
, path = require('path')
, log = require('../log')(__filename)
, debug = log.debug
, fallback = 'en-US'

module.exports = exports = function(app) {
    exports.app = app
    return exports
}

exports.resolveLanguage = function(language) {
    language || (language = fallback)

    var mappings = {
        '^en': 'en-US',
        '^(no|nb)': 'nb-NO',
        '^es': 'es-ES'
    }
    , mapping = _.find(_.keys(mappings), function(m) {
        if (new RegExp(m, 'i').test(language)) {
            return true
        }
    })

    mapping && (language = mappings[mapping])

    return language
}

exports.templateFilename = function(name, language) {
    language = exports.resolveLanguage(language)

    function resolve(x) {
        return path.join(path.dirname(__filename), x, name + '.html')
    }

    var fn = resolve(language)

    if (!fs.existsSync(fn)) {
        debug('template %s does not exist in %s, falling back to %s',
            name, language, fallback)
        fn = resolve(fallback)
    }

    assert(fs.existsSync(fn))

    return fn
}

exports.template = _.memoize(function(fn) {
    return fs.readFileSync(fn, 'utf8')
}, function() {
    return _.toArray(arguments).join()
})

// User can be either user id or email address
exports.send = function(user, language, templateName, locals, cb) {
    if (typeof user == 'number') {
        return exports.app.conn.read.get().query({
            text: 'SELECT email FROM "user" WHERE user_id = $1',
            values: [user]
        }, function(err, dr) {
            if (err) return cb(err)
            if (!dr.rowCount) return cb(new Error('User not found'))
            exports.send(dr.rows[0].email, language, templateName, locals, cb)
        })
    }

    var templateFn = exports.templateFilename(templateName, language)
    , template = exports.template(templateFn)

    var config = exports.app.config;
    
    locals || (locals = {})
    locals.websiteUrl = config.website_url
    locals.company = config.company || 'AIRBEX';
    locals.email_support = config.email_support || 'support@airbex.net';
    locals.signature = config.signature || 'AIRBEX, the Auditable Bitcoin EXchange';
    
    locals.filename = templateFn;
    var html = ejs.render(template, locals)
    , lines = html.split('\n')
    , subject = lines[0]
    , body = lines.slice(1).join('\n')

    var mail = {
        from: config.email_from,
        to: user,
        subject: subject,
        html: body
    }

    debug('sending email %s', JSON.stringify(mail, null, 4))
    
    if(exports.app.smtp.sendMail){
        exports.app.smtp.sendMail(mail, cb)
    } else {
        log.error("no smtp configured")
        cb()
    }
}
