var SectionView = require('./SectionView')
, app = require('../app')
, Backbone = require('backbone')
, _ = require('underscore')
, templates = require('../templates')
, RouteNotFoundView = module.exports = SectionView.extend({
    section: null,

    render: function() {
        this.$el.html(templates('route-not-found')({
            hash: window.location.hash
        }));

        return this;
    }
});