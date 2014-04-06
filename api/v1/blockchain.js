var debug = require('debug')('snow:blockchain')
var request = require('supertest');
var http = require('http');

module.exports = exports = function(app) {
    app.get('/v1/blockchain/:currency/address/:address', exports.address)
}

exports.address = function(req, res, next) {
    //var url = "http:/blockchain.info";
    var address = req.params.address;
    var currency = req.params.currency;
    debug("address: %s, currency: %s", address, currency);
    
    var options = {
            host: currency + '.blockr.io',
            path: '/api/v1/address/balance/' + address
    };

    http.request(options, function(response){
        console.log('STATUS: ' + response.statusCode);
        if(response.statusCode != 200){
            debug(JSON.stringify(response.body));
            return res.send(400, {"error" : "InvalidResponse", "message": ""})  
        } 
        var payload = '';
        response.on('data', function (chunk) {
            payload += chunk;
        });
        response.on('error', function (chunk) {
            debug("error getting response");
        });
        response.on('end', function () {
            if (payload) {
                debug("bc returns ", JSON.stringify(payload))
                return res.send(JSON.parse(payload))
            } else {
                debug("error getting address")
                return res.send(401, {"error" : "InvalidResponse", "message": "cannot get a valid response"})
            }
        });
    }).end();
//    http.request(options, function(response){
//        console.log('STATUS: ' + response.statusCode);
//        if(response.statusCode != 200){
//            debug(JSON.stringify(response.body));
//            return res.send(400, {"error" : "InvalidResponse", "message": ""})  
//        } 
//        var payload = '';
//        response.on('data', function (chunk) {
//            payload += chunk;
//        });
//        response.on('error', function (chunk) {
//            debug("error getting response");
//        });
//        response.on('end', function () {
//            if (payload) {
//                debug("bc returns ", JSON.stringify(payload))
//                return res.send(JSON.parse(payload))
//            } else {
//                debug("error getting address")
//                return res.send(401, {"error" : "InvalidResponse", "message": "cannot get a valid response"})
//            }
//        });
//    }).end();
  
}

