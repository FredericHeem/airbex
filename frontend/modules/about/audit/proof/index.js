if (typeof Uint8ClampedArray == "undefined") {
            Uint8ClampedArray = Uint8Array;
}
 var template = require('./index.html')
, baproof = require('../../../../vendor/baproof/build/aproof.js')
, blproof = require('../../../../vendor/lproof/build/lproof.js')
, async = require('../../../../vendor/async/lib/async.js')
, debug = require('debug')('proof')
, _ = require('lodash')
, num = require('num')

var Tree = lproof.Tree;

isTestnet = function(){
	return (window.environment === 'prod' ? false: true)
}
get_blockchain_baseurl = function(currency, testnet){
    var name = numbers.getCurrencyOption(currency).name.toLowerCase();
    return "/explorer/" + name + "/";
}

get_blockchain_block_date = function(currency, blockhash, cb){
    var url = get_blockchain_baseurl(currency, isTestnet()) + "api/block/" + blockhash
    $.ajax({
        type: 'GET',
        url: url,
        success: function(response) {
            console.log("response: ", JSON.stringify(response))
            var block_date = response.time * 1000;
            cb(null, block_date)
        },
        error: function(error){
            return cb(null, 0);
            cb({type:"warning", name: "BlockInfoUnavailable"})
        }
    });
}

get_blockchain_web_block_url = function(currency, blockhash){
    return get_blockchain_baseurl(currency, isTestnet()) + "block/" + blockhash
}

get_blockchain_web_balance_url = function(currency, address){
    return get_blockchain_baseurl(currency, isTestnet()) + "address/" + address
}

get_balance_all = function(aproof, addresses, currency, cb){
    aproof.total = num(0);
    aproof.totalHot = num(0);
    $(".audit-message").text("Getting balance")
    function onBlockchainBalance(balanceMap) {
        _.each(balanceMap, function(balance, address){
            console.log("%s has %s", address, balance);
            var td = $("#" + address + "-balance")
            td.text(balance)
        })

    }
    
    api.on('blockchainBalance', onBlockchainBalance)
    var balancesMap = {};
    var urlParam = "";
    _.each(addresses, function(address, index){
        balancesMap[address] = 0;
        urlParam += address;
        if(index < addresses.length - 1){
            urlParam += ","
        }
    })
    
    var url = get_blockchain_baseurl(currency, isTestnet()) + "api/addrs/" + urlParam + "/utxo";
    $.ajax({
        type: 'GET',
        url: url,
        success: function(response) {
            //console.log("balances: " +  JSON.stringify(response));
            
            _.each(response, function(item){
                var address = item.address;
                var balance = item.amount;
                var nBalance = "NaN";
                try {
                    nBalance = num(balance)
                    
                    var balancePartial = balancesMap[address] || 0;
                    balancesMap[address] = num(balancePartial).add(nBalance);
                    aproof.total = aproof.total.add(nBalance);
                    console.log("total is now " + aproof.total.toString())
                    if(aproof.addressMap[address].wallet === 'hot'){
                        aproof.totalHot = aproof.totalHot.add(nBalance);
                    }
                } catch(e){
                    console.error("Invalid balance: ", e.toString())
                    return done({type:"warning", name: "BalanceUnavailable"})
                }
            })
            api.trigger('blockchainBalance', balancesMap)
            
            cb();
        },
        error: function(error){
            console.error("balances error: ", error)
            cb({type:"warning", name: "BalanceUnavailable"})
        }
    });
}

