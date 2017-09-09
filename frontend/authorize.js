var debug = require('./helpers/debug')('authorize')
, jcPrompt = require('./modules/shared/modals/prompt')

exports.user = function(level, register) {
    if (level === true) {
        level = 0
        register = true
    }

    return exports.demand(level || 0)
}

exports.password = function(prefix) {
    function popup(prefix) {
        return jcPrompt(prefix || i18n('PasswordPrompt'), 'password')
        .then(function(password) {
            if (!password) return null

            return password
        })
    }

    return popup(prefix)
}

exports.otp = function(prefix) {
    function popup(prefix) {
        return jcPrompt((prefix || '') + i18n('authorize.otp.prompt'))
        .then(function(otp) {
            if (!otp) return null

            if (!otp.match(/^[0-9]{6}$/)) {
                return popup(i18n('authorize.otp.invalid format'))
            }

            return otp
        })
    }

    return popup(prefix)
}

exports.demand = function(level, register) {
    var here = location.hash.substr(1)

    if (here.match(/^auth\//)) {
        here = ''
    }

    debug('requiring security level %d', level)

    if (!api.user) {
        debug('user is not logged in, redirecting to login')

        if (register) {
            if (here) {
                router.go('auth/register?after=' + here, true)
            } else {
                router.go('auth/register', true)
            }
        } else {
            if (here) {
                router.go('auth/login?after=' + here, true)
            } else {
                router.go('auth/login', true)
            }
        }

        return false
    }

    return exports.demandLevel(level, here)
}

exports.demandLevel = function(level, after) {
    debug('user has security level %d', api.user.securityLevel)

    if (api.user.securityLevel >= level) {
        debug('user security level is sufficient')
        return true
    }

    if (api.user.securityLevel < 2) {
        debug('suggesting to verify phone to reach level 2')
        router.go('auth/verifyphone?after=' + after, true)
    } else if (api.user.securityLevel < 3) {
        debug('suggesting to enter full name and address to reach level 3')
        router.go('settings/profile?after=' + after, true)
    } else if (api.user.securityLevel < 4) {
        debug('user country is %s', api.user.country)

        if (api.user.country == 'NO') {
            debug('suggesting to make verify via norwegian deposit')
            router.go('auth/norwaydeposit', true)
        } else {
            debug('suggesting to go through CIP')
            router.go('settings/identity', true)
        }
    }
}
