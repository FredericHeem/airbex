/*global require*/
module.exports = function(config) {
    "use strict";
    var debug = require('debug')('testMarketMaker');
    var _ = require('underscore');
    var bigdecimal = require("bigdecimal");
    var async = require('async');
    var Bitstamp = require('bitstamp');
    var EventEmitter = require('events').EventEmitter;
    var util = require('util');
    var maxParallelOps = 128;
    debug("MarketMaker config:");
    debug(JSON.stringify(config, null, 4));
    var client = new(require('../client/index'))(config.target);
    var baseCurrency = config.market.substr(0, 3);
    var quoteCurrency = config.market.substr(3);
    
    var publicBitstamp = new Bitstamp();
    
    var MarketMaker = {};
    util.inherits(MarketMaker, EventEmitter);
    
    MarketMaker.getClient = function() {
        return client;
    }
    
    MarketMaker.mirrorOrderBook = function(done) {
        debug("mirrorOrderBook")
        async.waterfall([
            
        function(callback) {
            MarketMaker.getBalanceTarget(function(err, balances){
                callback(err, balances)
            });
        },
        
        function(balances, callback) {
            debug("mirrorOrderBook getting orderbook");
            publicBitstamp.order_book(true, function(err, orderBook) {
                callback(err, balances, orderBook);
            });
        },
        
        function(balances, orderBook, callback) {
            debug("mirrorOrderBook filter orderbooks");
            var bcBalance = client.getBalanceForCurrency(balances, baseCurrency);
            var qcBalance = client.getBalanceForCurrency(balances, quoteCurrency);
            var bcBalanceAvailable = Math.min(bcBalance.available, config.max_bc_on_offer);
            var qcBalanceAvailable = Math.min(qcBalance.available, config.max_qc_on_offer);
            debug("mirrorOrderBook bc: %s, qc: %s", bcBalance.available, qcBalance.available);
            var bids = MarketMaker.filterBids(orderBook.bids, qcBalanceAvailable);
            bids = MarketMaker.addFee(bids, config.feeBidRatio);
            var asks = MarketMaker.filterAsks(orderBook.asks, bcBalanceAvailable);
            asks = MarketMaker.addFee(asks, config.feeAskRatio);
            callback(null, bids, asks);
        },
        
        function(bids, asks, callback) {
            MarketMaker.cancelAllOrders(function(err){
                callback(err, bids, asks);
            });
        },

        function(bids, asks, callback) {
            MarketMaker.sendOrders(bids, asks, callback)
        }],

        function(err) {
            debug("mirrorOrderBook done")
            done(err);
        });
    }
    
    MarketMaker.getOrderBook = function(balanceBC, balanceQC, done) {
        publicBitstamp.order_book(true, function(err, orderBook) {
            if (err) {
                done(err);
            } else {
                var bids = MarketMaker.filterBids(orderBook.bids, balanceQC);
                bids = MarketMaker.addFee(bids, config.feeBidRatio);
                var asks = MarketMaker.filterAsks(orderBook.asks, balanceBC);
                asks = MarketMaker.addFee(asks, config.feeAskRatio);
                done(null, bids, asks);
            }
        });
    };
    
    MarketMaker.monitorBalance = function(currentBalanceTarget, done){
         MarketMaker.getBalanceTarget(function(err, balances){
            if (err) throw err;
            
            var bcBalanceNew = client.getBalanceForCurrency(balances, baseCurrency);
            var bcBalanceOld = client.getBalanceForCurrency(currentBalanceTarget, baseCurrency);
            
            if(!bcBalanceNew) throw new Error("cannot find balance for given currency: " + baseCurrency);
            debug("monitorBalance old %s, new %s", bcBalanceOld.balance, bcBalanceNew.balance);
            if(bcBalanceNew.balance < bcBalanceOld.balance){
                var bcToBuy = bcBalanceOld.balance - bcBalanceNew.balance;
                debug("monitorBalance bcToBuy: %s", bcToBuy);
            }else {
                debug("monitorBalance no bc to buy");
            }
            
            //var qcBalance = client.getBalanceForCurrency(balances, quoteCurrency);
            done(null, bcBalanceNew);
         });
    }
    MarketMaker.getBalanceTarget = function(done) {
        debug("getBalanceTarget")
        client.balances(function(err, balances) {
            if (err) throw err
            debug(JSON.stringify(balances, null, 4))
            done(null, balances)
        });
    }
    
    MarketMaker.cancelAllOrders = function(done) {
        debug("cancelAllOrders");
        client.cancelAll(function(err) {
            if (err) throw err
            debug("cancelAllOrders done")
            done()
        });
    }
   
   MarketMaker.loopGetOrderBookAndSendOrders = function() {
       var that = this
       MarketMaker.getBalanceTarget(function(err, balances) {
           if (err) throw err;
           var bcBalance = client.getBalanceForCurrency(balances, baseCurrency);
           var qcBalance = client.getBalanceForCurrency(balances, quoteCurrency);
           MarketMaker.getOrderBookAndSendOrders(bcBalance.available, qcBalance.available, function(err) {
               if (err) throw err;
               debug("loopGetOrderBookAndSendOrders recheduled");
               setTimeout(MarketMaker.loopGetOrderBookAndSendOrders, 15e3)
           })
       });
   }

    MarketMaker.getOrderBookAndSendOrders = function(balanceBC, balanceQC, done) {
        debug("getOrderBookAndSendOrders bc: %s, qc: %s", balanceBC, balanceQC);
        balanceBC = Math.min(balanceBC, config.max_bc_on_offer);
        balanceQC = Math.min(balanceQC, config.max_qc_on_offer);
        MarketMaker.getOrderBook(balanceBC, balanceQC, function(err, bids, asks) {
            if (err) throw err;
            MarketMaker.cancelAndSendOrders(bids, asks, function(err){
                done(err)
            })
        })
    }
    
    MarketMaker.cancelAndSendOrders = function(bids, asks, done) {
        debug("cancelAndSendOrders")
        async.series([

        function(callback) {
            MarketMaker.cancelAllOrders(callback);
        },

        function(callback) {
            MarketMaker.sendOrders(bids, asks, callback)
        }],

        function(err, results) {
            debug("cancelAndSendOrders done")
            done(err);
        });
    }
    
    MarketMaker.sendOrders = function(bids, asks, done) {
        debug("sancelAndSendOrders")

        async.parallel([

        function(callback) {
            MarketMaker.sendAsks(asks, callback);
        },

        function(callback) {
            MarketMaker.sendBids(bids, callback);
        }],

        function(err) {
            debug("sancelAndSendOrders done")
            done(err);
        });
    }
    
    MarketMaker.sendBids = function(bids, done) {
        debug("sendBids #bids %d", bids.length);
        async.forEachLimit(bids, maxParallelOps,

        function(bid, callback) {
            var price = bid[0]
            var amount = bid[1]
            debug("sendBids price: %d amount: %d", price, amount);
            client.order({
                market: config.market,
                type: "bid",
                price: price,
                amount: amount
            }, function(err, id) {
                if (err) throw err;
                debug('Order bid #%s placed', id);
                callback();
            });
        },

        function(err) {
            // err contains the first error or null
            if (err) throw err;
            console.log('All bids sent!');
            done();
        });
    };
    
    MarketMaker.sendAsks = function(asks, done) {
        debug("sendAsk #asks %d", asks.length);
        async.forEachLimit(asks, maxParallelOps,

        function(ask, callback) {
            var price = ask[0];
            var amount = ask[1];
            debug("sendAsk price: %d amount: %d", price, amount);
            client.order({
                market: config.market,
                type: "ask",
                price: price,
                amount: amount
            }, function(err, id) {
                if (err) throw err;
                debug('Order ask #%s placed', id);
                callback();
            });
        },
        function(err) {
            if (err) throw err;
            debug('All asks sent!');
            done();
        });
    };
    /* 
     * var bids = [["804.09", "1.84057743"], ["803.84", "0.08708200"]];
     * balance is in quote currency: e.g USD
     */
    MarketMaker.filterBids = function(bids, balance) {

        if (!bids || bids.length === 0) throw new Error("Invalid bids input");
        
        var bidsFiltered = [];
        
        try {
            var maxBidPrice = bids[0][0];
            var biMinVolume = new bigdecimal.BigDecimal("5"); // in fiat
            var biBalance = new bigdecimal.BigDecimal(balance.toString());
            if (biBalance.compareTo(biMinVolume) <= 0) {
                debug("filterBid Not enough funds available");
            }

            debug("filterBid #bids: %d, maxBidPrice %d, balance: %d", bids.length, maxBidPrice, balance);

            var biAvailableVolume = biBalance;

            for (var i = 0; i < bids.length; i++) {
                var quote = bids[i];
                var biPrice = new bigdecimal.BigDecimal(quote[0]);
                var biQuantity = new bigdecimal.BigDecimal(quote[1]);
                var biVolumeAtIndex = biPrice.multiply(biQuantity);
                if (biVolumeAtIndex.compareTo(biAvailableVolume) >= 0) {
                    //Whe can only take availableVolume, 
                    if (biAvailableVolume.compareTo(biMinVolume) >= 0) {
                        var biRemainingQty = biAvailableVolume.divide(biPrice, 8, new bigdecimal.RoundingMode.DOWN());
                        var quotePartial = [quote[0], biRemainingQty.toString()];
                        bidsFiltered.push(quotePartial);
                    }

                    break;
                    //Job done
                }
                else {
                    // Enough fiat to buy the while quote
                    biAvailableVolume = biAvailableVolume.subtract(biVolumeAtIndex);
                    //availableVolume = availableVolume - volumeAtIndex;
                    bidsFiltered.push(quote);
                }
            }
        }
        catch (e) {
            debug("filterBid ERROR %s", e);
            bidsFiltered = [];
        }
        debug("filterBid #bids after %d", bidsFiltered.length);
        return bidsFiltered;
    };
    

    /* 
     * var asks = [["1000", "1.84057743"], ["1050", "0.08708200"]];
     * balance is in base currency: e.g BTC
     */
    MarketMaker.filterAsks = function(asks, balance) {

        if (!asks || asks.length === 0) throw new Error("Invalid ask input");
        var asksFiltered = [];
         
        try {
            var minAskPrice = asks[0][0];
            var biMinVolume = new bigdecimal.BigDecimal("0.005"); // in BTC
            var biBalance = new bigdecimal.BigDecimal(balance.toString());
            if (biBalance.compareTo(biMinVolume) <= 0) {
                debug("filterAsk Not enough funds available");
            }

            debug("filterAsks #asks: %d, minAskPrice %d, balance: %d BTC", asks.length, minAskPrice, balance);

            var biAvailableVolume = biBalance;

            for (var i = 0; i < asks.length; i++) {
                var quote = asks[i];
                var biQuantity = new bigdecimal.BigDecimal(quote[1]);
                if (biQuantity.compareTo(biAvailableVolume) >= 0) {
                    //Whe can only take availableVolume, 
                    if (biAvailableVolume.compareTo(biMinVolume) >= 0) {
                        var quotePartial = [quote[0], biAvailableVolume.toString()];
                        asksFiltered.push(quotePartial);
                    }

                    break;
                    //Job done
                }
                else {
                    // Enough BTC to buy the while quote
                    biAvailableVolume = biAvailableVolume.subtract(biQuantity);
                    asksFiltered.push(quote);
                }
            }
        }
        catch (e) {
            debug("filterAsk ERROR %s", e);
            asksFiltered = [];
        }
        debug("filterAsk #asks after %d", asksFiltered.length);
        return asksFiltered;
    };
    
    MarketMaker.addFee = function(quotes, fee) {
        var bdFee = new bigdecimal.BigDecimal(fee);
        var quotesWithFee = _.map(quotes, function(quote){
            var bdPrice =  new bigdecimal.BigDecimal(quote[0]);
            return [bdPrice.multiply(bdFee).setScale(5, new bigdecimal.RoundingMode.DOWN()).toString(), quote[1]]
        });
        return quotesWithFee;
    }
    return MarketMaker;
};
