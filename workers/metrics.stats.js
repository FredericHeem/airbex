var debug = require('debug')('snow:metrics:stats')
, Client = require('pg').Client
, EventEmitter = require('events').EventEmitter
, util = require('util')
, async = require('async')

function Stats(options) {
	this.options = options;
	this.root = options.firebaseRoot;
    this.conn = new Client(options.postgresUrl);

    this.conn.connect(function(err) {
        if (err) return this.emit('error', err)
        debug('connected to postgres')
        this.startLoop()
    }.bind(this))
}

util.inherits(Stats, EventEmitter)

Stats.prototype.startLoop = function() {
    async.forever(function(cb) {
        this.tick(function(err) {
            if (err) return this.emit('error', err)
            setTimeout(cb, 5e3)
        }.bind(this))
    }.bind(this))
}

Stats.prototype.tick = function(cb) {
	var query = 'select count(*) count from "user"';
	this.conn.query(query, function(err, data){
        if (err) {
            cb();
            return this.emit('error', err)
        }

		var countRef = this.root.child('stats/userCount')
        debug('users: %s', data.rows[0].count)
		countRef.set(data.rows[0].count, cb)
	}.bind(this));
}

module.exports = Stats;