 var View = require('./View')
 , templates = require('../templates')
 , LoginView = require('./LoginView')
 , app = require('../app')
 , HeaderView = module.exports = View.extend({
    el: '#header',

    logout: function(e) {
        e.preventDefault();

        app.session.logout();
    },

    section: function(id) {
        this.$el.find('.nav li').removeClass('active');

        if (id) {
            this.$el.find('.nav li.' + id).addClass('active');
        }
    },

    initialize:function () {
        console.log('app from init', app);
        this.bindTo(app.session, 'change', this.sessionChange, this);
    },

    sessionChange: function() {
        console.log('header view rendering from session change. session is', app.session);
        this.render();
    },

    render: function (eventName) {console.log('temp', app.session.toJSON())
        this.$el.find('#auth-status').html(templates('auth-status')({
            session: app.session.toJSON()
        }));

        return this;
    }
});