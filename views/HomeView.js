var SectionView = require('./SectionView')
, app = require('../app')
, Backbone = require('backbone')
, _ = require('underscore')
, HomeView = module.exports = SectionView.extend({
    section: null,

    render: function() {
    	var template = require('../assets/templates/home.ejs')
        this.$el.html(template())

        return this;
    }
});
