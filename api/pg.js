var log = require('./log')(__filename)
debug = log.debug


module.exports = function(url, useNative) {
    var pg = require('pg')
    if (useNative) pg = pg['native']
    log.info("db connect")
    var state = 'idle';
    this.client = new pg.Client(url)
    var reconnectIn = 10e3; // 10 sec
    
    pg.on('error', function(err, client){
        log.error('Database state %s, error %s', state, err);
        reconnect(client)
    });

    client.on('error', function(err){
        log.error('Database client state %s, error %s', state, err);
        reconnect(client)
    });
    
    client.on('end', function(err){
        log.info('connection ends client state %s, error %s', state, err);
    });
    
    function disconnect(){
        log.info('disconnect ');
        client.end();
    }
    
    function reconnect(client){
        client.end();
        var newClient = new pg.Client(url);
        this.client = newClient;
        log.info('Reconnect in %s msec', reconnectIn);
        setTimeout(function(){
            log.info('Reconnecting ');
            connect(newClient)
        }, reconnectIn)
        
    }
    
    function connect(client){
        log.info('connect, current state ', state);
        if(state !== 'connecting'){
            state = 'connecting';
            client.connect(function(err){
                if(err){
                    log.info('connect ', err);
                    state = 'error';
                    reconnect(client)
                } else {
                    log.info('connected ');
                    state = 'connected';
                }
            });
        }
    }
    
    connect(client);
    
    return {
        get: function get(){
            return client;
        },
        disconnect:disconnect
    }
}
