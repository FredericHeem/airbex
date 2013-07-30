var _ = require('lodash')
, format = require('util').format

module.exports = exports = function(app) {
    app.get('/admin/users', app.auth.admin, exports.users)
    app.get('/admin/users/:id', app.auth.admin, exports.user)
    app.patch('/admin/users/:id', app.auth.admin, exports.patch)
    app.get('/admin/users/:user/bankAccounts',
        app.auth.admin, exports.bankAccounts)
    app.post('/admin/users/:user/bankAccounts/:id/startVerify',
        app.auth.admin, exports.startBankAccountVerify)
    app.get('/admin/users/:user/activity', app.auth.admin, exports.activity)
    app.post('/admin/users/:user/sendVerificationEmail', app.auth.admin,
        exports.sendVerificationEmail)
    app.post('/admin/users/:user/bankAccounts', app.auth.admin,
        exports.addBankAccount)
    app.get('/admin/users/:user/accounts', app.auth.admin, exports.accounts)
    app.post('/admin/users/:user/bankAccounts/:id/setVerified', app.auth.admin,
        exports.setBankAccountVerified)
    app.del('/admin/users/:user/bankAccounts/:id', app.auth.admin,
        exports.removeBankAccount)
}

exports.removeBankAccount = function(req, res, next) {
    req.app.conn.write.query({
        text: 'DELETE FROM bank_account WHERE bank_account_id = $1',
        values: [req.params.id]
    }, function(err, dr) {
        if (err) return next(err)

        if (!dr.rowCount) {
            return res.send(404, {
                name: 'BankAccountNotFound',
                message: 'Bank account #' + req.params.id + ' not found'
            })
        }

        res.send(204)
    })
}

exports.sendVerificationEmail = function(req, res, next) {
    var email = require('../v1/email')
    email.sendVerificationEmail(+req.params.user, req.app, function(err) {
        if (err) return next(err)
        res.send(204)
    })
}

exports.addBankAccount = function(req, res, next) {
    var query = {
        text: [
            'INSERT INTO bank_account (user_id, account_number, iban, swiftbic,',
            'routing_number, verified_at, verify_attempts, verify_started_at)',
            'VALUES ($1, $2, $3, $4, $5, current_timestamp, NULL, current_timestamp)'
        ].join('\n'),
        values: [
            +req.params.user,
            req.body.account_number,
            req.body.iban,
            req.body.swiftbic,
            req.body.routing_number
        ]
    }

    req.app.conn.write.query(query, function(err) {
        if (err) return next(err)
        res.send(204)
    })
}

exports.startBankAccountVerify = function(req, res, next) {
    req.app.conn.write.query({
        text: [
            'UPDATE bank_account',
            'SET verify_started_at = current_timestamp',
            'WHERE',
            '   bank_account_id = $1 AND',
            '   verify_started_at IS NULL'
        ].join('\n'),
        values: [
            req.params.id
        ]
    }, function(err, dr) {
        if (err) return next(err)

        if (!dr.rowCount) {
            return res.send(404, {
                name: 'BankAccountNotFound',
                message: 'Bank account not found or already started verifying'
            })
        }

        res.send(204)
    })
}

exports.setBankAccountVerified = function(req, res, next) {
    req.app.conn.write.query({
        text: [
            'UPDATE bank_account',
            'SET',
            '   verify_started_at = current_timestamp,',
            '   verified_at = current_timestamp,',
            '   verify_code = null,',
            '   verify_attempts = null',
            'WHERE',
            '   bank_account_id = $1 AND',
            '   verified_at IS NULL',
            'RETURNING user_id, account_number, iban'
        ].join('\n'),
        values: [
            req.params.id
        ]
    }, function(err, dr) {
        if (err) return next(err)

        if (!dr.rowCount) {
            return res.send(404, {
                name: 'BankAccountNotFound',
                message: 'Bank account not found or already verifying'
            })
        }

        var row = dr.rows[0]

        req.app.activity(req.user, 'AdminVerifyBankAccount', {
            id: +req.params.id,
            user_id: req.params.user
        })

        req.app.activity(row.user_id, 'VerifyBankAccount', {
            accountNumber: row.account_number,
            iban: row.iban
        })

        res.send(204)
    })
}

