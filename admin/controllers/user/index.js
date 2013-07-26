var header = require('./header')
, template = require('./template.html')
, model = require('../../util/model')
, _ = require('lodash')
, moment = require('moment')
, format = require('util').format

module.exports = function(userId) {
    var $el = $('<div class="admin-user-profile">').html(template({
        userId: userId
    }))
    , controller = {
        $el: $el
    }
    , oldUser
    , $save = $el.find('*[data-action="toggle-editing"]')

    // User id is always known
    $el.find('.userId td span').html(userId)

    // Header
    $el.find('.header-placeholder').replaceWith(header(userId, 'user').$el)

    // Link to intercom.io
    $el.find('.intercom-link')
    .attr('href', format('https://www.intercom.io/apps/%s/users/show?user_id=%s',
        '64463fba8faa8166444bfb3c00a5e40976bd622e', userId))

    function renderProfile(u) {
        // Straight forward strings
        var plains = {
            'email': 'email',
            'firstName': 'first_name',
            'lastName': 'last_name',
            'phone': 'phone_number',
            'country': 'country',
            'city': 'city',
            'postalArea': 'postal_area',
            'address': 'address',
            'tag': 'tag'
        }

        _.each(plains, function(v, k) {
            var $row = $el.find('.' + k)
            $row.find('span').html((u[v] || '').toString().replace(/\n/g, '<br />')),
            $row.find('.field').val(u[v] || '')
        })

        $el.find('.created span').html(moment(u.created_at).format('Do MMMM YYYY'))
        $el.find('.suspended span').html(u.suspended ? 'Yes' : 'No')
        $el.find('.suspended .field').prop('checked', u.suspended)

        $el.find('.bitcoin-address a')
        .attr('href', 'https://blockchain.info/address/' + u.bitcoin_address)
        .html(u.bitcoin_address)

        $el.find('.litecoin-address a')
        .attr('href', 'http://explorer.litecoin.net/address/' + u.litecoin_address)
        .html(u.litecoin_address)

        if (u.suspended) {
            $el.find('.suspended').addClass('warning')
        }

        $el.toggleClass('has-verified-email', !!u.email_verified_at)

        oldUser = u
    }

    function fetchProfile() {
        $el.addClass('is-loading')

        api.call('admin/users/' + userId)
        .always(function() {
            $el.removeClass('is-loading')
        })
        .fail(errors.alertFromXhr)
        .done(function(user) {
            renderProfile(user)
            addToRecentUsers(user)
        })
    }

    function addToRecentUsers(user) {
        var recentCookie = $.cookie('recent-users')
        , recent = recentCookie ? JSON.parse(recentCookie) : []
        , duplicate = _.find(recent, { user_id: user.user_id })

        if (duplicate) {
            recent.splice(recent.indexOf(duplicate), 1)
        }

        recent.unshift(user)

        while (recent.length > 10) {
            recent.pop()
        }

        $.cookie('recent-users', JSON.stringify(recent), { expires: 10 * 356 * 7 })
    }

    // Begin ewdit
    $save.on('click', function(e) {
        e.preventDefault()
        $el.toggleClass('is-editing')
    })

    // Cancel edit
    function cancelEdit() {
        fetchProfile()
        $el.removeClass('is-editing')
    }

    $el.on('click', '*[data-action="cancel"]', function(e) {
        e.preventDefault()
        cancelEdit()
    })

    // Save
    $el.on('submit', '.edit-form', function(e) {
        var patch = model.patch(oldUser, {
            email: $el.find('.email .field').valOrNull(),
            first_name: $el.find('.firstName .field').valOrNull(),
            last_name: $el.find('.lastName .field').valOrNull(),
            country: $el.find('.country .field').valOrNull(),
            city: $el.find('.city .field').valOrNull(),
            postal_area: $el.find('.postalArea .field').valOrNull(),
            address: $el.find('.address .field').valOrNull(),
            phone_number: $el.find('.phone .field').valOrNull(),
            suspended: $el.find('.suspended .field').prop('checked')
        })

        if (!_.keys(patch).length) {
            cancelEdit()
            return
        }

        e.preventDefault()
        $el.addClass('is-loading is-saving')
        $el.find('.field').enabled(false)

        api.call('admin/users/' + userId, patch, { type: 'PATCH' })
        .always(function() {
            $el.removeClass('is-loading is-saving')
            $save.loading(false)
            $el.find('.field').enabled(true)
        })
        .fail(errors.alertFromXhr)
        .done(function() {
            cancelEdit()
        })
    })

    $el.on('click', '*[data-action="send-email-verification"]', function(e) {
        e.preventDefault()

        var url = 'admin/users/' + userId + '/sendVerificationEmail'
        api.call(url, null, { type: 'POST' })
        .fail(errors.alertFromXhr)
        .done(function() {
            fetchProfile()
        })
    })

    fetchProfile()

    return controller
}
