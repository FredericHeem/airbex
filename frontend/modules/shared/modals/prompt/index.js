var template = require('./index.html')
, _ = require('lodash')

module.exports = function(prompt, opts) {
    var deferred = $.Deferred()
    , $el = $('<div class=shared-modal-prompt>')
    .html(template(_.extend({
        title: '',
        prompt: prompt || i18n('shared.modals.prompt.prompt')
    }, opts)))
    , $modal = $el.find('.modal')

    function hide() {
        $modal.modal('hide')
        $el.remove()
    }

    $el.on('click', '[data-action="close"]', function(e) {
        e.preventDefault()
        hide()
        deferred.resolve(null)
    })

    $el.find('.modal').modal({
        keyboard: false,
        backdrop: 'static'
    })

    $el.on('submit', 'form', function(e) {
        e.preventDefault()

        var val = $el.find('[name="prompt"]').val()

        hide()

        deferred.resolve(val)
    })

    $el.appendTo('body')
    $el.field().focusSoon()

    return deferred.promise()
}
