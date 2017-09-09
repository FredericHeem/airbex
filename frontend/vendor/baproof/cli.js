#!/usr/bin/env node

console.error('WARNING: This tool does not currently conform with latest specification.');

var program = require('commander'),
  bitcoin = require('bitcoin'),
  async = require('async'),
  baproof = require('./'),
  fs = require('fs');

program
  .version(JSON.parse(fs.readFileSync(__dirname + '/package.json', 'utf8')).version)
  .usage('<action>')
  .option('-h, --host <host>', 'bitcoind RPC host', 'localhost')
  .option('-p, --port <port>', 'bitcoind RPC port', parseInt, 8332)
  .option('--user <user>', 'bitcoind RPC user')
  .option('--pass <pass>', 'bitcoind RPC pass')
  .option('--human', 'Human readable output.');

function parse_list (str) {
  var arr = str.split(',');
  for (var i = 0; i < arr.length; i++) {
    arr[i] = arr[i].trim();
  }
  return arr;
}

program
  .command('verifysignatures <file>')
  .description('Verify that all signatures in <file> are valid.')
  .action(function (file) {
    var obj = JSON.parse(fs.readFileSync(file));
    if (baproof.verifySignatures(obj)) {
      console.log(obj.message + ' signatures are valid!');
    }
    else {
      console.error('INVALID signature found!');
    }
    process.exit(-1);
  });

program
  .command('balance <file>')
  .description('Calculate the total balance of an asset proof.')
  .action(function (file) {
    var obj = JSON.parse(fs.readFileSync(file));

    if (!baproof.verifySignatures(obj)) {
      console.error('INVALID signature found!');
      process.exit(-1);
    }

    var client = new bitcoin.Client({
      host: program.host,
      port: program.port,
      user: program.user,
      pass: program.pass
    });

    var total = 0;
    var addresses = baproof.getAddresses(obj);

    async.each(addresses, function (addr, cb) {
      client.cmd('getreceivedbyaddress', addr, function (err, res) {
        if (err) return console.error(err);
        total += Number(res);
        cb();
      });
    }, function (err) {
      if (err) {
        console.error(err);
        process.exit(-1);
      }
      console.log(total);
    });
  });

program
  .command('signall <message> <blockhash>')
  .description('Generates an asset proof file with all private keys in wallet.')
  .option('--keys <keys>', 'Comma separated list of private keys used to sign.', parse_list)
  .option('--addresses <addresses>', 'Comma separated list of addresses to sign.', parse_list)
  .option('--currency <currency>', 'Currency: BTC, LTC, DOGE etc ...', 'BTC')
  .option('--testnet <testnet>', 'Testnet')
  .action(function (message, blockhash, opts) {
    // Private keys are passed directly, no need to do RPC calls
    if (opts.keys) {
      var res = baproof.signAll(opts.keys, message, blockhash);
      console.log(JSON.stringify(res));
      return;
    }

    var msg = blockhash + '|' + message;

    var client = new bitcoin.Client({
      host: program.host,
      port: program.port,
      user: program.user,
      pass: program.pass
    });

    //client.getBalance('*', 6, function (err, balance) {
      //if (err) return console.log(err);
      //console.log('Balance:', balance);
    //});

    var addresses = opts.addresses || [],
      output = {
        currency: opts.currency,
        testnet: opts.testnet,
        message: message,
        blockhash: blockhash,
        signatures: []
      };

    //@TODO: batch requests https://github.com/freewil/node-bitcoin#batch-multiple-rpc-calls-into-single-http-request
    // nevermind, there seems to be a bug with batch requests :(
    async.series([
      function (cb) {
        if (addresses.length > 0) return cb();

        client.cmd('listunspent', 0, function (err, res){
          if (err) return cb(err);

          if (!res.length) {
            return cb('No address found in bitcoin wallet!');
          }
          res.forEach(function (hash) {
            addresses.push(hash.address);
          });
          cb();
        });
      },
      function (cb) {
        async.each(addresses, function (addr, cb) {
          client.cmd('signmessage', addr, msg, function (err, res) {
            if (err) return cb(err);

            output.signatures.push({
              address: addr,
              signature: res
            });

            cb();
          });
        }, cb);
      }
    ], function (err) {
      if (err) return console.error(err);
      if (program.human) {
        console.log(output);
      }
      else {
        console.log(JSON.stringify(output));
      }
    });


  });

program.parse(process.argv);
if (!program.args.length) program.help();
