var SectionView = require('./SectionView')
, app = require('../app')
, Backbone = require('backbone')
, _ = require('underscore')
, ErrorView = module.exports = SectionView.extend({
    section: null,

    render: function() {
        this.$el.html(require('../templates/error.ejs')({
            error: this.options.error
        }));

        return this;
    }
});