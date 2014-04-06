var _ = require('lodash')

require('../vendor/shake')

$.fn.enabled = function(value) {
    if (typeof value != 'undefined') {
        if (value) $(this).removeAttr('disabled')
        else $(this).attr('disabled', 'disabled')

        return $(this)
        .toggleClass('disabled', !value)
    }
    return !this.prop('disabled')
}

$.fn.parseNumber = function() {
    return numbers.parse($(this).val())
}

$.fn.flash = function() {
    var $this = $(this).addClass('flash')
    setTimeout(function() {
        $this.removeClass('flash')
    }, 750)
}

$.fn.loading = function(value, html) {
    var $this = $(this)
    if (typeof value != 'undefined') {
        $this.enabled(!value)
        .toggleClass('is-loading', value)

        if (value && html) {
            $this
            .attr('not-loading-html', $this.html())
            .html(html)
        } else if (!value && html) {
            $this
            .html(html)
        } else if (!value && !html) {
            var restoreHtml = $this.attr('not-loading-html')
            if (typeof restoreHtml != 'undefined') {
                $this.html(restoreHtml)
            }
        }

        return $this
    }
    return $this.hasClass('is-loading')
}

$.fn.fadeAway = function(delay) {
    return $(this).fadeOut(delay || 500, function() { $(this).remove() })
}

$.fn.focusSoon = function() {
    var that = this
    setTimeout(function() {
        $(that)
        .add('input:visible:not([disabled]):first')
        .focus()
    }, 250)
}

$.fn.field = function(name, value) {
    var $fields = name ?
        $(this).find('[name="' + name + '"]') :
        $(this).find('input, select, textarea')


    if (value !== undefined) {
        $fields.each(function() {
            $(this).val(value)
        })
    }

    return $fields
}

$.fn.removeClasses = function(re) {
    $.each(this, function(i, el) {
        if (!el.className) return
        _.each(el.className.split(/\s+/), function(name) {
            if (!re.test(name)) return
            el.className = el.className.replace(name, '')
        }, this)
    })
    return this
}

$.fn.valOrNull = function(val) {
    if (val !== undefined) {
        return $(this).val(val || '')
    }
    return $(this).val().trim() || null
}

$.fn.validate = function(submitting) {
    var $this = $(this)
    , valid = true

    if (this[0].tagName == 'FORM') {
        var $groups = $this.find('.form-group')

        _.each($groups, function(x) {
            if (!$(x).validate(submitting)) {
                valid = false
            }
        })

        if (!valid && submitting) {
            $this.find('.has-error .form-control:first').focus()
            $this.find('button[type="submit"]').shake()
        }

        return valid
    }

    var check = this[0].check || function() {
        return !val.match(new RegExp($field.attr('data-regex')))
    }
    , $field = $this.field()

    var val = $field.val()
    , empty = val.length === 0

    if (empty) {
        valid = !submitting
    } else {
        valid = !!check(val, submitting)
        $this.toggleClass('is-invalid', valid)
    }

    $this.toggleClass('is-empty', empty)
    .toggleClass('has-error', !valid)

    return valid
}
