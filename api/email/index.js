var nodemailer = require('nodemailer')
, assert = require('assert')
, _ = require('lodash')
, ejs = require('ejs')
, fs = require('fs')
, path = require('path')
, config = require('konfu')
, debug = require('debug')('ssnow:email')
, smtp = nodemailer.createTransport(config.smtp.service, config.smtp.options)
, fallback = 'en-US'
, conn
, cache
, email = module.exports = function(c, cc) {
    assert(c && cc)
    conn = c
    cache = cc

    require('./notify')(conn, email)

    return email
}

email.resolveLanguage = function(language) {
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

email.templateFilename = function(name, language) {
    language = email.resolveLanguage(language)

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

email.template = _.memoize(function(fn) {
    return fs.readFileSync(fn, 'utf8')
}, function() {
    return _.toArray(arguments).join()
})

// User can be either user id or email address
email.send = function(user, language, templateName, locals, cb) {
    if (typeof user == 'number') {
        return conn.read.query({
            text: 'SELECT email FROM "user" WHERE user_id = $1',
            values: [user]
        }, function(err, dr) {
            if (err) return cb(err)
            if (!dr.rowCount) return cb(new Error('User not found'))
            email.send(dr.rows[0].email, language, templateName, locals, cb)
        })
    }

    var templateFn = email.templateFilename(templateName, language)
    , template = email.template(templateFn)

    locals || (locals = {})
    locals.websiteUrl = config.website_url
    locals.filename = path.relative(path.join(__dirname, '..'), templateFn)

    var html = ejs.render(template, locals)
    , lines = html.split('\n')
    , subject = lines[0]
    , body = lines.slice(1).join('\n')

    var mail = {
        from: 'Justcoin <hello@justcoin.com>',
        to: user,
        subject: subject,
        html: body
    }

    smtp.sendMail(mail, cb)
}
