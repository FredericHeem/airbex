/* global -router */
var _ = require('lodash')
, routes = []
, $window = $(window)
, debug = require('./debug')('snow:router')
, router = module.exports = function(expr, fn) {
    routes.push({ expr: expr, fn: fn })
    return router
}

router.add = router

router.now = router.reload = function() {
    var hash = window.location.hash.substr(1)
    debug('routing %s', hash)

    var found = _.some(routes, function(route) {
        var match = route.expr.exec(hash)
        if (!match) return
        debug('route matched %s %s', route.expr, hash)
        route.fn.apply(route, match.slice(1))
        return true
    })

    if (!found) {
        throw new Error('No route found for hash ' + hash)
    }
}

router.after = function(hash, replace) {
    hash || (hash = '')
    hash = hash.replace(/^\#/g, '')
    hash = hash.replace(/^(auth\/)?(login|register)/, '')
    return router.go(hash, replace)
}

router.go = function(hash, replace) {
    if (hash == window.location.hash.substr(1)) {
        router.reload()
        debug('reloading %s', hash)
        return
    }

    if (replace) location.replace('#' + hash)
    else location.hash = hash
}

$window.on('hashchange', router.now)
