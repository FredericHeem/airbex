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
        .then(documentChanged)
        .fail(errors.alertFromXhr)
    }

    refresh()
    
    var $fileupload_passport = $el.find("#fileupload");
    
    var url = '/api/v1/users/documents';
 
    $fileupload_passport.fileupload({
        url: url,
        dataType: 'json',
        autoUpload: true,
        acceptFileTypes: /(\.|\/)(gif|jpe?g|png|pdf)$/i,
        maxFileSize: 5000000
    }).on('fileuploadadd', function (e, data) {

    }).on('fileuploadprocessalways', function (e, data) {
        var index = data.index,
        file = data.files[index];
        if (file.error) {
            alertify.alert("Cannot upload file \"" + file.name + "\": " + file.error)
        }
    }).on('fileuploadprogressall', function (e, data) {
        var progress = parseInt(data.loaded / data.total * 100, 10);
        $('#progress .progress-bar').css(
                'width',
                progress + '%'
        );
    }).on('fileuploaddone', function (e, data) {
        refresh();
    }).on('fileuploadfail', function (e, data) {
        $.each(data.files, function (index) {
            var error = $('<span class="text-danger"/>').text('File upload failed.');
            $(data.context.children()[index])
            .append('<br>')
            .append(error);
        });
    }).prop('disabled', !$.support.fileInput)
    .parent().addClass($.support.fileInput ? undefined : 'disabled');


    return controller;
};