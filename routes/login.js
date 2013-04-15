var Backbone = require('backbone')
, app = require('../app')
, Models = require('../models')
, Views = require('../views')
, LoginRoute = module.exports = Backbone.Router.extend({
    routes: {
    },

    initialize: function() {
        this.route(/^login(?:\?after=(.+))?/, 'login')
    },

    login: function(after) {
        var that = this
        after || (after = 'my/accounts')

        var view = new Views.LoginView()

        view.on('login', function(e) {
            var user = new Models.User()
            user.fetch({
                url: app.api.url + '/whoami',
                headers: app.api.headers(null, e.hashes.key, e.hashes.secret),
                success: function() {
                    app.user = user
                    _.extend(app.api, e.hashes)
                    Backbone.history.navigate(after, true)
                },
                error: function(model, response, options) {
                    if (response.status === 401) {
                        alert('Wrong e-mail/password combination')
                        return
                    }

                    alert('Login failed, please try again')
                    console.log('login response', response)
                }
            })
        })

        app.section(view)
    }
})
