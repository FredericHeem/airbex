var View = require('./View')
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
        this.model = new Backbone.Model({
            market: options.market.id,
            side: 'bid',
            price: '',
            volume: ''
        })

        this.model.on('change', this.updateSummary, this)
        this.model.on('change:side', this.updateSide, this)

        var vm = _.extend({
            base_currency: options.market.base(),
            quote_currency: options.market.quote()
        }, this.model.toJSON())

        this.$el.html(require('../templates/create-order.ejs')(vm))
    },

    placeOrder: function() {
        var that = this

        this.$el.find('.summary').html('Placing order...')

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
            (this.model.get('side').toUpperCase()),
            this.model.get('volume'),
            this.options.market.base(),
            '@',
            this.model.get('price'),
            this.options.market.quote()
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
        , side = $target.parent().hasClass('bid') ? 'bid' : 'ask'
        this.model.set('side', side)
        this.$el.find('.volume label').html('Amount to ' + (side == 'ask' ? 'sell' : 'buy'))
    },

    updateSide: function() {
        var $side = this.$el.find('.side')
        , side = this.model.get('side')
        $side.find('.bid').toggleClass('active', side === 'bid')
        $side.find('.ask').toggleClass('active', side === 'ask')
    },

    updateSummary: function() {
        var summary
        , total
        , format = '0,0[.0][0][0][0][0][0][0][0][0]'

        // TODO: validate precision of price and volume

        if (this.model.get('price') && this.model.get('volume')) {
            total = +num(this.model.get('price')).mul(this.model.get('volume'))
            summary = util.format(
                'You are %s %s %s for %s %s',
                this.model.get('side') == 'ask' ? 'selling' : 'buying',
                this.model.get('volume'),
                this.options.market.base(),
                numeral(total).format(format),
                this.options.market.quote())
        }

        this.$el.find('.summary').html(summary || '')
        this.$el.find('.total input').val(total ? numeral(total).format(format) : '')
    },

    render: function() {
        return this;
    }
})
