var debug = require('debug')('snow:auth')

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
            admin: row.admin
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
            '   u.suspended',
            'FROM api_key a',
            'INNER JOIN "user" u ON u.user_id = a.user_id',
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

exports.permission = function(type, req, res, next) {
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

        next()
    })
}

Object.keys(mappings).forEach(function(type) {
    exports[type] = function(req, res, next) {
        exports.permission(type, req, res, next)
    }
})
