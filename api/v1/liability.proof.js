var async = require('async')
, log = require('../log')(__filename)
, debug = log.debug
, lproof = require('lproof')
, fs = require('fs')
, format = require('util').format
, formidable = require("formidable");

module.exports = exports = function(app) {
    app.get('/v1/proof/root/:currency', exports.root)
    app.get('/v1/proof/liability/:currency', app.security.demand.any, exports.liability)
    app.get('/v1/proof/asset/:currency', exports.assetGet)
    app.post('/v1/proof/asset/', app.security.demand.admin, exports.assetPost)
    app.get('/v1/proof/asset/', exports.assetGetAll)
}

function getId(config, currency){
    var name = config.company | "Airbex";
    return name + " " + currency + " liabilities";
}

function getCompleteTreeFromDb(currency, app, next, cb){
    debug("getCompleteTreeFromDb: ", currency);
    
    var query = {
            text: [
                   'SELECT tree, created_at',
                   'FROM "liability"',
                   'WHERE currency=$1',
                   'ORDER BY created_at desc limit 1'
                   ].join('\n'),
                   values: [currency.toUpperCase()]
    }
    
    app.conn.read.get().query(query, function(err, dr) {
        if (err) {
            log.error("getCompleteTreeFromDb db error ", err);
            next(err)
        } else if(dr.rowCount > 0){
            var completeTreeJson = dr.rows[0].tree;
            var create_at = dr.rows[0].created_at
            //debug("tree ", completeTreeJson);
            var Tree = lproof.Tree;
            var completeTree = Tree.deserializeFromArray(JSON.stringify(completeTreeJson))
            cb(null, completeTree, create_at);
        } else {
            log.error("root: no tree found")
            cb({error:"NoCompleteTreeFound"})
        }
       
    })    
}

exports.root = function(req, res, next) {
	var currency = req.params.currency;
	debug("root: ", currency);
	getCompleteTreeFromDb(currency, req.app, next, function(err, completeTree, create_at){
		if(err){
			res.send(400, {error:err})
		} else {
			var date = new Date(create_at);
			
			var root = {
				root: completeTree.root().data,
				currency: currency,
				timestamp: date.getTime()
			};

			res.send(root);
		}
	})
}

exports.liability = function(req, res, next) {
    var email = req.user.email;
    var currency = req.params.currency;
    var id = getId(req.app.config, currency);
    debug("liability, id: %s, email %s, currency %s", id, email, currency);
    getCompleteTreeFromDb(currency, req.app, next, function(err, completeTree){
        if(err){
            res.send(400, {error:err})
        } else {
            try {
                var partialTree = lproof.extractPartialTree(completeTree, email);
                //console.log("partial_tree:", partialTree.serialize());
                var response = {"id":id, "partial_tree": JSON.parse(partialTree.serialize())}
                //Double check
                var root = completeTree.root()
                //console.log("Root: ", root.data);
                //console.log("verified: ", lproof.verifyTree(partialTree, root.data));
                res.send(response);
            } catch(e){
                console.log("", e)
                res.send(400, {error:e})
            }
        }
    })
}

function insertSignature(app, asset_id, address, signature, cb){
	//debug("%s => %s", address, signature)
	app.conn.write.get().query({
		text: [
		       'INSERT INTO signatures(asset_id, address, signature)',
		       "SELECT $1, $2, $3",
		       'WHERE',
		       '    NOT EXISTS (',
		       '        SELECT address FROM signatures WHERE address = $2 AND asset_id = $1',
		       '    );'
		       ].join('\n'),
		       values: [asset_id, address, signature]
	}, function(err, dr) {
		if (err) return cb(err)
		cb()
	})
}

function insertSignatures(app, asset_id, signatures, cb){
	//debug("insertSignatures id %s, signature:", asset_id, JSON.stringify(signatures))
	async.each(signatures, function (addressSignature, done) {
    	//debug("insertSignatures  ", JSON.stringify(addressSignature))
    	insertSignature(app, asset_id, addressSignature.address, addressSignature.signature, done)
    }, cb);
}

