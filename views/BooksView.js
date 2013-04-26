var SectionView = require('./SectionView')
, _ = require('underscore')
, num = require('num')
, app = require('../app')
, View = require('./View')
, BooksView = module.exports = SectionView.extend({
    ItemView: View.extend({
        tagName: 'tr',

        render: function() {
            var vm = this.model.toJSON()
            , template = require('../templates/books-book.ejs')
            this.$el.html(template(vm));

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
        this.$el.html(require('../templates/books.ejs')());
        this.reset();

        return this;
    },

    dispose: function() {
        _.invoke(this.items, 'dispose');

        return View.prototype.dispose.apply(this, arguments);
    }
});