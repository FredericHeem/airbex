module.exports = function(options) {
    options = (options || {})
    options.min = typeof options.min == 'undefined' ? 1000 : options.min
    options.max = typeof options.max == 'undefined' ? 2500 : options.max

    return function(cb) {
        var delay = options.min + Math.floor(Math.random() * (options.max - options.min))
        return setTimeout(cb, delay)
    }
}
