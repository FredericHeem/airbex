var debug = require('debug')('snow:solvencyproof');
var util = require('util')
, async = require('async')
, fs = require('fs')
, prefix = '[snow:solvencyproof]'
, pg = require('pg')
, Client = pg.Client
, lproof = require('lproof')

var SolvencyProof = module.exports = exports = function(config)
{
    console.log("SolvencyProof ", config.pg_url)
    this.client = new Client(config.pg_url)
}

SolvencyProof.prototype.dbConnect = function(cb) {
  console.log("connecting")
  this.client.connect(function(err){
      console.log("connected: " + err)
      cb(err)
  })
}

SolvencyProof.prototype.createCompleteTree = function(accounts) {
    console.log("createCompleteTree #accounts %d", accounts.length)
    var completeTree = lproof.generateCompleteTree(accounts);
    //console.log(completeTree.serializeToArray());
    return completeTree;
}

SolvencyProof.prototype.saveCompleteTreeToDb = function(client, currency, completeTree, cb) {
    console.log("saveCompleteTreeToDb")
    var completeTreeSerialized = completeTree.serializeToArray()
    console.log(completeTreeSerialized);
    
    var query = {
            text: [
                   'INSERT INTO liability (currency, tree) VALUES($1,$2)'
            ].join('\n'),
            values: [currency, completeTreeSerialized]
    }

    client.query(query, function(err) {
        if (err) {
            console.log("saveCompleteTreeToDb Error %s", err)
            return cb(err)
        }
        console.log("saveCompleteTreeToDb saved");
        cb()
    })
}

SolvencyProof.prototype.createPartialTree = function(completeTree, user) {
    console.log("createPartialTree for %s", user)
    var partialTree = lproof.extractPartialTree(completeTree, user);
    //partial_tree.prettyPrint(format);
    console.log(partialTree.serialize());
    return partialTree;
}

SolvencyProof.prototype.createRoot = function(completeTree) {
    console.log("createRoot")
    var root = completeTree.root();
    console.log(JSON.stringify({ root: root.data }));
    return root;
}

SolvencyProof.prototype.verify = function(partialTree, root) {
    console.log("verify")
    var result = lproof.verifyTree(partialTree, root);

    if (result.success) {
      console.log('Partial tree verified successfuly!');
      console.log('Your user is ' + result.data.user + 
                  ' and your balance is ' + result.data.value);
      // @TODO: show user and value
    }
    else {
      console.log('INVALID partial tree!');
      if (result.error) {
        console.log(result.error);
      }
      process.exit(-1);
    }
    return root;
}

SolvencyProof.prototype.writeAccountsToFile = function(currency, accounts, cb) {
    console.log("writeAccountsToFile")
    fs.writeFile(currency + '-accounts.json', JSON.stringify(accounts), function(err){
        if(err) {
            console.log("writeAccountsToFile error ", err)
            cb(err)
        } else{
            console.log("writeAccountsToFile done")
            cb()
        }
        
    });
}

SolvencyProof.prototype.createAccountsJson = function(client, currency, cb) {
    console.log("createAccountsJson for currency ", currency);
    var query = {
            text: [
                   'SELECT u.email, ac.balance', 
                   'FROM "account" ac', 
                   'INNER JOIN "user" u ON ac.user_id = u.user_id', 
                   'WHERE currency_id=$1 AND type=\'current\''
            ].join('\n'),
            values: [currency]
    }

    client.query(query, function(err, dr) {
        if (err) {
            console.log("Error %s", err)
            return cb(err)
        }
        console.log("#users ", dr.rowCount)
        if (!dr.rowCount) {
            console.log("no users")
            return cb()
        }
        var accounts = [];
        dr.rows.map(function(row) {
            console.log("email %s, balance: %s", row.email, row.balance);
            accounts.push( {
                user: row.email,
                balance: row.balance / 1e8
            })
        })
        console.log("#accounts ", accounts.length)
        cb(null, accounts)
    })
}

SolvencyProof.prototype.createAndSaveRoot = function(client, currency, cb) {
    console.log("createAndSaveRoot for  %s", currency)
    async.waterfall(
            [
             function(callback) {
                 SolvencyProof.prototype.createAccountsJson(client, currency, callback);
             },
             function(accounts, callback) {
                 var completeTree = SolvencyProof.prototype.createCompleteTree(accounts);
                 SolvencyProof.prototype.saveCompleteTreeToDb(client, currency, completeTree, callback);
             }
             ],
             function(err) {
                console.log("createAndSaveRoot done")
                cb(err);
            }
    );
}

SolvencyProof.prototype.createAndSaveRootForEach = function(currencies, cb) {
    console.log("createAndSaveRootForEach")
    var client = this.client;
    async.each(currencies,
            function(currency, callback){
        SolvencyProof.prototype.createAndSaveRoot(client, currency, callback)
    },
    function(err){
        cb(err)
    }
    )
}
