var Backbone = require('backbone')
, Session = module.exports = Backbone.Model.extend({
	initialize: function() {
		if ($.cookie('connect.sid')) {
			$.ajax({
				url: '/api/auth/whoami',
				success: _.bind(function(res) {
					if (res.error) {
						if (callback) callback(new Error(res.error));
						return;
					}

					_.extend(this.attributes, res.user);

					this.trigger('login whoami change');
				}, this),
				error: function() {
					console.error('who-am-i failed');
				}
			});
		}
	},

	forget: function() {
		this.attributes = []
		this.trigger('change')
	},

	login: function(credentials, callback) {
		$.ajax({
			url: '/api/session/create',
			type: 'POST',
			data: credentials,
			success: _.bind(function(res) {
				if (res.error) {
					callback ? callback(new Error(res.error)) : alert('login failed: ' + res.error);
				} else {
					_.extend(this.attributes, res.user);
					callback && callback();
					this.trigger('login change');
				}
			}, this)
		});
	},

	authenticated: function() {
		return !!this.attributes.username;
	},

	logout: function(callback) {
		$.ajax({
			url: '/auth/logout',
			type: 'POST',
			success: _.bind(function(res) {
				if (res.error && callback) callback(new Error(res.error));

				if (callback) callback(null, res);

				this.trigger('logout change');
			}, this),
			error: function() {
				callback && callback(new Error('logout failed'))
				throw new Error('logout failed')
			}
		});

		// Just in case.
		$.cookie('connect.sid', '');
		this.attributes = _.clone(this.defaults);
	}
});