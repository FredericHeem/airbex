var master = require('./modules/master')
, notfound = require('./modules/notfound')
, authorize = require('./authorize')

module.exports = function() {
	
    router.add(/^$/, function() {
        if (api.user) {
            router.go('account', true)
            return
        }

        require('./authorize').user()
    })
    
    if(window.config.purchase_order){
        require('./modules/buysell/routes.js')(router, master, authorize)
    }
    
    require('./modules/account/routes.js')(router, master, authorize)
    require('./modules/wallet/routes.js')(router, master, authorize)
    require('./modules/home/routes.js')(router, master, authorize)
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