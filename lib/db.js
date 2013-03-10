var config = require('../config')
_ = require('underscore')
, debug = require('debug')('snow:db')
, pg = config.PG_NATIVE ? require('pg').native : require('pg')
, Client = pg.Client;

var build = {
    insert: function(table, kv, returning) {
        var q = {
            text: 'INSERT INTO ' + table + ' (' +
                _.keys(kv).join(',') +
                ') VALUES (' +
                _.map(_.range(1, _.keys(kv).length + 1), function(x) { return '$' + x }).join(', ') +
                ')',
            values: _.values(kv)
        };

        if (returning) {
            q.text = q.text + ' RETURNING ' + returning;
        }

        debug(JSON.stringify(q));

        return q;
    }
};

module.exports = function() {
    var client = new Client(config.PG_URL);
    client.connect();
    client.build = build;
    return client;
};