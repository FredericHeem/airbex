var template = require('./index.html')
, itemTemplate = require('./item.html')
, _ = require('lodash')
, num = require('num')

module.exports = function() {
    var $el = $('<div class=credits>').html(template())
    , ctrl = {
        $el: $el
    }
    , $items = $el.find('.items')

    // Approve
    $items.on('click', '.item [data-action="approve"]', function(e) {
        e.preventDefault()
        var $tr = $(this).closest('tr')
        , id = $tr.attr('data-id')

        api.call('admin/bankCredits/' + id + '/approve', null, { type: 'POST' })
        .fail(errors.alertFromXhr)
        .done(function() {
            $tr.fadeAway()
            router.now()
        })
    })

    // Cancel
    $items.on('click', '.item [data-action="cancel"]', function(e) {
        e.preventDefault()
        var $tr = $(this).closest('tr')
        , id = $tr.attr('data-id')

        api.call('admin/bankCredits/' + id + '/cancel', null, { type: 'POST' })
        .fail(errors.alertFromXhr)
        .done(function() {
            $tr.fadeAway()
            router.now()
        })
    })

    // Refresh
    api.call('admin/bankCredits')
    .done(function(items) {
        // Append items
        $items.append(_.map(items, function(item) {
            var $item = $('<tr class=item>').html(itemTemplate(item))
            .attr('data-id', item.id)

            return $item
        }))

        // Append summary
        function summarize(rows) {
            return {
                currency: rows[0].currency,
                count: rows.length,
                sum: _.reduce(rows, function(p, c) {
                    return num(c.amount).add(p).toString()
                }, 0)
            }
        }

        var grouped = _.groupBy(items, 'currency')
        , summaries = _.map(grouped, summarize)

        var $summaries = $.map(summaries, function(item) {
            return _.template('<li><strong><%= currency %>:</strong> <%= sum %> (<%= count %> credits)</li>')(item)
        })

        var $lines = $('<ul>')
        $lines.append($summaries)
        $lines.append('<li><strong>Total: ' + items.length + ' credits</strong></li>')
        $el.find('.summary').html($lines)
    })

    return ctrl
}
