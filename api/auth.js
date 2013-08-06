var debug = require('debug')('snow:auth')
, assert = require('assert')
, format = require('util').format

exports.invalidate = function(app, userId) {
    var item

    if (typeof userId !== 'number') {
        item = app.apiKeys[userId]

        if (!item) {
            debug('failed to invalidate key %s (not in cache)')
            return
        }

        userId = item.user_id
    }

    debug('invalidating keys for user %s', userId)

    Object.keys(app.apiKeys).forEach(function(key) {
        item = app.apiKeys[key]

        if (item.user_id == userId) {
            debug('invalidating key %s for user %s', key.substr(0, 4), userId)
        }

        delete app.apiKeys[key]
    })
}

exports.demand = function(level, req, res) {
    assert(typeof level == 'number')
    assert.equal(typeof req.apiKey.level, 'number')

    if (req.apiKey.level >= level) return true

    res.send(401, {
        name: 'SecurityLevelTooLow',
        message: format(
            'This action requires a security level of %d. The user has %d.',
            level, req.apiKey.level)
    })
}

exports.user = function(req, res, next) {
    if (req.user) return next()

    if (!req.query.key) {
        return res.send(401, {
            name: 'KeyMissing',
            message:'key parameter missing from query string'
        })
    }

    function checkRow(row) {
        if (row.suspended) {
            return res.send(401, {
                name: 'UserSuspended',
                message: 'User account is suspended. Contact support.'
            })
        }

        req.user = row.user_id
        req.key = req.query.key

        req.apiKey = {
            canTrade: row.can_trade,
            canDeposit: row.can_deposit,
            canWithdraw: row.can_withdraw,
            primary: row.primary,
            admin: row.admin,
            level: row.security_level
        }

        next()
    }

    function unknownKey() {
        req.app.tarpit(function() {
            res.send(401, { name: 'UnknownApiKey', message: 'Unknown API key' })
        })
    }

    var cached = req.app.apiKeys[req.query.key]

    if (cached === false) {
        return unknownKey()
    }

    if (cached) {
        return checkRow(cached)
    }

    debug('cache miss for api key %s', req.query.key)

    req.app.conn.read.query({
        text: [
            'SELECT',
            '   a.user_id,',
            '   a.can_withdraw,',
            '   a.can_deposit,',
            '   a.can_trade,',
            '   a."primary",',
            '   u.admin,',
            '   u.security_level,',
            '   u.suspended',
            'FROM api_key a',
            'INNER JOIN user_view u ON u.user_id = a.user_id',
            'WHERE a.api_key_id = $1'
        ].join('\n'),
        values: [req.query.key]
    }, function(err, dres) {
        if (err) return next(err)

        if (!dres.rowCount) {
            req.app.apiKeys[req.query.key] = false

            return unknownKey()
        }

        req.app.apiKeys[req.query.key] = dres.rows[0]

        checkRow(dres.rows[0])
    })
}

var mappings = {
    trade: 'canTrade',
    deposit: 'canDeposit',
    withdraw: 'canWithdraw',
    admin: 'admin',
    primary: 'primary',
    any: null
}

exports.permission = function(type, level, req, res, next) {
    debug('requiring permission %s of level %d', type, level)

    exports.user(req, res, function(err) {
        if (err) return next(err)
        if (type == 'any') return next()

        var mapping = mappings[type]

        if (!mapping) {
            throw new Error('Mapping not found for ' + type)
        }

        if (req.apiKey[mapping] === undefined) {
            throw new Error('Mapping attr ' + mapping + ' not set on user')
        }

        if (req.apiKey[mapping] !== true) {
            return res.send(401, {
                name: 'AccessDenied',
                message: 'API key/user must have ' + type + ' permission'
            })
        }

        if (level && !exports.demand(level, req, res)) {
            return
        }

        next()
    })
}

Object.keys(mappings).forEach(function(type) {
    exports[type] = function(req, res, next) {
        if (typeof req == 'number') {
            return exports.permission.bind(exports, type, req || 0)
        }

        exports.permission(type, 0, req, res, next)
    }
})
