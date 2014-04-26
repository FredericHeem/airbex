#!/usr/bin/env node

var config = require('../lib/config.js')();
var async = require('async')
var SolvencyProof = require('../solvency.proof.js')
var currencies = ["BTC", "LGS", "LTC", "DOGE"];
var solvencyProof = new SolvencyProof(config)

async.waterfall(
        [
         function(callback) {
             solvencyProof.dbConnect(callback)
         },
         function(callback) {
             solvencyProof.createAndSaveRootForEach(currencies, callback);
         }
         ],
         function(err) {
            if(err) {
                console.log("ERROR ", err)
                process.exit(code=-1)
            } else {
                console.log("done ok")
                process.exit(code=0)
            }
        }
);

async.forever(function(cb) {
    setTimeout(cb, 10e3)
}, function(err) {
    console.error('%s processing has failed. this should never happen.', prefix)
    console.error('%s', prefix, err)
    console.error('%s', prefix, err.stack)
})