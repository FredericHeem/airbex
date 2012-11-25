var Snow = require('snow-client')
, Bitfloor = require('bitfloor')
, Margin = require('../lib/margin')
, debug = require('debug')('snow:trader')
, Mtgox = require('mtgox')
, _ = require('underscore')
, Fx = require('../lib/fx')
, config = require('../config');

var snowFx = new Snow(config('snow-fx'));

snowFx.init(function(err) {
    if (err) return console.error('init failed', err);

    var gox = new Mtgox(config('mtgox'))

    var fxBtcNokUsd = new Fx(gox, 'BTC', 'NOK', 'USD');
    var marginBtcNokUsd = new Margin('BTCNOK', fxBtcNokUsd, snowFx);

/*    var fxBtcNokGbp = new Fx(snowFx, 'BTC', 'NOK', 'GBP');
    var marginBtcNokGbp = new Margin('BTCNOK', fxBtcNokGbp, snowFx);*/
});