var debug = require('debug')('snow:liabilityproof')
, async = require('async')
, lproof = require('lproof')

module.exports = exports = function(app) {
    app.get('/v1/proof/root/:currency', exports.root)
    app.get('/v1/proof/liability/:currency', app.security.demand.any, exports.liability)
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
