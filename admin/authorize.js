exports.admin = function(register) {
    if (api.user && api.user.admin) return true

    var after = window.location.hash.substr(1)

    // Avoid looping after-inception
    after = after.replace(/(register|login)(\?after=)?/, '')

    router.go((register ? 'register' : 'login') + (after ? '?after=' + after : ''))
}
