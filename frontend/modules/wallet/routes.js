var format = require('util').format

module.exports = function(router, master, authorize) {
    return router
    .add(/^wallet\/([A-Z]{3,4})$/, function(currency) {
        if (!authorize.user()) return
        router.go(format('wallet/%s/%s', currency, 'receive'), true)
    })
    .add(/^wallet\/([A-Z]{3,4})\/(send|receive|history)$/, function(currency, action) {

        if(api.isFiat(currency)){
            if (!authorize.user(3)) return
            api.setDefaultFiat(currency);
        } else {
            if (!authorize.user()) return
            api.setDefaultCrypto(currency);
        }

        master(require('./index.js')(currency, action), 'wallet')
    })    
}
