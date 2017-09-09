var validation = require('../../../helpers/validation')
, template = require('./index.html')

module.exports = function() {
    var $el = $(template())
    , controller = {
        $el: $el
    }
    , $form = $el.find('form')
    , $submit = $el.find('[type="submit"]')

    var validatePassword = validation.fromFn($el.find('.password'), function(d, val) {
        if (val.length < 6) return d.reject('is-too-short')
        return d.resolve(val)
    })

    var validateRepeat = validation.fromFn($el.find('.repeat'), function(d, val) {
        if (val != $el.field('password').val()) return d.reject('is-not-same')
        return d.resolve()
    })

    validation.monitorField($el.field('password'), validatePassword)
    validation.monitorField($el.field('repeat'), validateRepeat)

    var validate = validation.fromFields({
        password: validatePassword,
        repeat: validateRepeat
    })

    $el.on('submit', 'form', function(e) {
        e.preventDefault()

        $form.addClass('is-loading')
        $submit.loading(true)

        return validate(true)
        .then(function(values) {
            return api.changePassword(values.password)
 
            .then(function() {
                //alertify.log(i18n('settings.changepassword.password changed'))
                router.go('')
            })
            .fail(errors.alertFromXhr)
            .finally(function() {
                $form.removeClass('is-loading')
                $submit.loading(false)
            })
        })
        .always(function() {
            $form.removeClass('is-loading')
            $submit.loading(false)
        })
    })

    return controller
}
