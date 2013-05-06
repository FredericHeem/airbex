module.exports = function(hash) {
    var controller = {
        $el: $(require('./template.html')({ hash: hash }))
    }

    return controller
}