liabilities_render = function($el, request, cb){
    console.log("liabilities_render")
    $("#lproof-auditing").hide()
    $("#lproof-verified").removeClass("hidden")
    
    if(!request.root.raw){
    	return cb({type:"error", name: "RootInfoUnavailable"})
    }
 
    if(!request.lproof.raw){
    	return cb({type:"error", name: "LiabilityInfoUnavailable"})
    }
    
    var error = proof_verify_liabilities(request)
    if(error) return cb(error)
    
    var lproof = request.lproof;

    if (lproof && lproof.verify) {
        var data = lproof.verify;
        var currency = lproof.root.currency;
        $('#user').html(data.user);
        var date = new Date();
        var timestamp = request.root.raw.timestamp;
        date.setTime(timestamp);
        $('#date').html(moment(date.toString()).fromNow());
        $('#value').html(numbers.formatVolume(data.sum, request.currency));
        $('#root_hash').html(lproof.root.hash);
        $('#root_value').html(numbers.formatVolume(lproof.root.sum, request.currency));
        cb();
    } else {
        cb({type:"error", name:"Liability"})
    }
    console.log("liabilities_render done")
}

assets_get_blockchain_data = function(aproof, cb){
    console.log("assets_get_blockchain_data")
    var currency = aproof.raw.currency;
    async.series(
    		[
    		 function (cb) {
    			 get_blockchain_block_date(currency, aproof.raw.blockhash, function(err, block_date){
    				 if(err) return cb(err)
    				 $('#blockhash').html(moment(block_date).fromNow());
    				 cb();
    			 })
    		 },
    		 function (cb) {
    			 var addresses = baproof.getAddresses(aproof.raw);
    			 console.log("assets_get_blockchain_data #addr " + addresses.length)
    			 get_balance_all(aproof, addresses, currency, function(err){
    				 if(err) return cb(err)
    				 $('#balance').html(numbers.formatVolume(aproof.total.toString(), currency));
    				 $('#balance-cold').html(numbers.formatVolume(aproof.total.sub(aproof.totalHot).toString(), currency));
    				 $('#balance-hot').html(numbers.formatVolume(aproof.totalHot.toString(), currency));
    				 cb()
    			 })
    		 }

    		 ]
    		,
    		function (err) {
    			console.log("assets_get_blockchain_data done")
    			cb(err)
    		});    
}

assets_render = function($el, request, cb){
    console.log("assets_render")
    
    if (!request.aproof.raw) {
    	return cb({type:"error", name: "NoAssetFound"});
    }
    
    if (!request.aproof.raw.signatures) {
    	return cb({type:"error", name: "NoSignaturesFound"});
    }
    
    $("#aproof-verified").removeClass("hidden")

    var aproof = request.aproof;
    var currency = aproof.raw.currency;
    var blockhash = aproof.raw.blockhash
    var message = aproof.raw.message
    var itemTemplate = require('./item.html')
    
    aproof.raw.testnet = isTestnet();
    aproof.addressMap = {};
    $.map(aproof.raw.signatures, function(item) {
    	aproof.addressMap[item.address] = {}
    	aproof.addressMap[item.address].signature = item.signature;
    	aproof.addressMap[item.address].wallet = item.wallet;
    })
    
    var $items = $el.find('#signature-table tbody')
    $items.html($.map(aproof.raw.signatures, function(item) {
    	var $item = $('<tr class="signature">').html(itemTemplate(item))
    	var get_address_url = get_blockchain_web_balance_url(currency, item.address)
    	$item.find("#" + item.address).attr('href', get_address_url);
    	return $item
    }))
    
    console.log("assets_render for ", currency);
    
    $('#site').html(message);
    var blockhash_url = get_blockchain_web_block_url(currency, blockhash)
    $('#blockhash').attr('href', blockhash_url);
    
    async.series(
    		[
    		 function (cb) {
    			 assets_get_blockchain_data(aproof, cb);
    		 },
    		 function (cb) {
    			 proof_verify_signatures(aproof.raw, cb);
    		 }
    		 ],
    		 function (err) {
    			$("#aproof-auditing").hide()
    			cb(err);
    		});
}

