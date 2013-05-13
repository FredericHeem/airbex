module.exports = {
    configure: function(app, conn) {
        var auth = require('./auth')(conn)

        ;['balances']
        .forEach(function(name) {
            require('./' + name).configure(app, conn, auth)
        })
    }
}
