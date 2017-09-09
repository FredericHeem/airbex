'use strict';
var debug = require('./helpers/debug')('app')
var _ = require('lodash')
var UserController = require('./user.js')
var EventEmitter = require('events').EventEmitter;
var ApiWs = require('./apiws')

var App = function(){
    debug("App")
    
    var eventEmitter = new EventEmitter();
    this.user = new UserController(this, eventEmitter)
    
    var apiWs = new ApiWs(eventEmitter);
    _.extend(window.api, apiWs);
    
    this.getApi = function(){
        return this.api;
    }
    
    this.start = function(){
        api.start();
    }
};

module.exports = App;
