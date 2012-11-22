var View = require('./View')
, ModalView = module.exports = View.extend({
	show: function(options) {
		this.render();

		this.$el.modal(_.extend({
			showClose: false,
			zIndex: 1051
		}, options));

		this.$el.on('modal:close', _.bind(function() {
			console.log('modal being closed, destroying');
			this.destroy(this); 
		}, this));
	},

	close: function() {
		$.modal.close();
	}
});