var Q = require('q')
, Drop = require('drop')
, num = require('num')
, debug = require('debug')('snow:rippleout')
, assert = require('assert')
, _ = require('underscore')
, raven = require('./raven')
, util = require('util')

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

    this.cacheCurrencies()
    .fail(function(err) {
        raven.captureError(err)
        return Q.delay(30e3)
    })
    .then(this.loop.bind(this))
    .done()
}

RippleOut.prototype.getBatch = function() {
    var query = ['SELECT * FROM pop_ripple_withdraw_requests()'].join('\n')
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
        console.error('[snow:rippleout] withdraw request %s could not be requeued', request.request_id)
        console.error(error)
        console.error(error.stack)
    })
}

RippleOut.prototype.abortRequest = function(request, error) {
    return Q.ninvoke(this.client, 'query', {
        text: 'SELECT cancel_withdraw_request($1, $2)',
        values: [request.request_id, error || null]
    })
    .then(function() {
        debug('withdraw request %s was deleted', request.request_id)
    }, function(err) {
        console.error('[snow:rippleout] withdraw request %s could not be deleted', request.request_id)
        console.error(err)
        console.error(err.stack)
    })
}

RippleOut.prototype.executeWithdraw = function(request) {
    debug('executing withdraw')

    var that = this
    return Q.fcall(function() {
        var amount = request.currency_id === 'XRP' ?
            '' + +num(request.amount, request.scale).mul(1e6) :
            {
                value: request.currency_id == 'XRP' ? request.amount : +num(request.amount, request.scale) + '',
                currency: request.currency_id,
                issuer: that.account
            }

        console.log('[snow:rippleout] sending %j to %s', amount, request.address)

        return that.drop.payment(that.account, request.address, that.drop.amountToJSON(amount))
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
            } else if (error.name == 'tecUNFUNDED_PAYMENT') {
                error.abort = true
            } else {
                console.error('[snow:rippleout] unknown error name from drop %s', error.name || '<null>')
            }

            throw error
        })
    })
}

RippleOut.prototype.processRequest = function(request) {
    var that = this

    debug('processing request %s', util.inspect(request))

    if (request.currency_id == 'XRP') {
        debug('will not verify lines for XRP withdraw')
        return this.executeWithdraw(request)
    }

    debug('retrieving account lines for %s', request.address)

    return this.drop.accountLines(request.address)
    .then(function(lines) {
        var line = _.where(lines, {
            account: that.account,
            currency: request.currency_id
        })[0]

        var diff = num(line ? num(line.limit).sub(line.balance) : 0).sub(num(request.amount, request.scale))

        debug('line diff %s', diff)

        if (!line || diff.lt(0)) {
            if (!line) debug('user has no line to %s', that.account)
            debug('user is missing %s in his %s line to %s', diff, request.currency_id, that.account)

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
            .then(function() {
                console.log('[snow:rippleout] withdraw request %s processed successfully', request.request_id)
            }, function(error) {
                //raven.captureError(error)

                if (error.abort) {
                    debug('the transaction was aborted')

                    if (error.retry) {
                        debug('will requeue the request')
                        return that.requeue(request)
                    } else {
                        return that.abortRequest(request, 'internal error')
                    }
                }

                console.error('[snow:rippleout] withdraw request %s is in an uncertain state', request.request_id)
            })
        }))
    })
    .then(function() {
        return Q.delay(10e3)
    })
    .then(this.loop.bind(this))
}

RippleOut.prototype.cacheCurrencies = function() {
    var that = this
    debug('caching currencies')
    return Q.ninvoke(this.client, 'query', 'SELECT currency_id, scale FROM "currency"')
    .get('rows')
    .then(function(currencies) {
        debug('found %s currencies', currencies.length)
        that.currencies = currencies.reduce(function(p, c) {
            p[c.currency_id] = { scale: c.scale }
            return p
        }, {})
    })
}
