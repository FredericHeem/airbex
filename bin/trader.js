var Snow = require('snow-client')
, Bitfloor = require('bitfloor')
, Margin = require('../lib/margin')
, debug = require('debug')('snow:trader')
, Mtgox = require('mtgox')
, _ = require('underscore')
, Fx = require('../lib/fx')
, config = require('../config');

var snowMtgox = new Snow(config('snow-mtgox'));

snowMtgox.init(function(err) {
    if (err) return console.error('init failed', err);
    var mtgox = new Mtgox(config('mtgox'));

    var marginUsd = new Margin('BTCUSD', mtgox, snowMtgox);
    var marginGbp = new Margin('BTCGBP', mtgox, snowMtgox);
});

var snowBitfloor = new Snow(config('snow-bitfloor'));

snowBitfloor.init(function(err) {
    if (err) return console.error('init failed', err);
    var bitfloor = new Bitfloor(config('bitfloor'));

    var margin = new Margin('BTCUSD', bitfloor, snowBitfloor);
});

var snowFx = new Snow(config('snow-fx'));

snowFx.init(function(err) {
    if (err) return console.error('init failed', err);

    var fxBtcNokUsd = new Fx(snowFx, 'BTC', 'NOK', 'USD');
    var marginBtcNokUsd = new Margin('BTCNOK', fxBtcNokUsd, snowFx);

    var fxBtcNokGbp = new Fx(snowFx, 'BTC', 'NOK', 'GBP');
    var marginBtcNokGbp = new Margin('BTCNOK', fxBtcNokGbp, snowFx);
});
