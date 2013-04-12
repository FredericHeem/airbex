require('shelljs/global')

task('pp', ['publish-production'])
task('publish-production', function() {
    jake.exec([
        'git checkout production',
        'git merge master',
        'git checkout master',
        'git push production production:master'
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

task('publish-staging', function() {
    jake.exec([
        'git checkout staging',
        'git merge master',
        'git checkout master',
        'git push origin staging'
    ], { printStderr: true, printStdout: true })
})
