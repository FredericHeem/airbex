var config = require('../config')
, bitcoin = new (require('bitcoin').Client)(config('BTC'))
, debug = require('debug')('snow:btc-edge:sender')
, db = require('./db')
, num = require('num')
, util = require('util')
, Q = require('q')

, client

function getBatch() {
    debug('getting batch')
    var query = ['SELECT * FROM pop_btc_withdraw_requests() AS',
            '(request_id int, amount bigint, scale int, address varchar(34));'].join('\n')
    return Q.ninvoke(client, 'query', query).get('rows')
}

function executeBatch(jobs) {
    var r = _.reduce(jobs, function(r, i) { r[i.address] = +num(i.amount, i.scale); return r; }, { })
    debug('will send ' + jobs.length + ' transactions')
    debug('sends to perform: ' + JSON.stringify(r, null, 4))
    return Q.ninvoke(bitcoin, 'sendMany', 'credited', r)
}

function markItemDone(job) {
    debug('marking item done ' + job.request_id)
    return Q.ninvoke(client, 'query', {
        text: 'SELECT confirm_withdraw($1)',
        values: [job.request_id]
    })
}

function markBatchDone(jobs) {
    debug('marking ' + jobs.length + ' jobs done')
    var ids = _.pluck(jobs, 'request_id')
    , d = Q.defer()

    client.query({
        text: ['UPDATE withdraw_request SET state = "completed", completed = current_timestamp',
        'WHERE request_id IN (' + ids.join(', ') + ')'].join('\n')
    }, d.makeNodeCallback())
}

function send() {
    client = db()

    return getBatch().then(function(jobs) {
        return jobs.length ?
            executeBatch(jobs).then(function() {
                return Q.spread(jobs, markItemDone)
            }) :
            'success'

    })
    .fin(function() {
        client.end()
    })
    .fail(function(err) {
        console.error(err)
        console.error(err.stack)
    })
}

module.exports = function() {
    var timer
    , loop = function() {
        send().then(function() {
            debug('scheduling next loop')
            timer = setTimeout(loop, 10 * 1000)
        })
    }

    loop()

    process.on('exit', function() {
        timer && clearTimeout(timer)
    })
}