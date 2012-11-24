var _ = require('underscore')
, Backbone = require('backbone')
, app = module.exports = {
    router: null,
    session: null,

    section: function(value, render) {
        if (!_.isUndefined(value) && value !== app.section.value) {
            if (app.section.value) {
                console.log('disposing of previous section');
                app.section.value.dispose();
            }

            app.section.value = value;
            value.show(value);

            $('#section').html(value.$el);
        }

        return app.section.value || null;
    },

    authorize: function() {
        console.log('authorizing...', app.session.authenticated())

        if (app.session.authenticated()) return true;

        console.log('authorization failed, user is not authenticated');

        Backbone.history.navigate('login?after=' + window.location.hash.substr(1), true);

        return false;
    }
};