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


$(function() {
    $('.customer-count').css('opacity', 0);

    var supportsSvg = function() {
        var e = document.createElement('div');
        e.innerHTML = '<svg></svg>';
        return !!(window.SVGSVGElement && e.firstChild instanceof window.SVGSVGElement);
    };

    if (!supportsSvg())
    {
        $('.header .logo').attr('src', '/justcoin.png');
    }

    if (window.Firebase) {
        var firebaseName = 'justcoin-dev'

        if (window.environment == 'production') firebaseName = 'justcoin'
        if (window.environment == 'staging') firebaseName = 'justcoin-staging'

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
        var path = window.location.pathname;
        var date = new Date();
        date.setFullYear(date.getFullYear() + 10);

        if (language == 'nb-NO' && path != '/no/') {
            document.cookie = 'language=nb-NO;expires=' + date.toGMTString() + ';path=/';
            window.location = '/no/';
        }
        else if (language == 'en-US' && path != '/en/') {
            document.cookie = 'language=en-US;expires=' + date.toGMTString() + ';path=/';
            window.location = '/en/';
        }
    });
})
