/* global Raven, alertify */
var debug = require('./helpers/debug')('errors')
, format = require('util').format

exports.bodyFromXhr = function(xhr) {
    if (xhr.getAllResponseHeaders().match(/Content-Type: application\/json/i)) {
        try {
            return JSON.parse(xhr.responseText)
        }
        catch (e) {
        }
    }

    return xhr.responseText
}

exports.alertFromXhr = function(error) {
    if (error.xhr.readyState === 0) return

    exports.reportFromXhr(error)

    alertify.alert(
        'Something went wrong!<br/>' +
        'We have logged the error and will fix it soon.<br/>' +
        'Here\'s what our computers said:<br/>' +
        JSON.stringify(exports.bodyFromXhr(error.xhr), null, 4))
}

exports.reportFromXhr = function(error) {
    if (!error.xhr) throw new Error('Error is not XHR error')
    if (!error.xhr.readyState || !error.xhr.status) return

    var strippedUrl = error.xhr.settings.url

    strippedUrl = strippedUrl.replace(/\?ts=\d+/, '')
    strippedUrl = strippedUrl.replace(/[\?\&]key=[a-z0-9]+/i, '')

    var message = format('XHR Error: %s %s: %s',
        strippedUrl,
        error.xhr.statusText,
        error.xhr.responseTextr ? error.xhr.responseText.substr(0, 200) :
            '<no response text>')

    var data = {
        tags: {
            url: (error.xhr.settings.type || 'GET') + ' ' + strippedUrl,
            user: api.user ? api.user.id : null
        },
        extra: {
            url: strippedUrl,
            status: error.xhr.status,
            type: error.xhr.settings.type,
            requestData: error.xhr.settings.data || null,
            responseText: error.xhr.responseText,
            user: api.user ? api.user.id : null
        }
    }

    debug(message)
    debug(JSON.stringify(data, null, 4))

    if (typeof Raven !== 'undefined') {
        Raven.captureMessage(message, data)
    }
}
