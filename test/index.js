var fs = require('fs')
, path  = require('path')
, Client = require('pg').Client
, client = new Client(process.env.DB)
, files = fs.readdirSync(__dirname).filter(function(fn) {
    return fn.match((/\.sql$/))
})

describe('database', function() {
    client.connect()
    files.forEach(function(fn) {
        it(fn, function(done) {
            var q = fs.readFileSync(path.join(__dirname, fn), 'utf8')
            client.query(q, done)
        })
    })

    after(client.end.bind(client))
})
