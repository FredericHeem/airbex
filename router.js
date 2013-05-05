module.exports = function() {
    var routes = []
    , $window = $(window)

    $window.on('ready hashchange', function() {
        var hash = window.location.hash.substr(1)

        routes.some(function(route) {
            var match = route.expr.exec(hash)
            if (!match) return
            route.fn.apply(route, match.slice(1))
            return true
        })
    })

    var add = function(expr, fn) {
        routes.push({ expr: expr, fn: fn })
        return add
    }

    return add.add = add
}
