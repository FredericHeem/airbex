var fs = require('fs')
, colors = require('colors')
, path  = require('path')
, Client = require('pg').Client
, argv = require('optimist')
.usage('Run migration scripts.\nUsage: $0')
.describe('d', 'database uri').demand('d').alias('d', 'db')
.describe('f', 'from migration index').alias('f', 'from').default('f', 0)
.describe('t', 'to migration index').alias('t', 'to').default('t', 1000)
.argv

var client = new Client(argv.db)
client.connect()

var dir = path.join(__dirname, './migrations')
, files = fs.readdirSync(dir).sort()

function nextFile(cb) {
    var fn = files.shift()
    if (!fn) return cb()

    var n = +fn.substr(0, 3)
    if (n < argv.from) return nextFile(cb)
    if (n > argv.to) return cb()

    var q = fs.readFileSync(path.join(dir, fn), 'utf8')
    process.stdout.write(fn.substr(0, 3) + '... ')
    client.query(q, function(err) {
        if (err) {
            console.error('ERROR: %s\n'.red, err.message)
            throw err
        }
        console.log('OK'.green)
        nextFile(cb)
    })
}

if (argv.f === 0 && argv.t == 1000) console.log('running all migrations')
else console.log('running migrations %s to %s', argv.f, argv.t)

nextFile(function() {
    process.exit()
})
