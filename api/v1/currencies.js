var log = require('../log')(__filename)
, debug = log.debug;

module.exports = exports = function(app) {
    exports.app = app;
    app.get('/v1/currencies', exports.index);
    app.socketio.router.on("/v1/currencies", exports.currenciesWs);
}

exports.currenciesWs = function(client, eventName, data, next) {
    var callbackId = exports.app.socketio.callbackId(data);
    currenciesGet(exports.app, function(err, response){
        if(err) return next(err);
        client.emit('/v1/currencies', {callbackId: callbackId, data:response})
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
                conf_time: row.fiat == false ? row.conf_time : undefined,
                min_conf: row.fiat == false ? row.min_conf : undefined,
                address_regex: row.fiat == false ? row.address_regex : undefined
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
