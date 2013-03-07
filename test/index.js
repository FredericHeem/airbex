var fs = require('fs')
, path  = require('path')
, Client = require('pg').Client
, url = process.argv[2]
, Q = require('q')
, argv = require('optimist')
.default('db', process.env.NODE_ENV == 'travis' ? 'tcp://postgres@localhost/snow' : null)
.argv

if (!argv.db) {
    console.error('no db specified and NODE_ENV is not travis')
    process.exit(1)
}

var client = new Client(argv.db)

var files = fs.readdirSync(__dirname).filter(function(fn) {
    return fn.match((/\.sql$/))
})

describe('database', function() {
    before(function(done) {
        client.connect(done)
    })

    files.forEach(function(fn) {
        it(fn, function(done) {
            var q = fs.readFileSync(path.join(__dirname, fn), 'utf8')
            client.query(q, function(err, res) {
                done(err)
            })
        })
    })

    after(function() {
        client.end()
    })
})
