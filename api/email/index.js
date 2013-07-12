var nodemailer = require('nodemailer')
, ejs = require('ejs')
, fs = require('fs')
, path = require('path')
, conn
, config = require('konfu')
, cache
, assert = require('assert')
, smtp = nodemailer.createTransport(config.smtp.service, config.smtp.options)
, email = module.exports = function(c, cc) {
    assert(c && cc)
    conn = c
    cache = cc

    require('./notify')(conn, email)

    return email
}

// User can be either user id or email address
email.send = function(user, templateName, locals, cb) {
    if (typeof user == 'number') {
        return conn.read.query({
            text: 'SELECT email FROM "user" WHERE user_id = $1',
            values: [user]
        }, function(err, dr) {
            if (err) return cb(err)
            if (!dr.rowCount) return cb(new Error('User not found'))
            email.send(dr.rows[0].email, templateName, locals, cb)
        })
    }

    locals || (locals = {})
    locals.websiteUrl = config.website_url
    locals.filename = 'email/' + templateName + '.html'

    // TODO: Cache
    var fn = path.join(path.dirname(__filename), templateName + '.html')
    , template = fs.readFileSync(fn, 'utf8')
    , html = ejs.render(template, locals)
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
