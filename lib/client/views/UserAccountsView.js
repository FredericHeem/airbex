var SectionView = require('./SectionView')
, _ = require('underscore')
, View = require('./View')
, templates = require('../templates')
, UserAccountsView = module.exports = SectionView.extend({
    ItemView: View.extend({
        tagName: 'tr',

        render: function() {
            var vm = this.model.toJSON();
            vm.availableDecimal = this.model.availableDecimal();

            this.$el.html(templates['accounts-account'](vm));
            return this;
        }
    }),

    section: 'accounts',

    initialize: function() {
        this.collection.on('reset', this.reset, this);
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
        this.$el.html(templates['accounts']())
        this.$children = this.$el.find('table.accounts tbody')
        this.reset()

        return this
    },

    dispose: function() {
        _.invoke(this.views, 'dispose')
        View.prototype.dispose.call(this)
    }
})