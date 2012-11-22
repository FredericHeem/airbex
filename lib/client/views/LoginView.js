var SectionView = require('./SectionView')
, app = require('../app')
, Backbone = require('backbone')
, _ = require('underscore')
, templates = require('../templates')
, LoginView = module.exports = SectionView.extend({
	events: {
		'submit form' : 'login'
	},

	section: null,

	login: function(e) {
		e.preventDefault();
		var that = this;

		this.$el.find('button.login').attr('disabled', 'disabled').addClass('disabled loading');

		app.session.login({
			username: this.$el.find('input[name="username"]').val(),
			password: this.$el.find('input[name="password"]').val()
		}, _.bind(function(err, res) {
			if (!err) {
				that.$el.find('input[name="password"]').val('');
				Backbone.history.navigate(this.options.after || 'my/accounts', true);
				return;
			}

			that.$el.find('form:first').addClass('error');

			that.$el.find('button.login').removeAttr('disabled').removeClass('disabled loading');

			console.error('Login failed.', res, err);

			if (res && res.error == 'wrong username/password') {
				console.log('Invalid login credentials.');
				that.$el.find('.help-block').show().text('Wrong username or password');
				return;
			}

			that.$el.find('.help-block').show().text('Not sure why login failed.');

			console.error('Not sure why login failed.');
		}, this));
	},

	render: function() {
		this.$el.html(templates['login']());

		return this;
	}
});