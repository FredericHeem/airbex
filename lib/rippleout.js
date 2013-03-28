var Q = require('q')
, Drop = require('drop')
, num = require('num')
, debug = require('debug')('snow:rippleout')
, assert = require('assert')
, _ = require('underscore')
, raven = require('./raven')

var RippleOut = module.exports = function(db, account, secret, uri) {
    var that = this
    this.client = db
    this.account = account

    var dropConfig = { secrets: {} }
    dropConfig.secrets[account] = secret

    if (uri) {
        dropConfig.uri = uri
    }

    this.drop = new Drop(dropConfig)

    this.cacheSecurities()
    .fail(function(err) {
        raven.captureError(err)
        return Q.delay(30e3)
    })
    .then(this.loop.bind(this))
    .done()
}

RippleOut.prototype.getBatch = function() {
    var query = ['SELECT * FROM pop_ripple_withdraw_requests() AS',
            '(request_id int, amount bigint, security_id security_id, scale int, address varchar(34));'].join('\n')
    return Q.ninvoke(this.client, 'query', query).get('rows')
}

RippleOut.prototype.requeue = function(request) {
    return Q.ninvoke(this.client, 'query', {
        text: 'UPDATE withdraw_request SET state = \'requested\' WHERE request_id = $1',
        values: [request.request_id]
    })
    .then(function() {
        debug('withdraw request %s was requeued', request.request_id)
    }, function(error) {
        console.error('withdraw request %s could not be requeued', request.request_id)
        console.error(error)
        console.error(error.stack)
    })
}

RippleOut.prototype.abortRequest = function(request) {
    return Q.ninvoke(this.client, 'query', {
        text: 'DELETE FROM hold WHERE hold_id = $1',
        values: [request.hold_id]
    })
    .then(function() {
        debug('withdraw request %s was deleted', request.request_id)
    }, function(error) {
        console.error('withdraw request %s could not be deleted', request.request_id)
        console.error(error)
        console.error(error.stack)
    })
}

RippleOut.prototype.executeWithdraw = function(request) {
    debug('executing withdraw')

    var that = this
    return Q.fcall(function() {
        var amount = {
            value: request.security_id == 'XRP' ? request.amount : +num(request.amount, request.scale) + '',
            currency: request.security_id,
            issuer: request.security_id == 'XRP'? null : that.account
        }

        console.log('sending %j to %s', amount, request.address)

        return that.drop.payment(that.account, request.address, amount)
        .then(function(result) {
            debug('confirming withdraw')

            return Q.ninvoke(that.client, 'query', {
                text: 'SELECT confirm_withdraw($1)',
                values: [request.request_id]
            })
            .get('rows').get(0)
            .then(function(result) {
                if (!result.confirm_withdraw) {
                    throw new Error('unable to interpret confirm_withdraw result')
                }

                debug('withraw confirmed')
            })
        })
        .fail(function(error) {
            if (error.name == 'malformedTransaction') {
                error.abort = true
            }

            throw error
        })
    })
}

RippleOut.prototype.processRequest = function(request) {
    var that = this
    if (request.security_id == 'XRP') {
        debug('will not verify lines for XRP withdraw')
        return this.executeWithdraw(request)
    }

    return this.drop.accountLines(request.address)
    .then(function(lines) {
        var line = _.where(lines, {
            account: that.account,
            currency: request.security_id
        })[0]

        var diff = num(line ? num(line.limit).sub(line.balance) : 0).sub(num(request.amount, request.scale))

        debug('line diff %s', diff)

        if (!line || diff.lt(0)) {
            if (!line) debug('user has no line to %s', that.account)
            debug('user is missing %s in his %s line to %s', diff, request.security_id, that.account)

            var error = new Error('User is lacking trust')
            error.code = 'ETRUST_TOO_LOW'
            error.abort = true
            throw error
        }

        return that.executeWithdraw(request)
    })
}

RippleOut.prototype.loop = function() {
    var that = this
    return this.getBatch()
    .then(function(requests) {
        if (!requests.length) {
            debug('nothing to do')
            return Q.delay(10e3)
        }

        return Q.all(requests.map(function(request) {
            return that.processRequest(request)
            .fail(function(error) {
                raven.captureError(error)

                if (error.abort) {
                    debug('the transaction was aborted')

                    if (error.retry) {
                        debug('will requeue the request')
                        return that.requeue(request)
                    } else {
                        return that.abortRequest(request)
                    }
                }

                console.error('withdraw request %s is in an uncertain state', request.request_id)
            })
        }))
    })
    .then(function() {
        return Q.delay(10e3)
    })
    .then(this.loop.bind(this))
}

RippleOut.prototype.cacheSecurities = function() {
    var that = this
    debug('caching securities')
    return Q.ninvoke(this.client, 'query', 'SELECT security_id, scale FROM "security"')
    .get('rows')
    .then(function(securities) {
        debug('found %s securities', securities.length)
        that.securities = securities.reduce(function(p, c) {
            p[c.security_id] = { scale: c.scale }
            return p
        }, {})
    })
}
