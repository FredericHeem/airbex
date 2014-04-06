var WebSocket= require('ws')
, _ = require('lodash')
, EventEmitter = require('events').EventEmitter
, util = require('util')
, debug = require('debug')('reconnect-ws')

function ReconnectWs(uri, interval) {
    _.bindAll(this)
    this.uri = uri
    this.interval = interval || 5e3
    this.connected = false
    this.connect()
}

util.inherits(ReconnectWs, EventEmitter)

ReconnectWs.prototype.connect = function() {
    debug('connecting to %s...', this.uri)
    this.ws = new WebSocket(this.uri)
    this.ws.on('open', this.wsOpen)
    this.ws.on('message', this.wsMessage)
    this.ws.on('close', this.wsClose)
    this.ws.on('error', this.wsError)
}

ReconnectWs.prototype.wsOpen = function() {
    debug('connected')
    this.commandIndex = 0
    this.requests = {}
    this.connected = true
    this.emit('open')
}

ReconnectWs.prototype.wsClose = function() {
    this.connected = false
    debug('disconnected')
    _.each(this.requests, function(cb) {
        cb(new Error('Disconnected during request'))
    })
    this.requests = null
    this.emit('close')

    this.retry()
}

ReconnectWs.prototype.retry = function() {
    debug('retrying connection in 5s...')
    setTimeout(function() {
        debug('retrying connection...')
        this.connect()
    }.bind(this), this.interval)
}

ReconnectWs.prototype.wsError = function(err) {
    this.connected = false
    debug('error: %s', err.message)
    this.retry()
}

ReconnectWs.prototype.wsMessage = function(msg) {
    this.emit('message', msg)
}

ReconnectWs.prototype.send = function() {
    this.ws.send.apply(this.ws, arguments)
}

module.exports = ReconnectWs
