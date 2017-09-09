;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZnJlZGVyaWMvc25vdy1mcm9udC1haXJiZXgvbGFuZGluZy9wdWJsaWMvYXBwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIi8qIGdsb2JhbCBGaXJlYmFzZSAqL1xuaWYgKHdpbmRvdy5hbmFseXRpY3MpIHtcbiAgICB2YXIgbGFuZyA9ICQoJ2h0bWwnKS5hdHRyKCdsYW5nJylcblxuICAgIHdpbmRvdy5hbmFseXRpY3MucGFnZSgnTGFuZGluZycsIHtcbiAgICAgICAgbGFuZ3VhZ2U6IGxhbmdcbiAgICB9KVxuXG4gICAgYW5hbHl0aWNzLnRyYWNrTGluaygkKCdbaHJlZj1cIi9jbGllbnQvI2F1dGgvbG9naW5cIl0nKSwgJ0NsaWNrZWQgTG9naW4nKVxuICAgIGFuYWx5dGljcy50cmFja0xpbmsoJCgnW2hyZWY9XCIvY2xpZW50LyNhdXRoL3JlZ2lzdGVyXCJdJyksICdDbGlja2VkIFNpZ24gVXAnKVxufVxuXG5mdW5jdGlvbiBudW1iZXJXaXRoQ29tbWFzKHgpIHtcbiAgICB4ID0geC50b1N0cmluZygpO1xuICAgIHZhciBwYXR0ZXJuID0gLygtP1xcZCspKFxcZHszfSkvO1xuICAgIHdoaWxlIChwYXR0ZXJuLnRlc3QoeCkpXG4gICAgICAgIHggPSB4LnJlcGxhY2UocGF0dGVybiwgJyQxICQyJylcbiAgICByZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gc2V0TGFuZ3VhZ2UobGFuZ3VhZ2Upe1xuICAgIHZhciBwYXRoID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lO1xuICAgIHZhciBkYXRlID0gbmV3IERhdGUoKTtcbiAgICBkYXRlLnNldEZ1bGxZZWFyKGRhdGUuZ2V0RnVsbFllYXIoKSArIDEwKTtcbiAgICBpZih3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5kZXhPZihcIi5odG1sXCIpID4gMCl7XG4gICAgXHRyZXR1cm47XG4gICAgfVxuICAgIFxuICAgIGlmIChsYW5ndWFnZSA9PSAnZnItRlInICYmIHBhdGguaW5kZXhPZignL2ZyLycpIDwgMCkge1xuICAgICAgICBkb2N1bWVudC5jb29raWUgPSAnbGFuZ3VhZ2U9ZnItRlI7ZXhwaXJlcz0nICsgZGF0ZS50b0dNVFN0cmluZygpICsgJztwYXRoPS8nO1xuICAgICAgICB3aW5kb3cubG9jYXRpb24gPSAnL2ZyLyc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHBhdGguaW5kZXhPZignL2VuLycpIDwgMCkge1xuICAgICAgICBkb2N1bWVudC5jb29raWUgPSAnbGFuZ3VhZ2U9ZW4tVVM7ZXhwaXJlcz0nICsgZGF0ZS50b0dNVFN0cmluZygpICsgJztwYXRoPS8nO1xuICAgICAgICB3aW5kb3cubG9jYXRpb24gPSAnL2VuLyc7XG4gICAgfVx0XG59XG5cbiQoZnVuY3Rpb24oKSB7XG5cdHNldExhbmd1YWdlKCdlbicpXG5cdFxuICAgIGlmICh3aW5kb3cuRmlyZWJhc2UpIHtcbiAgICAgICAgdmFyIGZpcmViYXNlTmFtZSA9ICdhaXJiZXgtZGV2J1xuXG4gICAgICAgIGlmICh3aW5kb3cuZW52aXJvbm1lbnQgPT0gJ3Byb2R1Y3Rpb24nKSBmaXJlYmFzZU5hbWUgPSAnYWlyYmV4J1xuICAgICAgICBpZiAod2luZG93LmVudmlyb25tZW50ID09ICdzdGFnaW5nJykgZmlyZWJhc2VOYW1lID0gJ2FpcmJleC1zdGFnaW5nJ1xuXG4gICAgICAgIHZhciBmaXJlYmFzZVJlZiA9IG5ldyBGaXJlYmFzZSgnaHR0cHM6Ly8nICsgZmlyZWJhc2VOYW1lICsgJy5maXJlYmFzZUlPLmNvbS8nKVxuXG4gICAgICAgIHZhciBzdGF0cyA9IGZpcmViYXNlUmVmLmNoaWxkKCcvc3RhdHMvdXNlckNvdW50Jyk7XG4gICAgICAgIHN0YXRzLm9uKCd2YWx1ZScsIGZ1bmN0aW9uKHNuYXBzaG90KSB7XG4gICAgICAgICAgICB2YXIgY291bnQgPSBudW1iZXJXaXRoQ29tbWFzKHNuYXBzaG90LnZhbCgpKVxuICAgICAgICAgICAgJCgnLnVzZXItY291bnQnKS50ZXh0KGNvdW50KTtcbiAgICAgICAgICAgICQoJy5jdXN0b21lci1jb3VudCcpLmFuaW1hdGUoe29wYWNpdHk6IDF9LCA1MDApO1xuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgZXhjaGFuZ2VSYXRlcyA9IGZpcmViYXNlUmVmLmNoaWxkKCcvc3RhdHMvZXhjaGFuZ2VSYXRlcycpO1xuICAgICAgICBleGNoYW5nZVJhdGVzLm9uKCd2YWx1ZScsIGZ1bmN0aW9uKHNuYXBzaG90KSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHNuYXBzaG90LnZhbCgpO1xuICAgICAgICAgICAgJCgnI0JUQ05PSycpLnRleHQoZGF0YVsnQlRDTk9LJ10pO1xuICAgICAgICAgICAgJCgnI0JUQ1VTRCcpLnRleHQoZGF0YVsnQlRDVVNEJ10pO1xuICAgICAgICAgICAgJCgnI0JUQ0VVUicpLnRleHQoZGF0YVsnQlRDRVVSJ10pO1xuICAgICAgICAgICAgJCgnZGl2LmV4Y2hhbmdlcmF0ZXMnKS5mYWRlVG8oJ3Nsb3cnLCAxKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgJCgnLmZsYWdzIGFbaHJlZj1cIiNzZXQtbGFuZ3VhZ2VcIl0nKS5jbGljayhmdW5jdGlvbihldmVudCl7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBsYW5ndWFnZSA9ICQodGhpcykuYXR0cignZGF0YS1sYW5ndWFnZScpO1xuICAgICAgICBzZXRMYW5ndWFnZShsYW5ndWFnZSk7XG4gICAgfSk7XG4gICAgXG4gICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywnLm5hdmJhci1jb2xsYXBzZS5pbicsZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiggJChlLnRhcmdldCkuaXMoJ2EnKSApIHtcbiAgICAgICAgICAgICQodGhpcykuY29sbGFwc2UoJ2hpZGUnKTtcbiAgICAgICAgfVxuICAgIH0pO1xufSlcbiJdfQ==
;