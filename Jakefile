require('shelljs/global')

task('dev', function() {
    // Static web server
    pushd('web')
    var staticWeb = exec('jake host', { async: true })
    var liveWatch = exec('livewatch jake assets:controllers:entry.js build', { async: true })
    popd()

    // API server
    pushd('api')
    var apiServer = exec('nodemon index.js', { async: true })
    popd()

    // bitcoind
    var bitcoind = exec('bitcoind -datadir=btc -txindex=1')

    // litecoind
    var litecoind = exec('litecoind -datadir=ltc')

    // workers
    pushd('workers')
    var workers = exec('nodemon bin/all')
    popd()
}, { async: true })
