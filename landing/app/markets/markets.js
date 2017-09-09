var template = require('./markets.html')
var rowTemplate = require('./market-row.html')

var MarketsView = function(){
    var $el = $('#markets').html(template())
    var $markets_tbody = $el.find(".markets-tbody");
    var $alert_markets = $el.find("#alert-markets");
    
    this.renderError = function (error) {
        $markets_tbody.empty();
        $alert_markets.html(error.message);
        $alert_markets.show();
    }
    
    this.render = function (markets) {
        $alert_markets.hide();
        $markets_tbody.empty();
        $("#alert-markets").hide()

        $markets_tbody.html($.map(markets, function(market) {
            return rowTemplate({market:market})
        }))
    }
};

var MarketsController = function(app, eventEmitter){
    var view = new MarketsView();
    var model = {}
    var me = this;
    eventEmitter.addListener('connected', onConnected.bind(this));
    
    function onConnected(){
        app.getApi().getMarkets()
        .then(function(markets){
            me.setModel(markets);
            eventEmitter.emit('markets', markets)
        })
        .fail(function(error){
            view.renderError(error);
        })
    }
    
    this.setModel = function (markets){
        model = markets;
        view.render(markets);
    }
}

module.exports = MarketsController;