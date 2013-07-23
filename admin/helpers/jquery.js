var _ = require('lodash')

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
        $(that).focus()
    }, 500)
}

$.fn.field = function(name, value) {
    var $fields = $(this).find('[name="' + name + '"]')

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
