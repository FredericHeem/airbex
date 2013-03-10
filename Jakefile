require('shelljs/global')

task('test', function() {
    jake.exec('mocha -R spec', { printStderr: true, printStdout: true } )
})

task('publish-prod', function() {
    jake.exec([
        'git checkout prod',
        'git merge master',
        'git checkout master',
        'git push prod prod:master'
    ], { printStderr: true })
})

task('bitcoind', function() {
    var path = require('path')
    , util = require('util')

    var p = util.format(
        'bitcoind -datadir=%s -txindex=1',
        path.join(__dirname, '../btc'))
    , ex = jake.createExec([p])
    console.log(p)
    ex.run()
})
