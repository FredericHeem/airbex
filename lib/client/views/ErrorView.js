var SectionView = require('./SectionView')
, app = require('../app')
, Backbone = require('backbone')
, _ = require('underscore')
, templates = require('../templates')
, ErrorView = module.exports = SectionView.extend({
    section: null,

    render: function() {
        this.$el.html(templates['error']({
            error: this.options.error
        }));

        return this;
    }
});