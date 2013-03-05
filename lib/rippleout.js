var Q = require('q')
, Drop = require('drop')
, num = require('num')
, debug = require('debug')('snow:ripplein')
, assert = require('assert')

var RippleOut = module.exports = function(db, address) {
    var that = this
    this.client = db()
    this.address = address
    this.drop = new Drop()
    this.cacheSecurities()
    .fail(function(error) {
        console.error(error)
        console.error(error.stack)
        process.exit()
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
    return Q.ninvoke(that.client, 'query', {
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
    var that = this
    return Q.fcall(function() {
        var error = new Error('not implemented')
        error.aborted = true
        error.retry = true
        throw error
    })
    .fail(function(error) {
        console.error('withdraw failed:')
        console.error(error)
        console.error(error.stack)

        if (error.aborted) {
            debug('the transaction was aborted')

            if (error.retry) {
                debug('will requeue the request')
                return that.requeue(request)
            } else {
                return that.abortRequest(request)
            }
        }

        console.error('withdraw request %s is in an uncertain state', request.request_id)
        // TODO: put back in queue in certain cases
    })
}

RippleOut.prototype.processRequest = function(request) {
    if (request.security_id == 'XRP') {
        debug('will not verify lines for XRP withdraw')
        return this.executeWithdraw(request)
    }

    this.drop.accountLines(request.address)
    .then(function(lines) {
        console.log(lines)
    })
}

RippleOut.prototype.loop = function() {
    var that = this
    return this.getBatch()
    .then(function(items) {
        if (!items.length) {
            debug('nothing to do')
            return Q.delay(10e3)
        }

        return Q.all(items.map(function(item) {
            return that.processRequest(item)
        }))
    })
    .then(function() {
        return Q.delay(10e3)
    })
    .then()
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

new RippleOut(require('./db'))
