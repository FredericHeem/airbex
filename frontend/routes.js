var master = require('./modules/master')
, notfound = require('./modules/notfound')
, authorize = require('./authorize')

module.exports = function() {
    require('./modules/home/routes.js')(router, master, authorize)
    require('./modules/account/routes.js')(router, master, authorize)
    require('./modules/deposit/routes.js')(router, master, authorize)
    require('./modules/withdraw/routes.js')(router, master, authorize)
    require('./modules/trade/routes.js')(router, master, authorize)
    require('./modules/about/routes.js')(router, master, authorize)
    require('./modules/auth/routes.js')(router, master, authorize)
    require('./modules/settings/routes.js')(router, master, authorize)

    router
    .add(/^(.+)$/, function(hash) {
        master(notfound(hash))
    })
}