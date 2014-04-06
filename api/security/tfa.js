var assert = require('assert')
, debug = require('debug')('snow:security:tfa')

module.exports = exports = function(app) {
    exports.app = app
    exports.speakeasy = require('speakeasy')
    return exports
}

exports.validate = function(secret, guess, minCounter) {
    debug('checking guess %s', guess)

    for (var offset = -3; offset <= 3; offset++) {
        var counter = Math.floor(+new Date() / 30e3) - offset

        if (minCounter && counter <= minCounter) {
            debug('cannot use offset %s (%s >= %s)', offset, counter, minCounter)
            continue
        }

        var answer = exports.speakeasy.hotp({
            key: secret,
            encoding: 'base32',
            counter: counter
        })

        debug('checking vs answer %s at offset %s', answer, offset)

        if (answer == guess) {
            debug('correct guess at offset %s', offset)
            return counter
        }
    }
}

/**
 * Consume a one-time password
 * @param  {int} userId         The id of the user
 * @param  {string} guess       User supplied otp
 * @return {boolean}            Null if the user is locked out,
 *                              else whether the guess was corrected
 */
exports.consume = function(userId, secret, guess, cb) {
    debug('looking up otp details for user %s', userId)

    // Is the user locked out from trying?
    exports.app.conn.read.query({
        text: [
            'SELECT',
            '   two_factor_success_counter,',
            '   two_factor',
            'FROM "user"',
            'WHERE',
            '   user_id = $1 AND',
            '   (',
            '       COALESCE(two_factor_failures, 0) < 3 OR',
            '       now() - two_factor_failure_at > \'30s\'::interval',
            '   )'
        ].join('\n'),
        values: [userId]
    }, function(err, dr) {
        if (err) return cb(err)
        if (!dr.rowCount) return cb(null, null)
        secret || (secret = dr.rows[0].two_factor)

        if (!secret) return cb(new Error('User does not have two-factor enabled'))

        var counter = exports.validate(secret, guess, dr.rows[0].two_factor_success_counter)

        if (counter) {
            return exports.app.conn.write.query({
                text: [
                    'UPDATE "user"',
                    'SET',
                    '   two_factor_success_counter = $2,',
                    '   two_factor_failures = NULL,',
                    '   two_factor_failure_at = NULL',
                    'WHERE user_id = $1'
                ].join('\n'),
                values: [userId, counter]
            }, function(err) {
                if (err) return cb(err)
                cb(null, true)
            })
        }

        exports.app.conn.write.query({
            text: [
                'UPDATE "user"',
                'SET',
                '   two_factor_failures = COALESCE(two_factor_failures, 0) + 1,',
                '   two_factor_failure_at = now()',
                'WHERE user_id = $1'
            ].join('\n'),
            values: [userId]
        }, function(err, dr) {
            if (err) return cb(err)
            assert(dr.rowCount)
            cb(null, false)
        })
    })
}
