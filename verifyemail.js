var async = require('async')
, format = require('util').format
, request = require('request')
, config = require('konfu')
, debug = require('debug')('verifyemail')
, emailExistence = require('email-existence')

module.exports = function(email, cb) {
    console.log('verifying email %s', email)

    async.series([
        function(next) {
            var domain = /^\S+@(\S+)$/.exec(email)[1]
            , url = format('http://check.block-disposable-email.com/easyapi/json/%s/%s', config.bde_api_key, domain)
            console.log('checking vs %s', url)

            request({
                url: url,
                json: true
            }, function(err, res, data) {
                console.log(data)
                if (err) return next(err)
                console.log('status code %s', res.statusCode)
                if (res.statusCode != 200) return next(new Error(format('Status code %d', res.statusCode)))
                debug('Email check for domain of %s:\n%j', email, data)
                if (data.domain_status != 'ok') return cb(null, false)
                //next()
                cb(null, true)
            })
        },

        function(next) {
            debug('checking email existence')
            emailExistence.check(email, function(err, exists) {
                console.log(arguments)
                if (err) return next(err)
                debug('Email check for %s: %s', email, exists)
                cb(null, exists)
            })
        }
    ])
}
