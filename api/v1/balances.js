var log = require('../log')(__filename)
, debug = log.debug

module.exports = exports = function(app) {
    exports.app = app
    app.get('/v1/balances', app.security.demand.any, exports.balancesRest)
    app.socketio.sockets.on('connection', exports.balancesWs);
}

exports.balancesWs = function(client) {
    debug("balancesWs");
    
    client.on('balances', function(request){
        //debug('balances');
        var user = client.user;
        if(!user){
            log.error("NotAuthenticated");
            client.emit('balances', {error:"NotAuthenticated"})
            return 
        }
        balanceGet(exports.app, user, function(err, balances){
            if(err) {
                return client.emit('balances', {error: err})
            } else {
                //log.debug('balances', balances);
                client.emit('balances', {data:balances})
            }
        })
    });
}

exports.balancesRest = function(req, res, next) {
    balanceGet(req.app, req.user, function(err, balances){
        if(err) return next(err);
        res.send(balances)
    })
}

var balanceGet  = function(app, user, cb) {
    app.conn.read.query({
        text: [
            'SELECT currency_id, SUM(available) available, SUM("hold") "hold", SUM(balance) balance',
            'FROM account_view',
            'WHERE user_id = $1',
            'GROUP BY user_id, currency_id'
        ].join('\n'),
        values: [user.id]
    }, function(err, dr) {
        if (err) return next(err)
        return cb(null, dr.rows.map(function(row) {
            return {
                currency: row.currency_id,
                balance: app.cache.formatCurrency(row.balance, row.currency_id),
                hold: app.cache.formatCurrency(row.hold, row.currency_id),
                available: app.cache.formatCurrency(row.available, row.currency_id)
            }
        }))
        
    })
}
