var nav = require("../nav");
var d = require("util");
var _ = require("lodash");
var template = require("./index.html");
var itemTemplate = require("./item.html");

module.exports = function(b) {
    var $el = $("<div class=settings-identity>").html(template());
    var controller = {
        $el: $el
    };
    
    var $items = controller.$el.find('.documents tbody')

    function documentChanged(items) {
        $items.html($.map(items, function(item) {
            var $item = $('<tr class=document>').html(itemTemplate(item))
            var $status = $item.find("#status")
            if(item.status == "Pending"){
                $status.addClass("label-warning")
            } else if(item.status == "Accepted"){
                $status.addClass("label-success")
            } else {
                $status.addClass("label-danger")
            }

            return $item
        }))
    }

    function refresh() {
        api.call('v1/users/documents')
        .fail(errors.alertFromXhr)
        .done(documentChanged)
    }

    refresh()
    
    //var j = $el.find("form");
    //var k = $el.find('[type="submit"]');
    var $fileupload_passport = $el.find("#fileupload");
    $el.find(".settings-nav").replaceWith(nav("identity").$el);
    
    var url = 'api/v1/users/documents';
    $fileupload_passport.fileupload({
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
 
    //var t = !(api.user.poi || api.user.poa);

    return controller;
};