'use strict';

var Airbex = require('airbex-client');

var Markets = require('./markets/markets.js')

var Controller = function(app, eventEmitter){
    this.markets = new Markets(app, eventEmitter)
};

var App = function(){
    var EventEmitter = require('events').EventEmitter;
    var eventEmitter = new EventEmitter();
    
    var controller = new Controller(this, eventEmitter);
    
    this.getApi = function(){
        return this.api;
    }
    
    this.start = function(){
        var url = window.environment === "demo" ? "https://demo.airbex.net:443/" : "https://airbex.net:443/";
        this.api = new Airbex.WebSocketClient({url:url});
        this.api.on('connected', onConnected.bind(this));
        this.api.on('connect_error', onConnectError.bind(this));
        this.api.on('error', onError.bind(this));
        this.api.start();
    }
   
    function onConnectError(){
        console.log('connect_error');
        //controller.status.setModel({state:"error"});
    }

    function onError(error){
        console.log('error ', error.description.message);
        //controller.status.setModel({state:"error"});
    }

    function onConnected(){
        console.log('App onConnected');
        eventEmitter.emit('connected');
    }
};

var app = new App();
app.start();

