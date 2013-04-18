var SectionView = require('./SectionView')
, _ = require('underscore')
, View = require('./View')
, moment = require('moment')
, UserTransactionsView = module.exports = SectionView.extend({
    ItemView: View.extend({
        tagName: 'tr',

        render: function() {
            var vm = this.model.toJSON()
            vm.created = moment(vm.created).format('MMMM Do YYYY, HH:mm')
            this.$el.html(require('../templates/user-transactions-transaction.ejs')(vm))
            return this
        }
    }),

    section: 'transactions',

    initialize: function() {
        this.views = [];
        this.bindTo(this.collection, 'add', this.add, this);
        this.bindTo(this.collection, 'reset', this.render, this);
        this.bindTo(this.collection, 'remove', this.remove, this);
    },

    add: function(model) {
        var view = new this.ItemView({ model: model });
        this.views.push(view)
        this.$children.append(view.render().$el)
    },

    reset: function() {
        this.views && _.invoke(this.views, 'dispose')
        this.views = []
        this.collection.each(this.add, this);
    },

    render: function() {
        this.$el.html(require('../templates/user-transactions.ejs')());
        this.$children = this.$el.find('table.transactions tbody')
        this.reset()
        return this
    },

    dispose: function() {
        _.invoke(this.views, 'dispose')
        View.prototype.dispose.call(this)
    }
})
