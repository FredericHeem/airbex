var template = require('./index.html')
, _ = require('lodash')

module.exports = function(prompt, opts) {
    var deferred = $.Deferred()
    , $el = $('<div class=shared-modal-prompt>')
    .html(template(_.extend({
        title: '',
        prompt: prompt || i18n('shared.modals.confirm.prompt')
    }, opts)))
    , $modal = $el.find('.modal')

    function hide() {
        $modal.modal('hide')
        $el.remove()
    }

    $el.on('click', '[data-action="close"]', function(e) {
        e.preventDefault()
        hide()
    })

    $el.find('.modal').modal({
    })
    .on('hidden.bs.modal', function() {
        if (deferred.state() == 'pending') {
            deferred.reject()
        }
        $el.remove()
    })

    $el.on('submit', 'form', function(e) {
        e.preventDefault()
        deferred.resolve()
        hide()
    })

    $el.appendTo('body')

    $el.find('[type="submit"]').focus()

    return deferred.promise()
}
