var Backbone = require('backbone')
, SectionView = require('./SectionView')
, _ = require('underscore')
, View = require('./View')
, app = require('../app')
, UserAccountsView = module.exports = SectionView.extend({
    ItemView: View.extend({
        tagName: 'tr',

        render: function() {
            var vm = this.model.toJSON();
            vm.rippleAddress = app.rippleAddress
            vm.userId = app.user.id
            this.$el.html(require('../assets/templates/accounts-account.ejs')(vm))
            return this;
        }
    }),

    section: 'accounts',

    initialize: function() {
        this.views = []
        this.collection.on('reset', this.reset, this);
        this.collection.on('add', this.add, this);
    },

    add: function(model) {
        var view = new this.ItemView({ model: model })
        this.views.push(view)
        this.$children.append(view.render().$el)
    },

    reset: function() {
        _.invoke(this.views, 'dispose')
        this.views = []
        this.collection.each(this.add, this)
    },

    render: function() {
        this.$el.html(require('../assets/templates/accounts.ejs')())
        this.$children = this.$el.find('table.accounts tbody')
        this.reset()

        return this
    },

    dispose: function() {
        _.invoke(this.views, 'dispose')
        View.prototype.dispose.call(this)
    }
})
