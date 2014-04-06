var _ = require('lodash')
, debug = require('./debug')('notify')
, activity = require('./activity')

module.exports = function() {
    var $el = $('<div class="notifications bottom-right">')
    , module = {
        $el: $el
    }
    , timer
    , since

    module.show = function(html, duration) {
        duration || (duration = 30e3)

        var n = {
            fadeOut: { enabled: true, delay: duration },
            message: { html: html }
        }
        , notify = $('.bottom-right').notify(n)
        notify.show()
        return notify
    }

    api.on('activities', function(items) {
        var highestItem = _.sortBy(items, 'id').pop
        , highestId = highestItem ? highestItem.id : null

        if (since === undefined && highestId) {
            since = highestId
            debug('initial since = %s', since)
        } else {
            if (highestId && highestId > since) {
                _.each(items, function(item) {
                    module.show(activity(item))
                })
            }

            timer && clearTimeout(timer)
        }

        setTimeout(function() {
            api.activities(since)
        }, 30e3)
    })

    return module
}