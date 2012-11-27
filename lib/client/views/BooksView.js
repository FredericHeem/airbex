var SectionView = require('./SectionView')
, _ = require('underscore')
, View = require('./View')
, templates = require('../templates')
, BooksView = module.exports = SectionView.extend({
    ItemView: View.extend({
        tagName: 'tr',

        render: function() {
            var vm = this.model.toJSON();
            vm.bid = _.where(vm.depth, { side: 0 })[0] || null;
            vm.ask = _.where(vm.depth, { side: 1 })[0] || null;

            this.$el.html(templates('books-book')(vm));

            return this;
        }
    }),

    section: 'books',

    initialize: function() {
        this.bindTo(this.collection, 'reset', this.reset, this);
        this.bindTo(this.collection, 'add', this.add, this);
    },

    add: function(model) {
        var view = new this.ItemView({ model: model });
        this.items.push(view);
        this.$el.find('table.books tbody').append(view.render().$el);
    },

    reset: function() {
        _.invoke(this.items, 'dispose');
        this.items = []
        this.$el.find('table.books tbody').empty()
        this.collection.each(this.add, this)
    },

    render: function() {
        this.$el.html(templates('books')());
        this.reset();

        return this;
    },

    dispose: function() {
        _.invoke(this.items, 'dispose');

        return View.prototype.dispose.apply(this, arguments);
    }
});