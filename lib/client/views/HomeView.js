var SectionView = require('./SectionView')
, app = require('../app')
, Backbone = require('backbone')
, _ = require('underscore')
, templates = require('../templates')
, HomeView = module.exports = SectionView.extend({
    section: null,

    render: function() {
        this.$el.html(templates('home')());

        return this;
    }
});