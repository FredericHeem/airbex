var debug = require('./debug')('snow:intercom')
, timer
, tries = 0

function look() {
    var $widget = $('#IntercomDefaultWidget')
    if (!$widget.length) {
        debug('could not find the intercom widget')
        if (++tries > 10) return debug('giving up on finding the widsget')
        timer = setTimeout(look, 500)
        return
    }
    debug('found the intercom widget!')
    var landingLanguage = i18n.desired && i18n.desired.match(/no/i) ? 'no' : 'en'
    $widget.on('click', function() {
        var $container = $('#IntercomNewMessageContainer')
        $container.find('h1').html(i18n('intercom.compose.header'))
        .find('a')
        .attr('href', '/' + landingLanguage + '/faq')
        .css({
            display: 'inline',
            position: 'static',
            color: '#222299',
            'font-weight': 'bold'
        })

        $container.find('textarea')
        .attr('placeholder', i18n('intercom.compose.placeholder'))
        .css('background-color', '#FFFFFF')
    })
}

debug('starting timer to find intercom widget')

look()
