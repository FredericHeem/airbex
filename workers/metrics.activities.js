var debug = require('debug')('snow:metrics:activities')
, analytics = require('analytics-node')
, async = require('async')
, Client = require('pg').Client
, EventEmitter = require('events').EventEmitter
, util = require('util')
, _ = require('lodash')
, request = require('request')
, exports = module.exports = function(opts) {
    var that = this
    _.bindAll(this)
    this.opts = opts
    this.root = opts.firebaseRoot
    this.conn = new Client(opts.postgresUrl)

    analytics.init({ secret: opts.segmentSecret })

    debug('authenticating with firebase...')

    debug('connecting to postgres...')

    that.conn.connect(function(err) {
        if (err) return that.emit('error', err)
        debug('connected to postgres')
        that.startLoop()
    })
}

request.debug = require('debug')('request').enabled

util.inherits(exports, EventEmitter)

exports.prototype.startLoop = function() {
    var that = this
    async.forever(function(cb) {
        that.tick(function(err) {
            if (err) return that.emit('error', err)
            setTimeout(cb, 60e3)
        })
    })
}

exports.prototype.tick = function(cb) {
    var that = this
    , headRef = this.root.child('last_activity_id')

    // Find current position (last activity id)
    headRef.once('value', function(snapshot) {
        debug('last activity id: %j', snapshot.val() || 'none')
        that.fetchActivitiesAfter(snapshot.val() || 0, function(err, activities) {
            if (err) return cb(err)
            debug('found %s new activities', activities.length)
            if (!activities.length) return cb()
            async.eachSeries(activities, function(activity, cb) {
                that.processActivity(activity, function(err) {
                    if (err) return cb(err)
                    headRef.set(activity.activity_id)
                    cb()
                })
            }, cb)
        })
    })
}

exports.prototype.processActivityCreated = function(activity, cb) {
    cb(null, {
        event: 'Signed up'
    })
}

exports.prototype['processActivityIdentity set'] = function(activity, cb) {
    cb(null, {
        event: 'Set name and address'
    })
}

exports.prototype['processActivityIdentitySet'] = function(activity, cb) {
    cb(null, {
        event: 'Set name and address'
    })
}

exports.prototype['processActivityKycCompleted'] = function(activity, cb) {
    cb(null, {
        event: 'Completed KYC'
    })
}

exports.prototype['processActivityBankCredit'] = function(activity, cb) {
    cb(null, {
        event: 'Bank credited'
    })
}

exports.prototype['processActivityEnableTwoFactor'] = function(activity, cb) {
    cb(null, {
        event: 'Enable two factor'
    })
}

exports.prototype['processActivityCredit'] = function(activity, cb) {
    if (!~['NOK', 'EUR', 'USD'].indexOf(activity.details.NOK)) {
        return cb()
    }

    cb(null, {
        event: 'Bank credited'
    })
}

exports.prototype.processActivity = function(activity, cb) {
    var that = this

    console.log(activity)

    var handler = this['processActivity' + activity.type]

    if (!handler) {
        throw new Error('Handler not found for ' + activity.type)
    }

    if (activity.details) {
        activity.details = JSON.parse(activity.details)
    }

    var createdAt = new Date(activity.created_at)

    handler(activity, function(err, data) {
        if (err) return cb(err)
        if (!data) return cb()

        if (new Date() - createdAt > 5 * 60 * 1000) {
            data.timestamp = createdAt
        }

        data.userId = activity.user_id.toString()

        console.log(data)

        analytics.track(data)
        .on('error', function(err) {
            that.emit('error', err)
        })

        cb()
    })
}

exports.prototype.fetchActivitiesAfter = function(id, cb) {
    debug('fetching transactions after #%s', id)
    this.conn.query({
        text: [
            'SELECT *',
            'FROM activity',
            'WHERE activity_id > $1 AND',
            'type NOT IN (\'ChangePassword\', \'CreateOrder\', \'CancelOrder\', \'BTCWithdraw\', \'LTCWithdraw\', \'RippleWithdraw\', \'AdminWithdrawCancel\', \'CancelWithdrawRequest\', \'AdminBankAccountCredit\', \'SendToUser\', \'AdminEditUser\', \'AdminWithdrawProcess\', \'AdminWithdrawComplete\', \'CreateVoucher\', \'WithdrawComplete\', \'AdminVerifyBankAccount\', \'VerifyBankAccount\', \'FillOrder\', \'ReceiveFromUser\', \'RemoveTwoFactor\', \'AdminAddBankCredit\', \'AdminApproveBankCredit\', \'AdminCancelBankCredit\', \'ReceiveFomUser\')',
            'ORDER BY activity_id',
            'LIMIT 100'
        ].join('\n'),
        values: [id]
    }, function(err, dr) {
        cb(err, err ? null : dr.rows)
    })
}
