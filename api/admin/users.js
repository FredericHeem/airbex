var _ = require('lodash')
, format = require('util').format
, debug = require('debug')('snow:users:documents')
, builder = require('pg-builder')

module.exports = exports = function(app) {
    app.get('/admin/users', app.security.demand.admin, exports.users)
    app.get('/admin/users/:id', app.security.demand.admin, exports.user)
    app.patch('/admin/users/:id', app.security.demand.admin, exports.patch)
    app.get('/admin/users/:user/bankAccounts',
        app.security.demand.admin, exports.bankAccounts)
        
    app.get('/admin/users/:user/activity', app.security.demand.admin, exports.activity)
    app.post('/admin/users/:user/sendVerificationEmail', app.security.demand.admin,
        exports.sendVerificationEmail)
    app.post('/admin/users/:user/bankAccounts', app.security.demand.admin,
        exports.addBankAccount)
    app.get('/admin/users/:user/accounts', app.security.demand.admin, exports.accounts)
    app.del('/admin/users/:user/bankAccounts/:id', app.security.demand.admin,
        exports.removeBankAccount)
    app.post('/admin/users/:user/forgivePasswordReset', app.security.demand.admin,
        exports.forgivePasswordReset)
    app.get('/admin/users/:user/documents', app.security.demand.admin, exports.documents)
    app.get('/admin/users/documents/:document', app.security.demand.admin, exports.documentFile)
    app.post('/admin/users/documents/:document/approve', app.security.demand.admin, exports.documentApprove)
    app.post('/admin/users/documents/:document/reject', app.security.demand.admin, exports.documentReject)
}

exports.forgivePasswordReset = function(req, res, next) {
    req.app.conn.write.query({
        text: 'UPDATE "user" SET reset_started_at = NULL WHERE user_id = $1',
        values: [+req.params.user]
    }, function(err, dr) {
        if (err) return next(err)

        if (!dr.rowCount) {
            return res.send(404, {
                name: 'UserNotFound',
                message: 'User not found'
            })
        }

        res.send(204)
    })
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
    email.sendVerificationEmail(req.app, +req.params.user, function(err) {
        if (err) return next(err)
        res.send(204)
    })
}

