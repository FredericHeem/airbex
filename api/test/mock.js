var _ = require('lodash')
, assert = require('assert')
, debug = require('debug')('snow:test')

module.exports = exports = function(target, name, fake) {
    assert(target, 'target is null')
    var real = target[name]
    , wrapper = function() {
        wrapper.invokes++
        return fake ? fake.apply(this, arguments) : null
    }

    wrapper.real = real
    wrapper.invokes = 0
    wrapper.restore = function() {
        target[name] = real;
        delete wrapper.restore;
        delete wrapper.real
    }

    target[name] = wrapper
    return wrapper
}

exports.once = function(target, name, fake) {
    var wrapper = exports(target, name, function() {
        var result = fake ? fake.apply(this, arguments) : null
        wrapper.restore()
        return result
    })
    return wrapper
}

exports.impersonate = function(app, user, session, apikey) {
    if (typeof user == 'number') {
        user = { id: user }
    }

    if (session) {
        _.each(['primary', 'level', 'canWithdraw', 'canDeposit', 'admin', 'canTrade'], function(n) {
            assert(session[n] === undefined, 'legacy ' + n + ' not removed')
        })
    }

    _.defaults(user, {
        securityLevel: 0
    })

    if (!session && !apikey) {
        session = {
            id: 'sessionid',
            expires: +new Date() + 15 * 60e3,
            userId: user.id
        }
    }

    var extendSessionMock
    , mock = exports(app.security.demand, 'demand', function(type, level, req) {
        req.user = user
        req.session = session
        req.apikey = apikey

        debug('impersonating as user %j with %s', req.user, req.session ?
            'session' : req.apikey ? 'api key' : 'nothing')

        if (session) {
            extendSessionMock = exports(app.security.session, 'extend', function(id, cb) {
                cb()
            })
        }

        return mock.real.apply(this, arguments)
    })
    , restore = mock.restore

    mock.restore = function() {
        extendSessionMock && extendSessionMock.restore()
        restore()
    }

    return mock
}

exports.rows = function(rows) {
    rows || (rows = [])

    if (!_.isArray(rows)) {
        return exports.rows([rows])
    }

    return {
        rowCount: rows.length,
        rows: rows
    }
}
