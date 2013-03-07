//var Snow = require('snow')
//, Bitfloor = require('bitfloor')
var Margin = require('../lib/margin')
, debug = require('debug')('snow:trader')
, MtGox = require('mtgox')
, _ = require('underscore')
, Fx = require('../lib/fx')
, Combiner = require('../lib/combiner')
, config = require('../config')

var gox = new MtGox(config('mtgox'))
//var snow = new Snow(config('snow'))
//var bitfloor = new Bitfloor(config('bitfloor'))

var Wave = require('rwave')
var wave = new Wave(config('ripple'))

// combine BTC USD
var combiner = new Combiner([
    {
        pair: {
            base: { currency: 'BTC' },
            quote: { currency: 'USD' }
        },
        client: gox
    }/*,
    {
        // BTC USD bitfloor
        pair: {
            base: { currency: 'BTC' },
            quote: { currency: 'USD' }
        },
        client: bitfloor
    },
    {
        // BTC NOK (virtual via USD)
        pair: {
            base: { currency: 'BTC' },
            quote: { currency: 'NOK' }
        },
        client: new Fx(gox, 'BTC', 'NOK', 'USD')
    },
    {
        // snowcoin BTC XRP
        pair: {
            base: { currency: 'BTC' },
            quote: { currency: 'XRP' }
        },
        client: snow
    }*/
])

var traders = [
    // combiner --> bitstamp btc to bitstamp usd
    new Margin({
        base: { currency: 'BTC', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B' },
        quote: { currency: 'USD', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B' }
    }, combiner, wave, {
        volume: 0.1,
        margin: 0.01
    }),

    // combiner --> bitstamp btc to wix btc
    new Margin({
        base: { currency: 'BTC', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B' },
        quote: { currency: 'BTC', issuer: 'r9vbV3EHvXWjSkeQ6CAcYVPGeq7TuiXY2X' }
    }, null, wave, {
        volume: 0.1,
        margin: 0.01
    }),

    // combiner --> bitstamp btc to weex usd
    new Margin({
        base: { currency: 'BTC', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B' },
        quote: { currency: 'USD', issuer: 'r9vbV3EHvXWjSkeQ6CAcYVPGeq7TuiXY2X' }
    }, combiner, wave, {
        volume: 0.1,
        margin: 0.01
    })
]
