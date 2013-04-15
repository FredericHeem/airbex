var View = require('./View')
, Models = require('../models')
, app = require('../app')
, Backbone = require('backbone')
, num = require('num')
, Section = require('./SectionView')
, _ = require('underscore')
, CreateOrderView = module.exports = Section.extend({
    initialize: function() {
        _.bindAll(this);

        this.$el.html(require('../templates/create-order.ejs')());
        this.$bid = this.$el.find('button[data-action="bid"]');
        this.$ask = this.$el.find('button[data-action="ask"]');
        this.$explanation = this.$el.find('.explanation');
        this.$price = this.$el.find('.price');
        this.$volume = this.$el.find('.volume');
        this.$placeOrder = this.$el.find('*[data-action="place-order"]');
        this.$cancel = this.$el.find('*[data-action="cancel"]');

        if (!this.model) {
            this.model = new Models.Order({
                price: null,
                volume: null,
                side: 0
            });
        }

        this.model.on('change', this.update);
    },

    section: 'orders',

    events: {
        'click button[data-action="bid"]': 'clickBid',
        'click button[data-action="ask"]': 'clickAsk',
        'keyup .price': 'changePrice',
        'keyup .volume': 'changeVolume',
        'click *[data-action="place-order"]': 'placeOrder',
        'click *[data-action="cancel"]': 'cancel'
    },

    placeOrder: function() {
        console.log('placing order');

        if (!this.model.isNew()) {
            throw new Error('orders can not be updated');
        }

        this.$bid.prop('disabled', true);
        this.$ask.prop('disabled', true);
        this.$price.prop('disabled', true);
        this.$volume.prop('disabled', true);
        this.$cancel.addClass('disabled').prop('disabled', true);
        this.$placeOrder.addClass('disabled').prop('disabled', true);
        this.$explanation.html('Placing order...');

        this.options.book.get('orders').add(this.model);

        if (!this.model.get('book')) {
            throw new Error('reverse relation is not working');
        }

        console.log('order being placed', this.model.attributes);

        this.model.save({}, {
            url: app.api.url + '/orders',
            headers: app.api.headers(this.model.toJSON()),
            error: function(e) {
                alert('Order could not be placed: ' + e.message);
            },

            success: _.bind(function(res) {
                var summary = [
                    'Order #' + this.model.id,
                    (this.model.get('side') ? 'ASK' : 'BID'),
                    this.model.volumeDecimal(),
                    this.model.get('book').get('base_security').id,
                    '@',
                    this.model.priceDecimal(),
                    this.model.get('book').get('quote_security').id
                ].join(' ')

                alertify.success('Order placed<br>' + summary)

                console.log('order has been placed', res);
                Backbone.history.navigate('/my/orders', true);
            }, this)
        });
    },

    cancel: function() {
        this.trigger('cancel');
    },

    changeVolume: function() {
        var baseScale = this.options.book.get('base_security').get('scale');
        var bookScale = this.options.book.get('scale');
        var volumeScale = baseScale - bookScale;

        var volumeDecimal = +this.$volume.val();

        if (!_.isNumber(volumeDecimal)) {
            this.model.set('volume', null);
            return;
        }

        var volume = Math.floor(+num(volumeDecimal).mul(Math.pow(10, volumeScale)));
        this.model.set('volume', volume);
    },

    changePrice: function() {
        var baseScale = this.options.book.get('base_security').get('scale');
        var bookScale = this.options.book.get('scale');
        var volumeScale = baseScale - bookScale;

        var priceDecimal = +this.$price.val();

        if (!_.isNumber(priceDecimal)) {
            this.model.set('volume', null);
            return;
        }

        var price = Math.floor(+num(priceDecimal).mul(Math.pow(10, bookScale)));
        this.model.set('price', price);
    },

    clickBid: function(e) {
        this.model.set('side', 0);
    },

    clickAsk: function(e) {
        this.model.set('side', 1);
    },

    update: function() {
        var explanation;

        if (this.model.get('price') && this.model.get('volume')) {
            var baseScale = this.options.book.get('base_security').get('scale');
            var bookScale = this.options.book.get('scale');
            var volumeScale = baseScale - bookScale;
            var quotePrice = num(this.model.get('volume'), volumeScale).mul(num(this.model.get('price'), bookScale));
            var volumeDecimal = num(this.model.get('volume'), volumeScale);

            if (this.$bid.hasClass('active')) {
                explanation = 'You are buying ' +
                    +volumeDecimal + ' ' +
                    this.options.book.get('base_security').id + ' for ' +
                    +quotePrice + ' ' +
                    this.options.book.get('quote_security').id;
            } else {
                explanation = 'You are selling ' +
                    +volumeDecimal + ' ' +
                    this.options.book.get('base_security').id + ' for ' +
                    +quotePrice + ' ' +
                    this.options.book.get('quote_security').id;
            }
        }

        this.$bid.toggleClass('active', this.model.get('side') == 0);
        this.$ask.toggleClass('active', this.model.get('side') == 1);

        this.$explanation.html(explanation);
    },

    render: function() {
        var baseScale = this.options.book.get('base_security').get('scale');
        var bookScale = this.options.book.get('scale');
        var volumeScale = baseScale - bookScale;

        this.$el.find('.base-security').html(this.options.book.get('base_security').id);
        this.$price.val(this.model.get('price') ? num(this.model.get('price'), bookScale) : '');
        this.$volume.val(this.model.get('volume') ? num(this.model.get('volume'), volumeScale) : '');

        this.update();

        return this;
    }
});