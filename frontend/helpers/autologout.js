var debug = require('./debug')('snow:autologout')

module.exports = exports = function() {
    var timer, started

    function restartTimer() {
        if (!api.user) return
        timer && clearTimeout(timer)
        var duration = (api.user.twoFactor ? 60 : 15) * 60e3
        if (started) {
            debug('restarting autologout timer. had %ss left',
                Math.round((duration - (new Date() - started)) / 1e3))
        }
        started = +new Date()
        timer = setTimeout(function() {
            if (!api.user) return
            debug('logging out from inactivity')
            api.logout().done(router.now)
        }, duration)
    }

    $(window).on('hashchange', restartTimer)
    api.on('user', restartTimer)
}
