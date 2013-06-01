require('shelljs/global')
config.silent = false

function exited(name, code, output) {
    console.error('%s exited with code %d\n%s', name, code, output)

    // bitcoind/litecoind gets stuck at times
    exec('powershell -Command "kill -name bitcoind"')
    exec('powershell -Command "kill -name litecoind"')

    process.exit(1)
}

task('dev', function() {
    // Static web server
    pushd('web')
    var staticWeb = exec('jake host', { async: true }, exited.bind(this, 'staticWeb'))
    popd()

    // API server
    pushd('api')
    var apiServer = exec('nodemon index.js', { async: true }, exited.bind(this, 'apiServer'))
    popd()

    return

    // bitcoind
//    var bitcoind = exec('bitcoind -datadir=btc -txindex=1', exited.bind(this, 'bitcoind'))

    // litecoind
//    var litecoind = exec('litecoind -datadir=ltc', exited.bind(this, 'litecoind'))

    // workers
    /*
    pushd('workers')
    var workers = exec('nodemon bin/all', exited.bind(this, 'workers'))
    popd()
    */
}, { async: true })
