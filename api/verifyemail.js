var async = require('async')
, format = require('util').format
, request = require('request')
, config = require('konfu')
, debug = require('debug')('snow:verifyemail')
, emailExistence = require('email-existence')

module.exports = function(email, cb) {
    console.log('verifying email %s', email)

    async.series([
        function(next) {
            var domain = /^\S+@(\S+)$/.exec(email)[1]
            , url = format(
                'http://check.block-disposable-email.com/easyapi/json/%s/%s',
                config.bde_api_key, domain)

            console.log('checking vs %s', url)

            request({
                url: url,
                json: true
            }, function(err, res, data) {
                if (err) return next(err)

                if (res.statusCode != 200) {
                    return next(new Error(format('Status code %d', res.statusCode)))
                }

                debug('Email check for domain of %s:\n%j', email, data)
                if (data.domain_status != 'ok') return cb(null, false)

                cb(null, true)
            })
        },

        function(next) {
            debug('checking email existence')
            emailExistence.check(email, function(err, exists) {
                if (err) return next(err)
                debug('Email check for %s: %s', email, exists)
                cb(null, exists)
            })
        }
    ])
}
