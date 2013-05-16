require('shelljs/global')

task('pp', ['publish-production'])
task('publish-production', function() {
    jake.exec([
        'git checkout production',
        'git merge master',
        'git checkout master',
        'git push production production:master',
        'npm version patch',
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

task('litecoind', function() {
    var path = require('path')
    , util = require('util')

    var p = util.format(
        'litecoind -datadir=%s -txindex=1',
        path.join(__dirname, '../ltc'))
    , ex = jake.createExec([p])
    console.log(p)
    ex.run()
})
