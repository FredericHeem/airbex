var fs = require('fs')
, path  = require('path')
, Client = require('pg').Client
, url = process.argv[2]
, Q = require('q')
, argv = require('optimist')
.demand('db')
.default('start', 0)
.default('stop', 1000)
.default('db', process.env.NODE_ENV == 'travis' ? 'tcp://postgres@localhost/snow' : null)
.argv

if (!argv.db) {
    console.error('no db specified and NODE_ENV is not travis')
    process.exit(1)
}

var client = new Client(argv.db)
client.connect()

var dir = path.join(__dirname, './migrations')
, files = fs.readdirSync(dir)
files.sort()

function nextFile() {
    var fn = files.shift()
    if (!fn) return null

    var n = +fn.substr(0, 3)
    if (n < argv.start) return nextFile()
    if (n > argv.stop) return null

    var q = fs.readFileSync(path.join(dir, fn), 'utf8')

    console.log('running script %s', fn)

    return Q.ninvoke(client, 'query', q)
    .then(function() {
        return nextFile()
    }, function(err) {
        console.error('failed to execute query:')
        console.error(q)
        throw err
    })
}

nextFile()
.then(function() {
    client.end()
})
.done()