exports.addBankAccount = function(req, res, next) {
    var query = {
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
    }

    req.app.conn.write.query(query, function(err) {
        if (err) return next(err)
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
    , allowed = ['first_name', 'last_name', 'phone_number', 'country',
        'city', 'postal_area', 'address', 'suspended', 'email']

    _.each(allowed, function(k) {
        if (req.body[k] === undefined) return
        updates[k] = req.body[k]
    })

    updates = _.map(updates, function(value, key) {
        values.push(value)
        return key + ' = $' + values.length
    })

    if (req.body.poi_approved !== undefined) {
        updates.push('poi_approved_at = ' + (req.body.poi_approved ? 'now()' : 'null'))
    }

    if (req.body.poa_approved !== undefined) {
        updates.push('poa_approved_at = ' + (req.body.poa_approved ? 'now()' : 'null'))
    }

    if (!updates.length) {
        return res.send(400, {
            name: 'NoUpdates',
            message: 'No updates were provided'
        })
    }

    req.app.conn.write.query({
        text: [
            'UPDATE "user"',
            'SET ' + updates.join(),
            'WHERE user_id = $1',
            'RETURNING poi_approved_at, poa_approved_at'
        ].join('\n'),
        values: values
    }, function(err, dr) {
        if (err) return next(err)

        if (!dr.rowCount) {
            return next(new Error('User ' + req.params.id + ' not found'))
        }

        req.app.activity(req.user.id, 'AdminEditUser', {
            user_id: req.params.id,
            edits: req.body
        })

        var row = dr.rows[0]

        // Will this mark the user as having passed KyC?
        if ((req.body.poi_approved || req.body.poa_approved) &&
            row.poi_approved_at &&
            row.poa_approved_at)
        {
            req.app.activity(req.params.id, 'KycCompleted', {})
        }

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

exports.documents = function(req, res, next) {
    debug("documents user: %s", req.params.user);
    req.app.conn.read.query({
        text: [
                 'SELECT document_id, name, size, last_modified_date, "type", status, message',
                 'FROM document',
                 'WHERE user_id = $1',
                 'ORDER BY document_id'
        ].join('\n'),
        values: [req.params.user]
    }, function(err, dr) {
        if (err) return next(err)

        res.send(dr.rows.map(function(row) {
            return {
                userId: req.params.user,
                document_id: row.document_id,
                name: row.name,
                status: row.status,
                last_modified_date: row.last_modified_date
            }
        }))
    })
}

exports.documentFile = function(req, res, next) {
    debug("documentsFile doc id %s", req.params.document);
    req.app.conn.read.query({
        text: [
                 'SELECT name, image',
                 'FROM document',
                 'WHERE document_id = $1',
        ].join('\n'),
        values: [req.params.document]
    }, function(err, dr) {
        if (err) return next(err)
        var row = dr.rows[0];
        if(row && row.image){
            var data = new Buffer(row.image, 'base64');
            debug("sending %s/%s", data.length, row.image.length);
            res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                "Content-Disposition": "attachment;filename=" + row.name});
            res.end(data);
        } else {
            debug("cannot find document payload in db");
            res.send(404);
        } 
    })
}

exports.documentApprove = function(req, res, next) {
    debug("documentApprove user: %s, doc id %s", req.params.user, req.params.document);
    req.app.conn.read.query({
        text: [
                  'UPDATE "document"',
                  "SET status='Accepted'",
                  'WHERE document_id = $1',
        ].join('\n'),
        values: [req.params.document]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(200);
    })
}

exports.documentReject = function(req, res, next) {
    debug("documentReject user: %s, doc id %s", req.params.user, req.params.document);
    req.app.conn.read.query({
        text: [
                  'UPDATE "document"',
                  "SET status='Rejected'",
                  'WHERE document_id = $1',
        ].join('\n'),
        values: [req.params.document]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(200);
    })
}

exports.buildQuery = function(params) {
    var query = ['SELECT * FROM "user"']
    , conditions = []
    , values = []

    if (params.user_id || params.all) {
        conditions.push(['user_id', params.user_id || params.all ])
    }

    if (params.tag || params.all) {
        conditions.push(['tag', params.tag || params.all ])
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
    var q = builder()
    .f('"user"')
    .s('*')
    .s('COUNT(*) OVER() full_row_count')

    if (req.query.tag) {
        q = q.w('tag = ${tag}')
    }

    if (req.query.all) {
        q = q.w([
            'tag::varchar = ${all}',
            'user_id::varchar = ${all}',
            'first_name || \' \' || last_name ~~* (\'%\' || ${all} || \'%\')',
            'phone_number ~~* (\'%\' || ${all})',
            'country = ${all}',
            'address ~~* (\'%\' || ${all} || \'%\')',
            'email ~~* (\'%\' || ${all} || \'%\')'
        ].join(' OR '))
    }

    q = q.p(_.pick(req.query, 'all', 'tag'))

    var limit = Math.min(50, +req.query.limit || 50)
    q = q.limit(limit)

    if (req.query.all !== undefined) {
        q = q.o('CASE WHEN user_id::varchar = ${all} THEN 0 ELSE 1 END')
    }

    q = q.o('user_id', 'asc')

    if (req.query.skip) q = q.skip(req.query.skip)

    req.app.conn.read.query(q, function(err, dr) {
        if (err) return next(err)

        res.send({
            count: dr.rows[0] ? dr.rows[0].full_row_count : 0,
            limit: limit,
            users: dr.rows.map(function(row) {
                console.log(row)
                return _.omit(row, 'full_row_count')
            })
        })
    })
}
