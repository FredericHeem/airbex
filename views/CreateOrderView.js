var View = require('./View')
, Models = require('../models')
, app = require('../app')
, Backbone = require('backbone')
, num = require('num')
, numeral = require('numeral')
, View = require('./View')
, util = require('util')
, _ = require('underscore')
, CreateOrderView = module.exports = View.extend({
    className: 'create-order',

    events: {
        'click .side a': 'toggleSide',
        'keyup .price input': 'changePrice',
        'keyup .volume input': 'changeVolume',
        'click button.submit': 'placeOrder'
    },

    initialize: function(options) {
        this.model = new Models.Order({
            book: options.book,
            side: 0,
            price: '',
            volume: ''
        })

        this.model.on('change', this.updateSummary, this)
        this.model.on('change:side', this.updateSide, this)

        var vm = _.extend({
            base_security: options.book.get('base_security').id,
            quote_security: options.book.get('quote_security').id
        }, this.model.toJSON())

        this.$el.html(require('../templates/create-order.ejs')(vm))
    },

    toggleInteraction: function(value) {
        this.$el.find('input, button')
        .toggleClass('disabled', !value)
        .prop('disabled', !value)
    },

    placeOrder: function() {
        var that = this

        this.$el.find('.summary').html('Placing order...')
        this.options.book.get('orders').add(this.model)

        console.log('order being placed', this.model.attributes);

        var result = this.model.save({}, {
            url: app.apiUrl + '/orders',
            username: 'api',
            password: app.apiKey
        })

        if (!result) {
            return alert(this.model.validationError)
        }

        this.toggleInteraction(false)

        result.then(function() {
            Alertify.log.success('Order placed<br>' + that.orderSummary())
            Backbone.history.navigate('/my/orders', true);
        }, function(xhr) {
            var error = app.errorFromXhr(xhr)
            alert(JSON.stringify(error, null, 4))
            that.toggleInteraction(true)
        })
    },

    orderSummary: function() {
        return [
            'Order #' + this.model.id,
            (this.model.get('side') ? 'ASK' : 'BID'),
            this.model.get('volume'),
            this.model.get('book').get('base_security').id,
            '@',
            this.model.get('price'),
            this.model.get('book').get('quote_security').id
        ].join(' ')
    },

    changeVolume: function() {
        var value = this.$el.find('.volume input').val()
        , valid = +value > 0
        this.model.set('volume', valid ? value : null)
    },

    changePrice: function() {
        var value = this.$el.find('.price input').val()
        , valid = +value > 0
        this.model.set('price', valid ? value : null)
    },

    toggleSide: function(e) {
        e.preventDefault()
        var $target = $(e.target)
        , side = $target.parent().hasClass('bid') ? 0 : 1
        this.model.set('side', side)
        this.$el.find('.volume label').html('Amount to ' + (side ? 'sell' : 'buy'))
    },

    updateSide: function() {
        var $side = this.$el.find('.side')
        , side = this.model.get('side')
        $side.find('.bid').toggleClass('active', side === 0)
        $side.find('.ask').toggleClass('active', side === 1)
    },

    updateSummary: function() {
        var summary
        , total
        , format = '0,0[.0][0][0][0][0][0][0][0][0]'

        // TODO: validate precision of price and volume

        if (this.model.get('price') && this.model.get('volume')) {
            total = +num(this.model.get('price')).mul(this.model.get('volume'))
            console.log('total', total)
            summary = util.format(
                'You are %s %s %s for %s %s',
                this.model.get('side') ? 'selling' : 'buying',
                this.model.get('volume'),
                this.model.get('book').get('base_security').id,
                numeral(total).format(format),
                this.model.get('book').get('quote_security').id)
        }

        this.$el.find('.summary').html(summary || '')
        this.$el.find('.total input').val(total ? numeral(total).format(format) : '')
    },

    render: function() {
        return this;
    }
})
