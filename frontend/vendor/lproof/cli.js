#!/usr/bin/env node

var program = require('commander'),
  util = require('util'),
  async = require('async'),
  path = require('path'),
  fs = require('fs-extra'),
  Tree = require('./lib/tree'),
  blproof = require('./lib/blproof');

function format (node) {
  var data = node.data;
  if (!data) return '';

  // leaf nodes
  if (data.nonce !== undefined) {
    return data.sum + ', ' + data.user + ', ' + data.nonce;
  }
  else {
    return data.sum + ', ' + data.hash;
  }
}

function log (str) {
  if (!program.verbose) return;
  console.error(str);
}

program
  .version(JSON.parse(fs.readFileSync(__dirname + '/package.json', 'utf8')).version)
  .usage('<action>')
  .option('-f, --file <file>', 'Which file to use.')
  .option('-h, --human', 'Print in human readable format instead of serializing.')
  .option('--id <id>', 'Identifier for use in blind solvency proof scheme.')
  .option('--currency <currency>', 'Specify a currency code.', 'BTC')
  .option('-v, --verbose', 'Output debugging information.');

program
  .command('completetree')
  .description('Generates complete proof tree. Must specify accounts file. See test/accounts.json for format.')
  .action(function () {
    if (!program.file) program.help();

    var accounts = JSON.parse(fs.readFileSync(program.file));
    var complete_tree = blproof.generateCompleteTree(accounts);

    if (program.human) {
      complete_tree.prettyPrint(format);
    }
    else {
      console.log(complete_tree.serializeToArray());
    }
  });

program
  .command('partialtree <user>')
  .description('Extracts the partial proof tree for a given user. Must specify complete proof tree file.')
  .action(function (user) {
    if (!program.file) program.help();
    if (!user) program.help();

    var complete_tree = Tree.deserializeFromArray(fs.readFileSync(program.file));
    var partial_tree = blproof.extractPartialTree(complete_tree, user);
    //console.log(util.inspect(partial_tree, { depth: null }));

    if (program.human) {
      partial_tree.prettyPrint(format);
    }
    else {
      console.log(blproof.serializePartialTree(partial_tree, program.id));
    }
  });

program
  .command('root')
  .description('Extracts root node from tree. Must specify complete proof tree file.')
  .action(function () {
    if (!program.file) program.help();

    var complete_tree = Tree.deserializeFromArray(fs.readFileSync(program.file));
    var root = complete_tree.root();

    if (program.human) {
      console.log('Root hash: ' + root.data.hash);
      console.log('Root sum: ' + root.data.sum);
    }
    else {
      console.log(blproof.serializeRoot(complete_tree, program.currency));
    }
  });

program
  .command('verify')
  .description('Verify a partial proof tree. Must specify root hash and sum. Must specify the partial proof tree file.')
  .option('--root <root_file>', 'File of the root')
  .option('--hash <hash>', 'Hash of root node')
  .option('--sum <value>', 'Sum of root node', parseFloat)
  .action(function (action) {
    if (!program.file) program.help();

    var serialized = fs.readFileSync(program.file);
    var id = JSON.parse(serialized).id;
    var tree = blproof.deserializePartialTree(serialized);

    var root = tree.root();

    var root_data = {};
    if (action.root) {
      root_data = JSON.parse(fs.readFileSync(action.root)).root;
    }
    else {
      root_data = { sum: action.sum, hash: action.hash };
    }

    try {
      var user_data = blproof.verifyTree(tree, root_data);

      console.log('Partial tree verified successfuly!\n');
      if (id) {
        console.log('Site ID: ' + id);
      }

      console.log('User: ' + user_data.user);
      console.log('Balance: ' + user_data.sum);

    }
    catch (e) {
      console.error('INVALID partial tree!');
      console.error(e);
      process.exit(-1);
    }
  });

program
  .command('generate')
  .description('Generate root and partial trees for all users in accounts file.')
  .action(function () {
    if (!program.file) program.help();

    var limit = 20;

    var accounts = JSON.parse(fs.readFileSync(program.file));
    var len = accounts.length;

    var complete_tree = blproof.generateCompleteTree(accounts);

    complete_tree.prettyPrint(format);

    var pt_path = 'partial_trees';

    // remove partial_trees/ recurisvely if it exists
    fs.removeSync(pt_path);
    // create an empty partial_trees/ directory
    fs.mkdirSync(pt_path);

    async.parallel([
      function (cb) {
        fs.writeFile('complete_tree.json', complete_tree.serializeToArray(), cb);
      },
      function (cb) {
        fs.writeFile('root.json', blproof.serializeRoot(complete_tree, program.currency), cb);
      },
      function (cb) {
        // limit is to limit how many files can be written at the same time
        log(accounts);

        async.eachLimit(accounts, limit, function (account, cb) {
          var partial_tree = blproof.extractPartialTree(complete_tree, account.user);

          log('Processing ' + account.user);
          if (program.verbose) partial_tree.prettyPrint(format);

          fs.writeFile(path.join(pt_path, account.user + '.json'), 
                       blproof.serializePartialTree(partial_tree, program.id), 
                       cb);
        }, cb);
      }
    ], function (err) {
      if (err) {
        console.error(err);
        process.exit(-1);
      }
      else {
        console.log('Successfuly generated ' + len + ' partial trees in ' + pt_path + '.');
      }
    });
  });

program.parse(process.argv);
if (!program.args.length) program.help();
