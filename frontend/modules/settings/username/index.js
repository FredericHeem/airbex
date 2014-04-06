var nav = require('../nav')
, validation = require('../../../helpers/validation')
, template = require('./index.html')

module.exports = function() {
    var $el = $('<div class=settings-username>').html(template({
        username: api.user.username || ''
    }))
    , ctrl = {
        $el: $el
    }
    , $form = $el.find('form')
    , $submit = $el.find('[type="submit"]')

    // Navigation
    $el.find('.settings-nav').replaceWith(nav('username').$el)

    var validateUsername = function() {
        var val = $form.field('username').val()
        if (val.length === 0) return null
        if (!/^[a-z0-9](?:[\._]?[a-z0-9]){2,25}$/i.exec(val)) {
            return $.Deferred().reject('is-invalid')
        }
        return val
    }

    validation.monitorField($el.field('username'), validateUsername)

    var validate = validation.fromFields({
        username: validateUsername
    })

    $el.on('submit', 'form', function(e) {
        e.preventDefault()

        $form.addClass('is-loading')
        $submit.loading(true)

        return validate(true)
        .then(function(values) {
            return api.call('v1/users/current', {
                username: values.username
            },  { type: 'PATCH' })
            .done(function() {
                api.user.username = values.username
                alertify.log(i18n('settings.username.saved'))
                router.reload()
            }).fail(errors.alertFromXhr)
        })
        .always(function() {
            $form.removeClass('is-loading')
            $submit.loading(false)
        })
    })

    return ctrl
}