function getSignatures(app, asset_id, cb){
	debug("getSignatures id: %s", asset_id);
	var query = {
			text: [
			       'SELECT address, signature, wallet',
			       'FROM "signatures"',
			       'WHERE asset_id=$1'
			       ].join('\n'),
			       values: [asset_id]

	}
	
	app.conn.read.get().query(query, function(err, dr) {
		if(err) cb(err);
		var signatures = [];
        dr.rows.map(function(row) {
        	//debug("getSignatures: %s => %s", row.address, row.signature)
        	signatures.push({
        		address: row.address,
        		signature: row.signature,
        		wallet: row.wallet || undefined
        	})
        })
		cb(null, signatures);
	})
}

exports.assetGet = function(req, res, next) {
	var currency = req.params.currency;
	debug("assetGet: ", currency);
    var query = {
            text: [
                   'SELECT asset_id, blockhash, message',
                   'FROM "asset"',
                   'WHERE currency=$1',
                   'ORDER BY created_at desc limit 1'
                   ].join('\n'),
                   values: [currency.toUpperCase()]
    }
    
    req.app.conn.read.get().query(query, function(err, dr) {
    	var asset_json = {}
        if (err) {
            log.error("asset db error ", err);
            next(err)
        } else if(dr.rowCount > 0){
        	var row = dr.rows[0];
        	
        	getSignatures(req.app, row.asset_id, function(err, signatures){
        		if(err) next(err);
                asset_json = {
                		currency: currency,
                		message: row.message,
                		blockhash: row.blockhash, 
                		signatures: signatures}
                //debug("asset: ", JSON.stringify(asset_json));
            	res.send(asset_json)
        	})
        } else {
        	res.send({})
        } 
    	
    })    	
}

exports.assetGetAll = function(req, res, next) {
	debug("assetAll: ");
    var query = {
            text: [
                   'SELECT asset_id, currency, blockhash, message, created_at',
                   'FROM "asset"'
                   ].join('\n')
    }
    
    req.app.conn.read.get().query(query, function(err, dr) {
        if (err) {
            log.error("asset db error ", err);
            next(err)
        } else {
        	res.send(dr.rows)
        }
    })    	
}

function saveAsset(file, req, res, next){
    fs.readFile(file.path, "utf8", function (err, data) {
        if (err) throw err;
        fs.unlink(file.path);
        debug('assetPost length %s',data.length)
        var assetJson = JSON.parse(data)
        req.app.conn.write.get().query({
            text: [
                   'INSERT INTO asset(currency, blockhash, message)',
                   'VALUES($1, $2, $3) RETURNING asset_id;'
                   ].join('\n'),
                   values: [assetJson.currency, assetJson.blockhash, assetJson.message]
        }, function(err, dr) {
            if (err) return next(err)
            var asset_id = dr.rows[0].asset_id;
            console.log(JSON.stringify(dr))

            insertSignatures(req.app,asset_id, assetJson.signatures, function(err){
                if (err) return next(err)
                res.send({result : format('\nuploaded %s'
                        , file.name)});
            })
        })
    });
}
exports.assetPost = function(req, res, next) {
    debug("assetPost ");
    var form = new formidable.IncomingForm();

    form.on('file', function(fields, file) {
        debug("assetPost file path: ", file.path);
        saveAsset(file, req, res, next);
    }).on('error', function(err) {
        log.info("an error has occured with form upload");
        log.info(err);
        req.resume();
    })
    .on('aborted', function(err) {
        log.info("assetPost user aborted upload");
    })
    .on('end', function() {
        log.debug('assetPost upload done');
    });
    
    form.parse(req, function(err, fields, files) {
        debug("form.parse files: ")
    });
}
