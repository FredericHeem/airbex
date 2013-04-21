var SectionView = require('./SectionView')
, _ = require('underscore')
, app = require('../app')
, View = require('./View')
, UserOrdersView = module.exports = SectionView.extend({
    ItemView: View.extend({
        tagName: 'tr',

        events: {
            'click *[data-action="cancel-order"]': 'clickCancelOrder'
        },

        clickCancelOrder: function(e) {
            var self = this
            e.preventDefault();

            this.$el.find('*[data-action="cancel-order"]').prop('disabled', true).addClass('disabled');

            this.model.destroy({
                wait: true,
                url: app.apiUrl + '/orders/' + self.model.id,
                headers: app.apiHeaders(),
                success: function() {
                    Alertify.log.success('Order #' + self.model.id + ' deleted')
                }
            });
        },

        render: function() {
            var vm = this.model.toJSON();
            vm.pair = this.model.get('book').pair()
            vm.base = this.model.get('book').get('base_security').id
            vm.priceDecimal = this.model.priceDecimal();
            vm.volumeDecimal = this.model.volumeDecimal();
            vm.originalDecimal = this.model.originalDecimal();
            vm.matchedDecimal = this.model.matchedDecimal();
            vm.cancelledDecimal = this.model.cancelledDecimal();

            this.$el.html(require('../templates/user-orders-order.ejs')(vm));

            return this;
        }
    }),

    section: 'orders',

    className: 'user-orders section container',

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

    remove: function(model) {
        var view = _.where(this.views, { model: model })[0]
        this.views.slice(this.views.indexOf(view), 0, 1)

        view.$el.fadeOut(function() {
            view.dispose()
        })
    },

    reset: function() {
        this.views && _.invoke(this.views, 'dispose')
        this.views = []
        this.collection.each(this.add, this);
    },

    render: function() {
        this.$el.html(require('../templates/user-orders.ejs')());
        this.$children = this.$el.find('table.orders tbody')
        this.reset()
        return this
    },

    dispose: function() {
        _.invoke(this.views, 'dispose')
        View.prototype.dispose.call(this)
    }
});