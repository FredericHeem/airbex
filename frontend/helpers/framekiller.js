var debug = require('./debug')('snow:framekiller')

module.exports = function() {
    try {
        if (top.location.host == location.host) return
    } catch (err) {
        debug('failed to detect: %s', err.message)
    }

    top.location = location
}
