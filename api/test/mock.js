module.exports = exports = function(target, name, fake) {
    var real = target[name]
    , wrapper = function() {
        wrapper.invokes++
        return fake.apply(this, arguments)
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
        var result = fake.apply(this, arguments)
        wrapper.restore()
        return result
    })
    return wrapper
}

exports.impersonate = function(app, uid, permissions) {
    return exports(app.auth, 'user', function(req, res, next) {
        req.user = uid
        req.apiKey = permissions || {}
        next()
    })
}
