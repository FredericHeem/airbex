var bitcoinsig = require('./bitcoinsig'),
  async = require('async'),
  http = require('http');


function verify_signature (addr, sig, message) {
  var res = bitcoinsig.verifyMessage(sig, message);

  if (!res) return false;

  return (res === addr);
}

function verify_signatures (obj) {
  var message = obj.id;
  
  for (var i = 0; i < obj.signatures.length; i++) {
    var addr = obj.signatures[i].address;
    var sig = obj.signatures[i].signature;

    if (!verify_signature(addr, sig, message))
      return false;
  }
  return true;
}

function get_addresses (obj) {
  var addresses = [];
  // remove duplicates. see http://stackoverflow.com/a/14740171/96855
  var dups = {};
  obj.signatures.forEach(function (hash) {
    if (dups[hash.address]) return;
    dups[hash.address] = true;
    addresses.push(hash.address);
  });
  return addresses;
}

// This is the browser version since RPC calls not available
// We use the blockchain.info API
function get_balance (addresses, cb) {
  var total = 0;

  async.each(addresses, function (addr, cb) {
      $.ajax({
          url: "http://blockchain.info/address/" + addr + '?format=json',
          type: 'GET',
          dataType: 'json',
          beforeSend: function(xhr) {
          }
        })
        .done(function(data) { 
            data = JSON.parse(data);
            total += data.final_balance;
            //console.log("balance is now ", total)
            cb();
        })
        .fail(function(data) {
            console.log("cannot get address balance: ", data)
            cb("cannot get address balance", data)
        });
      
  }, function (err) {
    cb(err, total);
  });

  
  return; 
}

module.exports.verifySignatures = verify_signatures;
module.exports.getBalance = get_balance;
module.exports.getAddresses = get_addresses;
