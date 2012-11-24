var Relational = require('backbone-rel')
, Backbone = require('backbone')
, User = require('./User')
, Session = module.exports = Relational.RelationalModel.extend({
	relations: [{
        type: Relational.HasOne,
        key: 'user',
        keySource: 'user_id',
        keyDestination: 'user',
        relatedModel: User
    }],

	initialize: function() {
		if ($.cookie('connect.sid')) {
			$.ajax({
				url: '/api/auth/whoami',
				success: _.bind(function(res) {
					if (res.error) {
						if (callback) callback(new Error(res.error));
						return;
					}

					if (res.user) {
						this.set('user', new User(res.user, { parse: true }))
					}

					console.log('who am i?', this.get('user'))

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

	authenticated: function() {
		return !!this.get('user')
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
})