solvency_render = function($el, result, error){
	console.log("solvency_render")
    $(".alert").addClass("hidden")
    
    if(error){
        var i18_message = i18n(error.name);
        $(".audit-message").text(i18_message)
        if(error.type === "warning"){
            $("#audit-warning").removeClass("hidden")
        } else {
            $("#audit-error").removeClass("hidden")
        }
        return;
    }
    
    if (result.aproof && result.lproof) {
        var delta = result.aproof.total.sub(num(result.lproof.root.sum));
        result.delta = delta;

        if (result.delta !== null) {
        	$(".alert").addClass("hidden")
        	var currency = result.aproof.raw.currency;
        	var delta = result.delta;
        	if (delta.gte(0)) {
        		var deltaBTC = numbers.formatVolume(delta.toString(), currency)
        		$("#audit-info").removeClass("hidden")
        		$(".audit-message").text(i18n('SolventMessage', deltaBTC))
        	}
        	else {
        		var deltaBTC = numbers.formatVolume(num(result.lproof.root.sum).sub(result.aproof.total).toString(), currency)
                $("#audit-error").removeClass("hidden")
                $(".audit-message").text(i18n('InsolventMessage', deltaBTC))
        	}
        }
    }
}

proof_verify_liabilities = function(request){
	console.log("proof_verify_liabilities")
    if (!request.lproof) return false;
    var lproof = request.lproof;
    var root = request.root;
    var ptree = new Tree();
    var partialTree = ptree.fromObjectGraph(lproof.raw.partial_tree);
    lproof.ptree = partialTree;
    lproof.root = root.raw.root;
    try {
        lproof.verify = blproof.verifyTree(partialTree, lproof.root);
    } catch(e){
        console.log("liability error: " + e)
        return {type:"error", name:"LiabilityErrorVerifying", message:e}
    }
}

proof_verify_signatures = function(aproof, cb){
    debug("proof_verify_signatures");
    function onSignature(signatureObj) {
    	var message = "Signature for address " + signatureObj.address;
    	$(".audit-message").text(message)
    	var ua = navigator.userAgent.toLowerCase()
    	
        var td = $("#" + signatureObj.address + "-balance")
        if(signatureObj.isValid){
            td.parent().addClass('success') 
        } else {
            //td.parent().addClass('danger')
        }
    }

    api.on('signature', onSignature)
    
	async.eachSeries(aproof.signatures, function(item, done){
    	setTimeout(function(){
    		var isValid = baproof.verifySignature(aproof, item.address, item.signature);
    		
			api.trigger('signature', {address:item.address, signature: item.signature, isValid: isValid})
    		
    		if(isValid){
    			console.log('Signature for address %s is valid', item.address);
    		} else {
    			console.log('INVALID Signature for address %s, sig %s', item.address, item.signature);
    		}
    		done()
    	},20);
    }, function(err){
    	cb();
    })	
}

proof_render = function($el, request, done){
	console.log("proof_render")

	async.series(
			[
			 function (cb) {
				 liabilities_render($el, request, cb);
			 },
			 function (cb) {
				 assets_render($el, request, cb);
			 }
			 ],
			 function (err) {
				solvency_render($el, request, err)
			});
}

module.exports = function(currency) {
    var $el = $(template({currency: currency}))
    , controller = {
        $el: $el
    }

    console.log('audit ', currency);

    var root_proof_url = "/api/v1/proof/root/" + currency;
    var lproof_url= "/api/v1/proof/liability/" + currency;
    var aproof_url = "/api/v1/proof/asset/" + currency;

    var results = {
            currency:currency,
            root:{},
            lproof:{},
            aproof:{}};

    async.parallel(
            [
             function (cb) {
                 if (!root_proof_url) return cb();
                 $.get(root_proof_url, function (data) {
                     results.root.raw = data;
                     cb();
                 });
             },
             function (cb) {
                 if (!lproof_url) return cb();
                 $.get(lproof_url, function (data) {
                     results.lproof.raw = data;
                     cb();
                 });
             },
             function (cb) {
                 if (!aproof_url) return cb();
                 $.get(aproof_url, function (data) {
                     results.aproof.raw = data;
                     cb();
                 });
             }
             ], 
             function (err) {
                if (err) return console.error(err);
                proof_render($el, results)
            });
    return controller
}