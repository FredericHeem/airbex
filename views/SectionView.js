var View = require('./View')
, Backbone = require('backbone')
, SectionView = module.exports = View.extend({
	show: function (render) {
        $(window).scrollTop(0).scrollLeft(0);
        console.log('header section for this section is ', this.section)
        app.header.section(this.section || null);

		render && this.render()
	}
});