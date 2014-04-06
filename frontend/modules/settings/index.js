module.exports = function(hash) {
    var controller = {
        $el: $(require('./index.html')({ hash: hash }))
    }

    return controller
}
