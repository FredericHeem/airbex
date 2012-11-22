var Backbone = require('backbone')
, Meta = module.exports = Backbone.Model.extend({
	initialize: function() {
		this.$titleTag = $('title');

		if (!this.$titleTag.length) {
			this.$titleTag = $('<title></title>').appendTo($('head'));
		}

		this.$descriptionTag = $('meta[name="description"]');

		if (!this.$descriptionTag.length) {
			this.$descriptionTag = $('<meta name="description" content="" />').appendTo('head');
		}

		this.attributes.title = window.title || this.$titleTag.text();
		this.attributes.description = this.$descriptionTag.attr('content');
		this.attributes.rendered = false;

		this.on('change:title', function(model, title) {
			model.$titleTag.val(title);
			document.title = title;
		});

		this.on('change:description', function(model, description) {
			model.$descriptionTag.attr('content', description);
		});
	}
});