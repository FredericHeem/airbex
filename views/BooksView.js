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
            var bs = app.cache.securities.get(this.model.get('base_security').id)
            vm.bid = _.where(vm.depth, { side: 0 })[0] || null;
            vm.ask = _.where(vm.depth, { side: 1 })[0] || null;
            vm.lastDecimal = vm.last ? num(vm.last, vm.scale).toString() : ''
            vm.highDecimal = vm.high ? num(vm.high, vm.scale).toString() : ''
            vm.lowDecimal = vm.low ? num(vm.low, vm.scale).toString() : ''
            vm.volumeDecimal = vm.volume ? num(vm.volume, bs.get('scale') - vm.scale).toString() : ''

            var template = require('../templates/books-book.ejs')
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