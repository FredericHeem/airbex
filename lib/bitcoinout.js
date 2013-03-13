var debug = require('debug')('snow:bitcoinout')
, num = require('num')
, util = require('util')
, Q = require('q')
, raven = require('./raven')

var BitcoinOut = module.exports = function(bitcoinEndpoint, dbClient) {
    var Bitcoin = require('bitcoin').Client
    this.bitcoin = new Bitcoin(bitcoinEndpoint)
    this.client = dbClient
    this.loop().done()
}

BitcoinOut.prototype.loop = function() {
    var that = this
    return this.send()
    .then(function(result) {
        if (result) return that.loop()
        return Q.delay(10e3)
        .then(function() {
            return that.loop()
        })
    })
}

BitcoinOut.prototype.getBatch = function() {
    debug('getting batch')
    var query = ['SELECT * FROM pop_btc_withdraw_requests() AS',
            '(request_id int, amount bigint, scale int, address varchar(34));'].join('\n')
    return Q.ninvoke(this.client, 'query', query).get('rows')
}

BitcoinOut.prototype.executeBatch = function(jobs) {
    var that = this
    var r = _.reduce(jobs, function(r, i) { r[i.address] = +num(i.amount, i.scale); return r; }, { })
    debug('will send ' + jobs.length + ' transactions')
    debug('sends to perform: ' + JSON.stringify(r, null, 4))
    return Q.ninvoke(this.bitcoin, 'sendMany', '', r)
    .fail(function(err) {
        if (err.code == -6) {
            debug('insufficient balance to send, trying to put jobs back in queue')

            var ids = _.pluck(jobs, 'request_id')

            return Q.ninvoke(that.client, 'query',
                ['UPDATE withdraw_request SET state = "requested"',
                'WHERE request_id IN (' + ids.join(', ') + ')'
            ].join('\n'))
            .then(function() {
                throw err;
            })

            debug('unhandled error. code=' + err.code + '; msg=' + err.message)

            throw err
        }

        raven.captureError(err)
    })
}

BitcoinOut.prototype.markItemDone = function(job) {
    debug('marking item done ' + job.request_id)
    return Q.ninvoke(that.client, 'query', {
        text: 'SELECT confirm_withdraw($1)',
        values: [job.request_id]
    })
}

BitcoinOut.prototype.send = function() {
    var that = this

    return this.getBatch().then(function(jobs) {
        return jobs.length ?
            that.executeBatch(jobs).then(function() {
                return Q.spread(jobs, that.markItemDone.bind(that))
            }) :
            null
    })
}
