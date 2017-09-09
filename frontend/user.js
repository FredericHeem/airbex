'use strict';
var debug = require('./helpers/debug')('user')
, _ = require('lodash')
, callingCodes = require('./assets/callingcodes.json');

var UserController = function(app, eventEmitter){
    eventEmitter.on('connected', onConnected.bind(this));
    eventEmitter.on('user', onUser.bind(this));
    
    function onConnected(){

    }
    
    function onUser(user){
        debug('onUser')
        $.cookie('existingUser', true, { path: '/', expires: 365 * 10 })

        api.user = user
        api.securityLevel(user.securityLevel)

        api.user.countryFriendly = function() {
            if (!user.country) return null
            var item = _.find(callingCodes, { code: user.country })
            return item ? item.name : 'Unknown'
        }

        $app.addClass('is-logged-in')
        .addClass('is-user-country-' + (api.user.country || 'unknown'))
        

        $app.toggleClass('is-logged-in', !!user)
        $app.toggleClass('is-admin', user && user.admin)

        if (user.language) {
            debug('user has a language, %s, setting it on i18n', user.language)
            i18n.set(user.language)
        }

        if (!user.language && i18n.desired) {
            debug('user has no language, i18n has desired. patching user')

            api.patchUser({ language: i18n.desired })
            .fail(errors.reportFromXhr)
        }
        
    }
};

module.exports = UserController;