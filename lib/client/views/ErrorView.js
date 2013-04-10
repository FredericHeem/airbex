var SectionView = require('./SectionView')
, app = require('../app')
, Backbone = require('backbone')
, _ = require('underscore')
, ErrorView = module.exports = SectionView.extend({
    section: null,

    render: function() {
        this.$el.html(require('../../../assets/templates/error.ejs')({
            error: this.options.error
        }));

        return this;
    }
});