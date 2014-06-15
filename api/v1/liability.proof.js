var debug = require('debug')('snow:liabilityproof');
var async = require('async');
var lproof = require('lproof');
var fs = require('fs');
var format = require('util').format;
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
                   'SELECT tree',
                   'FROM "liability"',
                   'WHERE currency=$1',
                   'ORDER BY created_at desc limit 1'
                   ].join('\n'),
                   values: [currency.toUpperCase()]
    }
    
    app.conn.read.query(query, function(err, dr) {
        if (err) {
            debug("getCompleteTreeFromDb db error ", err);
            next(err)
        } else if(dr.rowCount > 0){
            var completeTreeJson = dr.rows[0].tree;
            debug("tree ", completeTreeJson);
            var Tree = lproof.Tree;
            var completeTree = Tree.deserializeFromArray(JSON.stringify(completeTreeJson))
            cb(null, completeTree);
        } else {
            debug("root: no tree found")
            cb({error:"NoCompleteTreeFound"})
        }
       
    })    
}

exports.root = function(req, res, next) {
	var currency = req.params.currency;
	debug("root: ", currency);
	getCompleteTreeFromDb(currency, req.app, next, function(err, completeTree){
		if(err){
			res.send(400, {error:err})
		} else {
			var root = lproof.serializeRoot(completeTree, currency);
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

exports.assetGet = function(req, res, next) {
	var currency = req.params.currency;
	debug("assetGet: ", currency);
    var query = {
            text: [
                   'SELECT asset_json',
                   'FROM "asset"',
                   'WHERE currency=$1',
                   'ORDER BY created_at desc limit 1'
                   ].join('\n'),
                   values: [currency.toUpperCase()]
    }
    
    req.app.conn.read.query(query, function(err, dr) {
        if (err) {
            debug("asset db error ", err);
            next(err)
        } else if(dr.rowCount > 0){
            var asset_json = dr.rows[0].asset_json;
            debug("asset: ", JSON.stringify(asset_json));
            res.send(asset_json)
        } else {
            debug("asset: no asset found")
            res.send(400, {error:"NoAssetFound"})
        }
    })    	
}

exports.assetGetAll = function(req, res, next) {
	debug("assetAll: ");
    var query = {
            text: [
                   'SELECT asset_id, currency, block, asset_json, created_at',
                   'FROM "asset"'
                   ].join('\n')
    }
    
    req.app.conn.read.query(query, function(err, dr) {
        if (err) {
            debug("asset db error ", err);
            next(err)
        } else {
        	res.send(dr.rows)
        }
    })    	
}

exports.assetPost = function(req, res, next) {

	if(!req.files || !req.files.asset){
		debug("assetPost no doc");
		return res.send(400, {
			name: 'BadRequest',
			message: 'Request is invalid'
		})
	}

	var assetFile = req.files.asset;

	var sizeKb = assetFile.size / 1024 | 0

	if(sizeKb > 5* 1014){
		debug('assetPost , %s, size %s kB TOO BIG', assetFile.name, sizeKb);
		return res.send(400, {
			name: 'FileToBig',
			message: 'file is too big'
		})
	}
	debug('assetPost  %s, size %s kB',  assetFile.name, sizeKb);
	if(assetFile.size === 0){
		return res.send(400, {
			name: 'FileEmpty',
			message: 'Empty file'
		})		
	}
	
	fs.readFile(assetFile.path, "utf8", function (err, data) {
		if (err) throw err;
		debug('assetPost length %s',data.length)
		var assetJson = JSON.parse(data)
		req.app.conn.write.query({
			text: [
			       'INSERT INTO asset(currency, block, asset_json)',
			       'VALUES($1, $2, $3)'
			       ].join('\n'),
			       values: [assetJson.currency, assetJson.blockhash, assetJson]
		}, function(err) {
			if (err) return next(err)
			res.send({result : format('\nuploaded %s (%d Kb) '
					, assetFile.name
					, sizeKb )});
		})
	});
}
