module.exports = exports = function(target, name, fake) {
    var real = target[name]
    target[name] = fake

    fake.restore = function() {
        target[name] = real;
        delete fake.restore
    }

    return fake
}

exports.impersonate = function(app, uid, permissions) {
    return exports(app.auth, 'any', function(req, res, next) {
        req.user = uid
        req.apiKey = permissions || {}
        next()
    })
}
