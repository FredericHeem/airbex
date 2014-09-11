var log = require('../log')(__filename)
, debug = log.debug;

module.exports = exports = function(app) {
    exports.app = app;
    app.get('/v1/currencies', exports.index);
    app.socketio.router.on("currencies", exports.currenciesWs);
}

exports.currenciesWs = function(client, eventName, data, next) {
    var callbackId = exports.app.socketio.callbackId(data);
    currenciesGet(exports.app, function(err, response){
        if(err) return next(err);
        client.emit('currencies', {callbackId: callbackId, data:response})
    })

}
var currenciesGet = function(app, cb){
    var query = [
                 'SELECT *',
                 'FROM currency',
                 'ORDER BY currency_id'
                 ].join('\n');

    app.conn.read.get().query(query, function(err, dr) {
        if (err) return cb(err)
        return cb(null, dr.rows.map(function(row) {
            return {
                id: row.currency_id,
                fiat: row.fiat,
                scale: row.scale,
                scale_display: row.scale_display,
                name: row.name,
                withdraw_min: app.cache.formatCurrency(row.withdraw_min, row.currency_id),
                withdraw_max: app.cache.formatCurrency(row.withdraw_max, row.currency_id),
                withdraw_fee: app.cache.formatCurrency(row.withdraw_fee, row.currency_id),
                conf_time: row.conf_time,
                min_conf: row.min_conf,
                address_regex: row.address_regex
            }
        }))
    })
}

exports.index = function(req, res, next) {
    currenciesGet(req.app, function(err, response){
        if(err) return next(err);
        res.send(response);
    })
}
