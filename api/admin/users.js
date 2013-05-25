var users = module.exports = {}
, _ = require('lodash')
, format = require('util').format
, activities = require('../v1/activities')

users.configure = function(app, conn, auth) {
    app.get('/admin/users', auth, users.users.bind(users, conn))
    app.get('/admin/users/:id', auth, users.user.bind(users, conn))
    app.get('/admin/users/:user/bankAccounts', auth, users.bankAccounts.bind(users, conn))
    app.get('/admin/users/:user/withdrawRequests', auth, users.withdrawRequests.bind(users, conn))
    app.get('/admin/users/:user/activities', auth, users.activities.bind(users, conn))
    app.post('/admin/users/:user/bankAccounts', auth, users.addBankAccount.bind(users, conn))
}

users.addBankAccount = function(conn, req, res, next) {
    conn.write.query({
        text: [
            'INSERT INTO bank_account (user_id, account_number, iban, swiftbic, routing_number)',
            'VALUES ($1, $2, $3, $4, $5)'
        ].join('\n'),
        values: [
            +req.params.user,
            req.body.account_number,
            req.body.iban,
            req.body.swiftbic,
            req.body.routing_number
        ]
    }, function(err, dr) {
        if (err) return next(err)
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

        if (!dr.rowCount) return res.send(404, {
            name: 'UserNotFound',
            message: 'There is no user with the specified id.'
        })
        res.send(dr.rows[0])
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
            console.log(row)
            return _.extend(_.pick(row, 'iban', 'swiftbic'), {
                id: row.bank_account_id,
                displayName: row.display_name,
                accountNumber: row.account_number,
                routingNumber: row.routing_number
            })
        }))
    })
}

users.activities = function(conn, req, res, next) {
    conn.read.query({
        text: [
            'SELECT * FROM activity WHERE user_id = $1'
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
            } else if (row.method == 'manual') {
                if (row.manual_destination.type == 'NorwayBank') {
                    destination = row.manual_destination.account
                }
            }

            if (!destination) {
                return next(new Error('Unknown destination for ' + JSON.stringify(row)))
            }

            return _.extend({
                currency: row.currency_id,
                amount: req.app.cache.formatCurrency(row.amount, row.currency_id),
                id: row.request_id,
                destination:  destination
            }, _.pick(row, 'created', 'completed', 'method', 'state', 'error'))
        }))
    })
}

users.buildQuery = function(params) {
    var query = ['SELECT * FROM "user"']
    , conditions = []
    , values = []

    if (params.user_id || params.all) conditions.push(['user_id', params.user_id || params.all ])
    if (params.phone_number || params.all) conditions.push(['phone_number', params.phone_number || params.all])
    if (params.first_name || params.all) conditions.push(['first_name', params.first_name || params.all])
    if (params.last_name || params.all) conditions.push(['last_name', params.last_name || params.all])
    if (params.country || params.all) conditions.push(['country', params.country || params.all])
    if (params.email || params.all) conditions.push(['email', params.email || params.all])

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
    console.log(JSON.stringify(query, null, 4))
    conn.read.query(query, function(err, dr) {
        if (err) return next(err)
        return res.send(dr.rows)
    })
}
