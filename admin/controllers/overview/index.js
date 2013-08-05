var template = require('./template.html')
, recentUserTemplate = require('./recent-user.html')

module.exports = function() {
    var $el = $('<div class="overview">').html(template())
    , controller = {
        $el: $el
    }

    function refreshBtcHeight() {
        api.call('admin/btc/height')
        .fail(errors.alertFromXhr)
        .done(function(res) {
            $el.find('.btc-height').html(res.height)
        })
    }

    function refreshLtcHeight() {
        api.call('admin/ltc/height')
        .fail(errors.alertFromXhr)
        .done(function(res) {
            $el.find('.ltc-height').html(res.height)
        })
    }

    function refreshRecentUsers() {
        var recentCookie = $.cookie('recent-users')
        , recent = recentCookie ? JSON.parse(recentCookie) : []
        , $recent = $el.find('.recent-users')

        $recent
        .toggleClass('is-empty', !recent.length)
        .find('tbody')
        .html($.map(recent, function(user) {
            return recentUserTemplate(user)
        }))
    }

    refreshBtcHeight()
    refreshLtcHeight()
    refreshRecentUsers()

    return controller
}
