var SectionView = require('./SectionView')
, app = require('../app')
, Backbone = require('backbone')
, _ = require('underscore')
, RouteNotFoundView = module.exports = SectionView.extend({
    section: null,

    render: function() {
        this.$el.html(require('../../../assets/templates/route-not-found.ejs')({
            hash: window.location.hash
        }));

        return this;
    }
});