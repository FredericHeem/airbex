/* global Firebase */
if (window.analytics) {
    var lang = $('html').attr('lang')

    window.analytics.page('Landing', {
        language: lang
    })

    analytics.trackLink($('[href="/client/#auth/login"]'), 'Clicked Login')
    analytics.trackLink($('[href="/client/#auth/register"]'), 'Clicked Sign Up')
}

function numberWithCommas(x) {
    x = x.toString();
    var pattern = /(-?\d+)(\d{3})/;
    while (pattern.test(x))
        x = x.replace(pattern, '$1 $2')
    return x;
}

function setLanguage(language){
    var path = window.location.pathname;
    var date = new Date();
    date.setFullYear(date.getFullYear() + 10);
    if(window.location.pathname.indexOf(".html") > 0){
    	return;
    }
    
    if (language == 'fr-FR' && path.indexOf('/fr/') < 0) {
        document.cookie = 'language=fr-FR;expires=' + date.toGMTString() + ';path=/';
        window.location = '/fr/';
    }
    else if (path.indexOf('/en/') < 0) {
        document.cookie = 'language=en-US;expires=' + date.toGMTString() + ';path=/';
        window.location = '/en/';
    }	
}

$(function() {
	setLanguage('en')
	
    if (window.Firebase) {
        var firebaseName = 'airbex-dev'

        if (window.environment == 'production') firebaseName = 'airbex'
        if (window.environment == 'staging') firebaseName = 'airbex-staging'

        var firebaseRef = new Firebase('https://' + firebaseName + '.firebaseIO.com/')

        var stats = firebaseRef.child('/stats/userCount');
        stats.on('value', function(snapshot) {
            var count = numberWithCommas(snapshot.val())
            $('.user-count').text(count);
            $('.customer-count').animate({opacity: 1}, 500);
        });

        var exchangeRates = firebaseRef.child('/stats/exchangeRates');
        exchangeRates.on('value', function(snapshot) {
            var data = snapshot.val();
            $('#BTCNOK').text(data['BTCNOK']);
            $('#BTCUSD').text(data['BTCUSD']);
            $('#BTCEUR').text(data['BTCEUR']);
            $('div.exchangerates').fadeTo('slow', 1);
        });
    }

    $('.flags a[href="#set-language"]').click(function(event){
        event.preventDefault();
        var language = $(this).attr('data-language');
        setLanguage(language);
    });
    
    $(document).on('click','.navbar-collapse.in',function(e) {
        if( $(e.target).is('a') ) {
            $(this).collapse('hide');
        }
    });
})
