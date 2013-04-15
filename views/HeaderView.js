 var View = require('./View')
 , LoginView = require('./LoginView')
 , app = require('../app')
 , HeaderView = module.exports = View.extend({
    el: '#header',

    logout: function(e) {
        e.preventDefault();
        app.api.key = null
        api.api.secret = null
    },

    section: function(id) {
        this.$el.find('.nav li').removeClass('active');

        if (id) {
            this.$el.find('.nav li.' + id).addClass('active');
        }
    },

    initialize:function () {
    },

    sessionChange: function() {
        this.render();
    },

    render: function (eventName) {
        /*
        this.$el.find('#auth-status').html(templates('auth-status')({
            session: app.session.toJSON()
        }));
        */

        return this;
    }
});