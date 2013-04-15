var View = require('./View')
, Backbone = require('backbone')
, SectionView = module.exports = View.extend({
	show: function (render) {
        $(window).scrollTop(0).scrollLeft(0);
        app.header.section(this.section || null);

		render && this.render()
	}
});