module.exports = function(app) {
    require('./users').configure(app)
    require('./accounts').configure(app)
    require('./books').configure(app)
    require('./securities').configure(app)
    require('./orders').configure(app)
    require('./rippleout').configure(app)

    var config = require('../../config')
    var bitcoinEdge = new (require('./bitcoinedge'))({ endpoint: config('BTC'), securityId: 'BTC' })
    bitcoinEdge.configure(app)
}
