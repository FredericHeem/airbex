var _ = require('lodash')

module.exports = function(app, api, analytics) {
    function attach(user) {
        console.log('Fetching Intercom settings')
        api.call('intercom')
        .done(function(settings) {
            settings.widget = {
                widget: {
                    activator: '#IntercomDefaultWidget'
                }
            }
            console.log('Identifying with segment.io')
            analytics.identify(user.id.toString(), {
                email: user.email,
                created: settings.created_at
            }, {
                intercom: {
                    user_hash: settings.user_hash
                }
            })
        })
    }

    app.on('user', attach)
}