exports.user = function(req, res, next) {
    req.app.conn.read.query({
        text: [
            'SELECT * FROM admin_user_view WHERE user_id = $1'
        ].join('\n'),
        values: [+req.params.id]
    }, function(err, dr) {
        if (err) return next(err)

        if (!dr.rowCount) {
            return res.send(404, {
                name: 'UserNotFound',
                message: 'There is no user with the specified id.'
            })
        }

        res.send(dr.rows[0])
    })
}

exports.patch = function(req, res, next) {
    var updates = {}
    , values = [req.params.id]
    , allowed = ['email', 'first_name', 'last_name', 'phone_number', 'country',
        'city', 'postal_area', 'address', 'suspended']

    _.each(allowed, function(k) {
        if (req.body[k] === undefined) return
        updates[k] = req.body[k]
    })

    var updateText = _.map(updates, function(value, key) {
        values.push(value)
        return key + ' = $' + values.length
    })

    if (values.length === 1) {
        return res.send(400, {
            name: 'NoUpdates',
            message: 'No updates were provided'
        })
    }

    req.app.conn.write.query({
        text: [
            'UPDATE "user"',
            'SET ' + updateText,
            'WHERE user_id = $1'
        ].join('\n'),
        values: values
    }, function(err, dr) {
        if (err) return next(err)
        if (!dr.rowCount) return next(new Error('User ' + req.user + ' not found'))

        req.app.activity(req.user, 'AdminEditUser', {
            user_id: req.params.id,
            edits: req.body
        })

        res.send(204)
    })
}

exports.bankAccounts = function(req, res, next) {
    req.app.conn.read.query({
        text: [
            'SELECT * FROM bank_account WHERE user_id = $1'
        ].join('\n'),
        values: [req.params.user]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(200, dr.rows.map(function(row) {
            return row
        }))
    })
}

exports.accounts = function(req, res, next) {
    req.app.conn.read.query({
        text: [
            'SELECT',
            '   a.account_id,',
            '   a.currency_id,',
            '   a.type,',
            '   a.balance,',
            '   a.hold,',
            '   (a.balance - a.hold) available',
            'FROM account a',
            'WHERE a.user_id = $1',
            'ORDER BY currency_id, type ASC'
        ].join('\n'),
        values: [req.params.user]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(function(row) {
            return {
                account_id: row.account_id,
                currency: row.currency_id,
                balance: req.app.cache.formatCurrency(row.balance, row.currency_id),
                hold: req.app.cache.formatCurrency(row.hold, row.currency_id),
                available: req.app.cache.formatCurrency(row.available, row.currency_id),
                type: row.type
            }
        }))
    })
}

exports.activity = function(req, res, next) {
    req.app.conn.read.query({
        text: [
            'SELECT * FROM activity WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100'
        ].join('\n'),
        values: [req.params.user]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(200, dr.rows.map(function(row) {
            row.details = JSON.parse(row.details)
            return row
        }))
    })
}

exports.buildQuery = function(params) {
    var query = ['SELECT * FROM "user"']
    , conditions = []
    , values = []

    if (params.user_id || params.all) {
        conditions.push(['user_id', params.user_id || params.all ])
    }
    if (+(params.user_id || params.all)) {
        conditions.push(['user_id', (params.user_id || params.all) / 1234 ])
    }

    if (params.phone_number || params.all) {
        conditions.push(['phone_number', params.phone_number || params.all])
    }

    if (params.first_name || params.all) {
        conditions.push(['first_name', params.first_name || params.all])
    }

    if (params.last_name || params.all) {
        conditions.push(['last_name', params.last_name || params.all])
    }

    if (params.country || params.all) {
        conditions.push(['country', params.country || params.all])
    }

    if (params.email || params.all) {
        conditions.push(['email', params.email || params.all])
    }

    if (conditions.length) {
        query.push('WHERE')
        query.push(conditions.map(function(x) {
            values.push('%' + x[1] + '%')
            return format('%s::varchar ~~* $%d', x[0], values.length)
        }).join(' OR '))
    }

    var orders = []

    // Prioritize direct matching of user id
    if (params.user_id || params.all) {
        values.push(params.user_id || params.all)
        orders.push(format(
            'CASE WHEN user_id::varchar = $%d THEN 0 ELSE 1 END',
            values.length))
    }

    orders.push('user_id')

    query.push('ORDER BY')
    query.push(orders.join(','))

    return {
        text: query.join('\n'),
        values: values
    }
}

exports.users = function(req, res, next) {
    var query = exports.buildQuery(req.query)
    req.app.conn.read.query(query, function(err, dr) {
        if (err) return next(err)
        return res.send(dr.rows)
    })
}
