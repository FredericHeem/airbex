module.exports = function(flags) {
    var events = {}

    function callbacks(event) {
        return events[event] || (events[event] = $.Callbacks(flags || 'unique memory'))
    }

    function on(event, handler) {
        callbacks(event).add(handler)
    }

    function off(event, handler) {
        callbacks(event).remove(handler)
    }

    function once(event, handler) {
        var wrapped = function() {
            handler.apply(null, arguments)
            off(event, wrapped)
        }

        on(event, wrapped)
    }

    function trigger(event) {
        callbacks(event).fire.apply(null, Array.prototype.slice.call(arguments, 1))
    }

    return {
        on: on,
        off: off,
        once: once,
        trigger: trigger,
        emit: trigger
    }
}
