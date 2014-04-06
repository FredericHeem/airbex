var template = require('./index.html')
, nav = require('../../nav')
, baproof = require('../../../../vendor/baproof/build/baproof.js')
, blproof = require('../../../../vendor/lproof/build/lproof.js')
, async = require('../../../../vendor/async/lib/async.js')
, debug = require('debug')('snow:proof')

var Tree = lproof.Tree;

liabilities_render = function($el, result){
    debug("liabilities_render")
    if (result.lproof && result.lproof.verify) {
        var lproof = result.lproof;
        var data = lproof.verify;

        $('#user').html(data.user);
        $('#value').html(numbers.formatAmount(data.sum));
        $('#root_hash').html(lproof.root.hash);
        $('#root_value').html(numbers.formatAmount(lproof.root.sum));
    } else {
        
    }
}

assets_render = function($el, result){
    debug("assets_render")
    if(!result.aproof){
        return;
    }
    if (result.aproof && result.aproof.balance != undefined) {
        var aproof = result.aproof;
        $('#site').html(aproof.raw.id);
        $('#balance').html(aproof.balance);
    } else {
        $('#aproof-ko').removeClass("hidden")
        $('#aproof-error').html(result.aproof.error);
    }
}

solvency_render = function($el, result){
    debug("solvency_render")
    if (result.aproof && result.lproof) {
        var delta = result.aproof.balance - result.lproof.root.sum;
        result.delta = delta;
    }

    if (result.delta !== null) {
        var delta = result.delta;
        if (delta >= 0) {
            var deltaBTC = numbers.formatAmount(delta)
            $('#solvent').removeClass("hidden")
            $('#solvent .amount').html(deltaBTC);
        }
        else {
            $('#insolvent').removeClass("hidden")
            var deltaBTC = numbers.formatAmount( - delta)
            $('#insolvent .amount').html(deltaBTC);
        }
    }
}

proof_render = function($el, error, result){
    debug("proof_render")
    $("#auditing").hide()

    if(error){
        var i18_message = i18n(error.name);
        $(".audit-message").text(i18_message)
        if(error.type === "warning"){
            $("#audit-warning").removeClass("hidden")
        } else {
            $("#audit-error").removeClass("hidden")
        }
    } else {
        
        $("#audited").removeClass("hidden")
        liabilities_render($el, result)
        assets_render($el, result)
        solvency_render($el, result)
    }

}

proof_verify_liabilities = function(request, result, cb){
    if (!request.lproof) return cb();
    var lproof = {};
    result.lproof = lproof;

    lproof.raw = request.lproof;
    var root = request.root;
    var ptree = new Tree();
    var partialTree = ptree.fromObjectGraph(request.lproof.partial_tree);
    lproof.ptree = partialTree;
    lproof.root = root.root;
    try{
      lproof.verify = blproof.verifyTree(partialTree, root.root);
      console.log("Verified: ", lproof.verify);
      cb();
    } catch(e){
        console.log("liability error: " + e)
        cb({type:"error", name: e})
    }
}

//Verify signature and check for address balances
proof_verify_assets = function(request, result, cb){
    if (!request.aproof) return cb();
    var aproof = {};
    result.aproof = aproof;
    console.log(JSON.stringify(request.aproof))
    aproof.raw = request.aproof;

    if (baproof.verifySignatures(request.aproof)) {
        debug('Signatures are valid!');
    } else {
        console.error('INVALID signature found!');
        cb({type:"error", name: "SignatureInvalid"})
    }
    
    var addresses = baproof.getAddresses(aproof.raw);
    var total = 0;
    console.log("proof_verify_assets for ", request.currency);
    
    async.eachLimit(addresses, 5, function (addr, cb) {
        api.call('v1/blockchain/' + request.currency + '/address/' + addr)
        .then(function(response) {
            debug('address %s, balance: %s',response.address, response.final_balance)
            total += response.data.balance;
            cb();
        })

    }, function (err) {
        if(err){
            console.error("BalanceUnavailable");
            cb({type:"warning", name: "BalanceUnavailable"})
        } else {
            debug("balance ", total);
            aproof.balance = total;
        }
        cb()
    });
}

proof_verify = function($el, request, done){
    debug("proof_verify")
    var result = {};

    // Save results in result
    async.parallel(
            [
             function (cb) {
                 proof_verify_liabilities(request, result, cb);
             },
             function (cb) {
                 proof_verify_assets(request, result, cb);
             }
             ]
            ,
            function (err) {
                debug("proof_verify done")
                done(err, result)
            });
}

module.exports = function(currency) {
    var $el = $(template())
    , controller = {
        $el: $el
    }

    $el.find('.about-nav').replaceWith(nav('audit').$el)

    console.log('audit ', currency);
    var root_proof_url = "/api/v1/proof/root/" + currency;
    var lproof_url= "/api/v1/proof/liability/" + currency;
    var aproof_url = "/" + currency + "-assets.json";

    var xhr = new XMLHttpRequest();

    var results = {currency:currency};
    

    async.parallel([
                    function (cb) {
                        if (!root_proof_url) return cb();
                        $.get(root_proof_url, function (data) {
                            results.root = data;
                            cb();
                        });
                    },
                    function (cb) {
                        if (!lproof_url) return cb();
                        $.get(lproof_url, function (data) {
                            results.lproof = data;
                            cb();
                        });
                    },
                    function (cb) {
                        if (!aproof_url) return cb();
                        $.get(aproof_url, function (data) {
                            results.aproof = data;
                            cb();
                        });
                    }
                    ], function (err) {
        if (err) return console.error(err);
        //console.log("got results")
        proof_verify($el, results, function(error, result){
            //console.log("processed results")
            proof_render($el, error, result);
        })
    });
    return controller
}