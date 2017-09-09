var debug = require('./debug')('emitter')

module.exports = function(flags) {
    var events = {}

    function callbacks(event) {
        debug("callbacks  event %s, #cb %s", event, events[event] ? events[event].toString(): "none");
        return events[event] || (events[event] = $.Callbacks(flags || 'unique memory'))
    }

    function on(event, handler) {
        debug("on ", event);
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
        debug("trigger ", event)
        var cb = callbacks(event);
        cb.fire.apply(null, Array.prototype.slice.call(arguments, 1))
    }

    return {
        on: on,
        off: off,
        once: once,
        trigger: trigger,
        emit: trigger
    }
}
