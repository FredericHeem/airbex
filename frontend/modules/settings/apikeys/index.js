var template = require('./index.html')
, nav = require('../nav')

module.exports = function() {
    var $el = $('<div class=account-apikeys>').html(template())
    , controller = {
        $el: $el
    }

    function refresh() {
        api.call('v1/keys')
        .fail(errors.alertFromXhr)
        .done(renderKeys)
    }

    function renderKeys(keys) {
        var $keys = $el.find('.keys')
        , itemTemplate = require('./item.html')
        , $items = $.map(keys, function(key) {
            return $(itemTemplate(key))
        })

        $keys.html($items)
    }

    // Show/hide add
    $el.on('click', '.show-add, .hide-add', function(e) {
        e.preventDefault()
        $el.toggleClass('is-showing-add')
    })

    var $addForm = $el.on('.add-form')
    , $addButton = $addForm.find('.add-button')

    $addForm.on('submit', '.add-form', function(e) {
        e.preventDefault()
        $addButton.loading(true, 'Adding...')

        api.call('v1/keys', {
            canTrade: $addForm.field('canTrade').prop('checked'),
            canDeposit: $addForm.field('canDeposit').prop('checked'),
            canWithdraw: $addForm.field('canWithdraw').prop('checked')
        }, { type: 'POST' })
        .always(function() {
            $addButton.loading(false)
        })
        .fail(errors.alertFromXhr)
        .done(function() {
            $el.toggleClass('is-showing-add')
            $addForm.field('canTrade')
            .add($addForm.field('canDeposit'))
            .add($addForm.field('canWithdraw'))
            .prop('checked', false)

            refresh()
        })
    })

    // Remove API key
    $el.on('click', '.key .remove', function(e) {
        e.preventDefault()

        var $remove = $(this).loading(true, 'Deleting...')
        , $key = $(this).closest('.key')
        , id = $key.attr('data-id')

        api.call('v1/keys/' + id, null, { type: 'DELETE' })
        .always(function() {
            $remove.loading(false)
        })
        .fail(errors.alertFromXhr)
        .done(function() {
            $key.fadeAway()
        })
    })

    refresh()

    $el.find('.account-nav').replaceWith(nav('apikeys').$el)

    return controller
}
