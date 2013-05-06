var _ = require('lodash')

module.exports = function(app, api) {
    if (_.isUndefined(window.Intercom)) {
        return console.log('Intercom script is not installed')
    }
    if (window.location.hostname == 'localhost') {
        return console.log('Not attaching Intercom for localhost')
    }

    function attach(user) {
        console.log('Fetching Intercom settings')
        api.call('intercom')
        .done(function(settings) {
            console.log('Booting Intercom with settings', settings)
            Intercom('boot', settings)

            $(window).on('hashchange', Intercom.bind(Intercom, 'update'))
        })
    }

    app.on('user', attach)
}
