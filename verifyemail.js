var async = require('async')
, format = require('util').format
, request = require('request')
, config = require('konfu')
, debug = require('debug')('verifyemail')
, emailExistence = require('email-existence')

module.exports = function(email, cb) {
    async.series([
        function(next) {
            var domain = /^\S+@(\S+)$/.exec(email)[1]
             url = format('http://check.block-disposable-email.com/easyapi/json/%s/%s', config.bde_api_key, domain)
            request({
                url: url,
                json: true
            }, function(err, res, data) {
                if (err) return next(err)
                if (res.statusCode != 200) return next(new Error(format('Status code %d', res.statusCode)))
                debug('Email check for domain of %s:\n%j', email, data)
                if (data.domain_status != 'ok') return cb(null, false)
                next()
            })
        },

        function(next) {
            emailExistence.check(email, function(err, exists) {
                if (err) return next(err)
                debug('Email check for %s: %s', email, exists)
                cb(null, exists)
            })
        }
    ])
}
