var async = require('async')
, format = require('util').format
, request = require('request')
, config = require('konfu')
, debug = require('debug')('snow:verifyemail')
, emailExistence = require('email-existence')
, urlFormat = 'http://check.block-disposable-email.com/easyapi/json/%s/%s'

module.exports = function(email, cb) {
    async.series([
        function(next) {
            var match = /^\S+@(\S+)$/.exec(email)
            if (!match) return cb(new Error('Invalid email'))
            var domain = match[1]
            , url = format(urlFormat, config.bde_api_key, domain)

            request.get({
                url: url,
                json: true
            }, function(err, res, data) {
                if (err) return cb(err)

                if (res.statusCode != 200) {
                    return cb(new Error(format('Status code %d', res.statusCode)))
                }

                debug('Email check for domain of %s:\n%j', email, data)
                next(null, data.domain_status == 'ok')
            })
        },

        function() {
            debug('checking email existence')
            emailExistence.check(email, function(err, exists) {
                if (err) return cb(err)
                debug('Email check for %s: %s', email, exists)
                cb(null, exists)
            })
        }
    ])
}
