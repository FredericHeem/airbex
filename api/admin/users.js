var users = module.exports = {}
, _ = require('lodash')
, format = require('util').format
, activities = require('../v1/activities')

users.configure = function(app, conn, auth) {
    app.get('/admin/users', auth, users.users.bind(users, conn))
    app.get('/admin/users/:id', auth, users.user.bind(users, conn))
    app.patch('/admin/users/:id', auth, users.patch.bind(users, conn))
    app.get('/admin/users/:user/bankAccounts', auth, users.bankAccounts.bind(users, conn))
    app.post('/admin/users/:user/bankAccounts/:id/startVerify',
        auth, users.startBankAccountVerify.bind(users, conn))
    app.get('/admin/users/:user/withdrawRequests', auth,
        users.withdrawRequests.bind(users, conn))
    app.get('/admin/users/:user/activity', auth, users.activity.bind(users, conn))
    app.post('/admin/users/:user/sendVerificationEmail', auth,
        users.sendVerificationEmail.bind(users, conn))
    app.post('/admin/users/:user/bankAccounts', auth,
        users.addBankAccount.bind(users, conn))
    app.get('/admin/users/:user/accounts', auth, users.accounts.bind(users, conn))
    app.post('/admin/users/:user/bankAccounts/:id/setVerified', auth,
        users.setBankAccountVerified.bind(users, conn))
}

users.sendVerificationEmail = function(conn, req, res, next) {
    var email = require('../v1/email')
    email.sendVerificationEmail(conn, req.app.smtp, req.params.user, function(err) {
        if (err) return next(err)
        res.send(204)
    })
}

users.addBankAccount = function(conn, req, res, next) {
    conn.write.query({
        text: [
            'INSERT INTO bank_account (user_id, account_number, iban, swiftbic,',
            'routing_number, verified_at)',
            'VALUES ($1, $2, $3, $4, $5, current_timestamp)'
        ].join('\n'),
        values: [
            +req.params.user,
            req.body.account_number,
            req.body.iban,
            req.body.swiftbic,
            req.body.routing_number
        ]
    }, function(err) {
        if (err) return next(err)
        res.send(204)
    })
}

users.startBankAccountVerify = function(conn, req, res, next) {
    conn.write.query({
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

users.setBankAccountVerified = function(conn, req, res, next) {
    conn.write.query({
        text: [
            'UPDATE bank_account',
            'SET',
            '   verify_started_at = current_timestamp,',
            '   verified_at = current_timestamp,',
            '   verify_code = null,',
            '   verify_attempts = null',
            'WHERE',
            '   bank_account_id = $1 AND',
            '   verified_at IS NULL'
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

        res.send(204)
    })
}

users.user = function(conn, req, res, next) {
    conn.read.query({
        text: [
            'SELECT * FROM "user" WHERE user_id = $1'
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

users.patch = function(conn, req, res, next) {
    var updates = {}
    , values = [req.params.id]
    , allowed = ['email', 'first_name', 'last_name', 'phone_number', 'country',
        'city', 'postal_area', 'address', 'simple']

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

    conn.write.query({
        text: [
            'UPDATE "user"',
            'SET ' + updateText,
            'WHERE user_id = $1'
        ].join('\n'),
        values: values
    }, function(err, dr) {
        if (err) return next(err)
        if (!dr.rowCount) return next(new Error('User ' + req.user + ' not found'))

        activities.log(conn, req.user, 'AdminEditUser', {
            user_id: req.params.id,
            edits: req.body
        })

        res.send(204)
    })
}

users.bankAccounts = function(conn, req, res, next) {
    conn.read.query({
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

users.accounts = function(conn, req, res, next) {
    conn.read.query({
        text: [
            'SELECT',
            '   a.account_id,',
            '   a.currency_id AS currency,',
            '   a.type,',
            '   a.balance / 10^c.scale balance,',
            '   a.hold / 10^c.scale "hold",',
            '   (a.balance - a.hold) / 10^c.scale available',
            'FROM account a',
            'INNER JOIN "currency" c ON a.currency_id = c.currency_id',
            'WHERE a.user_id = $1',
            'ORDER BY currency, type'
        ].join('\n'),
        values: [req.params.user]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows)
    })
}

users.activity = function(conn, req, res, next) {
    conn.read.query({
        text: [
            'SELECT * FROM activity WHERE user_id = $1 ORDER BY created DESC LIMIT 100'
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

users.withdrawRequests = function(conn, req, res, next) {
    conn.read.query({
        text: 'SELECT * FROM withdraw_request_view WHERE user_id = $1',
        values: [req.params.user]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(function(row) {
            var destination

            if (row.method == 'BTC') {
                destination = row.bitcoin_address
            } else if (row.method == 'LTC') {
                destination = row.litecoin_address
            } else if (row.method == 'ripple') {
                destination = row.ripple_address
            } else if (row.method == 'bank') {
                destination = row.bank_account_id
            }

            if (!destination) {
                return next(new Error('Unknown destination for ' + JSON.stringify(row)))
            }

            row.destination = destination
            row.amount = req.app.cache.formatCurrency(row.amount, row.currency_id)

            return row
        }))
    })
}

users.buildQuery = function(params) {
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

    query.push('ORDER BY user_id ASC')

    return {
        text: query.join('\n'),
        values: values
    }
}

users.users = function(conn, req, res, next) {
    var query = users.buildQuery(req.query)
    conn.read.query(query, function(err, dr) {
        if (err) return next(err)
        return res.send(dr.rows)
    })
}
