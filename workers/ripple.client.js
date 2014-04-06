var _ = require('lodash')
, EventEmitter = require('events').EventEmitter
, util = require('util')
, debug = require('debug')('snow:ripple:client')
, ReconnectWs = require('./reconnectws')
, assert = require('assert')
, num = require('num')

function RippleClient(opts) {
    this.opts = _.extend({
        uri: 'wss://s1.ripple.com'
    }, opts)

    this.connected = false

    this.conn = new ReconnectWs(this.opts.uri)
    this.conn.on('open', this.connOpen.bind(this))
    this.conn.on('close', this.connClose.bind(this))
    this.conn.on('message', this.connMessage.bind(this))
}

util.inherits(RippleClient, EventEmitter)

RippleClient.prototype.connOpen = function() {
    debug('connected')
    this.commandIndex = 0
    this.requests = {}
    this.connected = true
    this.emit('open')
}

RippleClient.prototype.connClose = function() {
    debug('disconnected')
    this.connected = false

    // Resolve pending requests as error from disconnect
    _.each(this.requests, function(cb) {
        cb(new Error('Disconnected during request'))
    })

    this.emit('close')
}

RippleClient.prototype.connMessage = function(msg) {
    var data = JSON.parse(msg)
    debug('<-- %s', util.inspect(data))

    // Is this a response to a request?
    var id = data.id
    if (id !== undefined) {
        var request = this.requests[id]
        if (request) {
            delete this.requests[id]
            assert.equal(data.type, 'response')

            if (data.status == 'success') {
                return request(null, data.result)
            }

            if (data.status == 'error') {
                return request(new Error(data.error_message || data.error))
            }

            request(new Error('Unknown result: ' + data.result))
        }
    }

    // Is this the result of a subscription?
    if (data.type == 'transaction') {
        assert.equal(data.engine_result, 'tesSUCCESS')
        assert.equal(data.meta.TransactionResult, 'tesSUCCESS')
        assert.equal(data.status, 'closed')
        assert.equal(data.validated, true)
        return this.emit('transaction', data.transaction)
    }

    if (data.type == 'ledgerClosed') {
        return this.emit('ledgerclosed', data)
    }

    console.error('unhandled transaction type %s', data.type)
}

RippleClient.prototype.request = function(cmd, opts, cb) {
    cb|| (cb = opts)
    var id = this.commandIndex++
    , request = _.extend({
        id: id,
        command: cmd
    }, opts)

    debug('--> %s', util.inspect(request))

    this.conn.send(JSON.stringify(request, null, 4), function(err) {
        if (err) return cb ? cb(err) : null
        if (!cb) return
        this.requests[id] = cb
    }.bind(this))
}

function censor(s) {
    return s.replace(/secret\: ['"]?[A-Za-z0-9]+["']?/g, 'secret: *** SECRET ***')
}

RippleClient.prototype.submit = function(tx, cb) {
    assert(this.opts.secrets[tx.Account])
    assert(tx.TransactionType)

    var tx_json = _.defaults(tx, {
        Flags: 0
    })

    debug('tx_json %s', censor(util.inspect(tx_json, null, 4)))

    this.request('submit', {
        secret: this.opts.secrets[tx.Account],
        tx_json: tx_json
    }, function(err, res) {
        if (err) return cb(err)

        if (res.engine_result == 'tesSUCCESS') {
            return cb(null, res.tx_json.hash, res.tx_json.Sequence)
        }

        err = new Error(res.engine_result_message)
        err.name = res.engine_result
        err.code = res.engine_result_code
        return cb(err)
    })
}

function removeTrailingZeroes(s) {
    return s.replace(/\.?0+$/, '')
}

function toTheirPayment(our) {
    assert(our.currency)
    assert(our.amount)

    if (our.currency == 'XRP') {
        var n = num(our.amount).mul(1e6)
        n.set_precision(0)
        return n.toString()
    }

    var res = {
        value: removeTrailingZeroes(our.amount),
        currency: our.currency
    }

    if (our.issuer) res.issuer = our.issuer

    return res
}

RippleClient.prototype.payment = function(details, cb) {
    assert(details.from)
    assert(details.to)
    assert(details.amount)
    assert(details.currency)

    var tx = {
        TransactionType: 'Payment',
        Account: details.from,
        Amount: toTheirPayment({
            currency: details.currency,
            issuer: details.issuer,
            amount: details.amount
        }),
        Destination: details.to
    }

    if (details.dt) {
        tx.DestinationTag = details.dt
    }

    if (details.st) {
        tx.SourceTag = details.st
    }

    debug('submitting payment...')
    this.submit(tx, cb)
}

module.exports = RippleClient
