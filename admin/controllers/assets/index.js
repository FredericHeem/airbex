var template = require('./index.html')
var num = require('num')

module.exports = function(userId) {
    var itemTemplate = require('./item.html')
    , $el = $('<div class=admin-assets>').html(template())
    , controller = {
        $el: $el
    }
    
    var $items = controller.$el.find('.asset-table tbody')
    
    function itemsChanged(items) {
        $items.html($.map(items, function(item) {
            var $item = $('<tr class=asset>').html(itemTemplate(item))
            return $item
        }))
    }

    function refresh() {
        //$form.addClass('is-loading')

        api.call('v1/proof/asset/')
        .fail(errors.alertFromXhr)
        .always(function() {
            //$form.removeClass('is-loading')
        })
        .done(itemsChanged.bind(this))
    }

    var $fileupload = $el.find("#fileupload");
    
    var url = '/api/v1/proof/asset/';
    $fileupload.fileupload({
        url: url,
        dataType: 'json',
        done: function (e, data) {
            console.log("fileupload done");
            refresh();
        },
        progressall: function (e, data) {
            console.log("fileupload progressall")
            var progress = parseInt(data.loaded / data.total * 100, 10);
            $('#progress .progress-bar').css(
                    'width',
                    progress + '%'
            );
        }
    }).prop('disabled', !$.support.fileInput)
    .parent().addClass($.support.fileInput ? undefined : 'disabled');
    
    $el.find('.nav a[href="#assets"]').parent().addClass('active')

    refresh();
    
    return controller
}


