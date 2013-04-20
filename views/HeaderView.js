 var View = require('./View')
 , LoginView = require('./LoginView')
 , app = require('../app')
 , HeaderView = module.exports = View.extend({
    el: '#top',

    section: function(id) {
        this.$el.find('.nav li').removeClass('active');

        if (id) {
            this.$el.find('.nav li.' + id).addClass('active');
        }
    },

    initialize:function () {
        var that = this

        app.on('login', function() {
            that.render()
        })
    },

    sessionChange: function() {
        this.render();
    },

    render: function () {
        if (app.user) {
            this.find('.account-summary .email').html(app.user.get('email'))
        }

        return this;
    }
});