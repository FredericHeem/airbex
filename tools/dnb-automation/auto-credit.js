// ==UserScript==
// @name       Justcoin AutoCredit
// @namespace  https://justcoin.com
// @version    0.1
// @description  Auto credit from DnB
// @match      https://chrome.google.com/webstore/category/apps?hl=en
// @copyright  2013, Justcoin
// @include https://www.dnb.no/*
// @require https://cdnjs.cloudflare.com/ajax/libs/lodash.js/2.4.0/lodash.min.js
// @require http://code.jquery.com/jquery-1.10.1.min.js
// ==/UserScript==

function click($el) {
  var e = document.createEvent('MouseEvents')
  e.initEvent('click', true, true)
  $el[0].dispatchEvent(e)
}

var innbetListUrl = 'https://www.dnb.no/segb/apps/nbb/innbetaling/innbetalingliste.page'
, innbetUrl = 'https://www.dnb.no/segb/apps/nbb/innbetaling/innbetalingdetaljliste.page'
, endpointUrl = 'https://justcoin.com/api/'
, autoOpenNext = true

function addLegacySkips() {
    var skips = GM_getValue('jac.skipped') || []
    _.each(GM_listValues(), function(key) {
        if (!key.match(/^jac\.skips?\./)) return
        var id = key.match(/\d+/)[0]
        if (!~skips.indexOf(id)) skips.push(id)
        GM_deleteValue(key)
    })
    GM_setValue('jac.skipped', skips)
}

function skipped(id, val) {
    var skipped = GM_getValue('jac.skipped') || []
    if (val !== undefined) {
        if (val && !~skipped.indexOf(id)) {
            skipped.push(id)
        } else if (~skipped.indexOf(id)) {
            skipped.splice(skipped.indexOf(id), 1)
        }
        GM_setValue('jac.skipped', skipped)
    }
    return !!~skipped.indexOf(id)
}

function state(val) {
    if (val !== undefined) {
        console.log('??? JAC state:', GM_getValue('jac.state') || '<none>', '-->', val || '<none>')
        if (val === null) GM_deleteValue('jac.state')
        else GM_setValue('jac.state', val)
    }
    return GM_getValue('jac.state') || null
}

function goToPaymentList() {
    location.href = innbetListUrl
}

function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
}

addLegacySkips()

function processPaymentList() {
    var $lines = $('.sumListTable tbody tr:visible')
    $lines.each(function(i, el) {
        var $line = $(el)
        , id = $line.find('a').attr('href').match(/\d+/)[0]
        $line.attr('data-id', id)
        .addClass('payment-line')
        .toggleClass('is-skipped', skipped(id))
        .toggleClass('is-processed', !$line.find('td:contains("Ikke behandlet")').length)
    })

    return $lines
}

addGlobalStyle('.payment-line.is-skipped>td{background-color:#FFE4B5 !important;}')
addGlobalStyle('.payment-line.is-processed>td{background-color:#87CEEB !important;}')
addGlobalStyle('.payment-line.is-checked>td{background-color:#90EE90 !important;}')

function alertError(err) {
    alert(err.message || err)
}

function xhr(opts) {
    if (!opts.method) opts.method = 'GET'
    console.log('??? xhr opts', opts)
    var d = $.Deferred()
    opts.onload = function(res) {
        if (res.status < 200 || res.status >= 300) {
            return d.reject('http status ' + res.status + '\n' + res.responseText)
        }
        d.resolve(res.responseText ? JSON.parse(res.responseText) : null)
    }
    GM_xmlhttpRequest(opts)
    return d
}

function fetchUserFromTag(tag) {
    return xhr({
        url: endpointUrl + 'admin/users?tag=' + tag
    })
    .then(function(res) {
        if (!res.count) return $.Deferred().reject('not found')
        if (res.count > 1) return $.Deferred().reject('multiple users')
        return res.users[0]
    })
}

if (!location.href.indexOf(innbetListUrl)) {
    processPaymentList()

    $('.payment-line [type="checkbox"]')
    .on('click', function() {
        $(this).closest('tr').toggleClass('is-checked', $(this).prop('checked'))
    })
    .each(function(i, el) {
        $(el).closest('tr').toggleClass('is-checked', $(this).prop('checked'))
    })

    // Always open details in a new window
    unsafeWindow.hoppTilDetaljer = function(id) {
        GM_openInTab('https://www.dnb.no/segb/apps/nbb/innbetaling/innbetalingdetaljliste.page?kontekstId=MCTX19&objId=' + id)
    }

    setInterval(function() {
        var item = popSignal()
        if (!item) return
        console.log('??? pop', item)
        if (item.action == 'check') {
            var $line = $('.payment-line[data-id="' + item.id + '"]')
            .addClass('is-processed')
            if (!$line.length) return alert('Payment #' + item.id + ' not found')
            $line.find('[type="checkbox"]').trigger('click')
        } else if (item.action == 'skip') {
            var $line = $('.payment-line[data-id="' + item.id + '"]')
            if (!$line.length) return alert('Payment #' + item.id + ' not found')
            skipped(item.id, true)
            $line.addClass('is-skipped')
        } else {
            console.log('??? unhandled item', item)
        }

        if (autoOpenNext) {
            $('[data-action="open next"]').trigger('click')
        }
    }, 500)

    createFormsButton('Open next')
    .attr('data-action', 'open next')
    .on('click', function(e) {
        e.preventDefault()
        var $line = $('.payment-line:not(.is-skipped):not(.is-processed)')
        if (!$line.length) return alert('Nothing to do')
        unsafeWindow.hoppTilDetaljer($line.attr('data-id'))
    })
    .insertAfter($('#sokButton'))
}

/*
function popSignal() {
    var queue = GM_getValue('jac.queue') || []
    , result = queue.shift()
    GM_setValue('jac.queue', queue)
    return result || null
}

function pushSignal(what) {
    var queue = GM_getValue('jac.queue') || []
    queue.push(what)
    GM_setValue('jac.queue', queue)
}
*/

if (!GM_getValue('jac.queue')) {
    GM_setValue('jac.queue', '[]')
    console.log('??? reset queue')
} else {
    console.log('??? JAC queue', GM_getValue('jac.queue'))
}

function popSignal() {
    var val = GM_getValue('jac.signal')
    if (val) GM_deleteValue('jac.signal')
    if (val) console.log('??? JAC signal', val)
    return val
}

function pushSignal(item) {
    if (GM_getValue('jac.signal')) {
        return alert('busy signal')
    }

    GM_setValue('jac.signal', item)
    console.log('??? JAC signal in', item)
}

function patchUser(id, attrs, cb) {
    console.log('??? patching user with', attrs)

    return xhr({
        method: 'PATCH',
        url: endpointUrl + 'admin/users/' + id,
        data: JSON.stringify(attrs, null, 4),
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        }
    })
}

function createFormsButton(val) {
    return $('<input type=button class=formsButton value="' + val + '">')
}

// Page: Payment details
if (!location.href.indexOf(innbetUrl)) {
    var innbetId = location.href.match(/objId=(\d+)/)[1]

    console.log('??? JAC Viewing #', innbetId)

    var message = $('pre:last').text().replace(/[^\d]+/g, '')
    , amountCell = $('table.detailsTable td:contains("Beløp:") + td').text()
    , currency = amountCell.match('(NOK|USD|EUR)')[0]
    , amount = amountCell.replace(/\./g, '').replace(/,/, '.').replace(/[^\.\d]+/g, '')
    , reference = $('table.detailsTable td:contains("Arkivref")').next().text() ||
        $('table.detailsTable td:contains("Bankens ref")+*').text()

    createFormsButton('Check')
    .on('click', function(e) {
        e.preventDefault()
        pushSignal({ action: 'check', id: innbetId })
        window.close()
    })
    .prependTo($('#avbrytButton').parent())

    createFormsButton('Skip')
    .on('click', function(e) {
        e.preventDefault()
        pushSignal({ action: 'skip', id: innbetId })
        window.close()
    })
    .prependTo($('#avbrytButton').parent())

    $('#avbrytButton').hide()

    console.log('??? JAC Message:', message)

    fetchUserFromTag(message)
    .then(function(user) {
        console.log('??? user feteched', user)

        var $nameCell = $('table.detailsTable td:contains("Navn:")+td:first')
        , fullName = user.first_name + ' ' + user.last_name
        , containsFirstName = ~$nameCell.text().toLowerCase().indexOf(user.first_name.toLowerCase())
        , containsLastName = ~$nameCell.text().toLowerCase().indexOf(user.last_name.toLowerCase())

        console.log('???', containsFirstName, containsLastName)

        $nameCell.css('background-color', containsFirstName && containsLastName ? '#55ee55' : '#FF8C00')
        $nameCell.append(' (' + _.escape(fullName) + ')')

        var $message = $('pre:last')
        .css('background-color', '#55ee55')

        var jcAddressTmpl = _.template('<tr><td>Justcoin Address:<td><%- _.escape(address).replace("\\n\", "<br>") %><br>' +
            '<%= postal_area %> <%= city %><br><%= country %>')
        , $jcAddress = $(jcAddressTmpl(user))
        $('#Adresse1').closest('tr').after($jcAddress)

        // "Intercom" button
        createFormsButton('Intercom')
        .on('click', function(e) {
            e.preventDefault()
            GM_openInTab('https://www.intercom.io/apps/64463fba8faa8166444bfb3c00a5e40976bd622e/users/show?user_id=' + user.user_id)
        })
        .prependTo($('#avbrytButton').parent())

        // "User" button
        createFormsButton('View User')
        .on('click', function(e) {
            e.preventDefault()
            GM_openInTab('https://justcoin.com/admin/#users/' + user.user_id)
        })
        .prependTo($('#avbrytButton').parent())

        // "Add to Justcoin" button
        createFormsButton('Add to Justcoin')
        .attr('data-action', 'add to justcoin')
        .on('click', function(e) {
            e.preventDefault()

            console.log('??? reference', reference)

            var data = {
                amount: amount,
                currency_id: currency,
                reference: reference,
                user_id: user.user_id
            }

            console.log('??? data', data)

            xhr({
                method: 'POST',
                url: endpointUrl + 'admin/bankCredits',
                data: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                }
            })
            .then(function() {
                pushSignal({ action: 'check', id: innbetId })
                window.close()
            })
            .fail(alertError)
        })
        .prependTo($('#avbrytButton').parent())

        // "Proof of Identity" checkbox
        var $poiRow = $('<tr><td>Proof of Identity<td><input type=checkbox></tr>')
        .insertAfter($jcAddress)
        .find('input')
        .prop('checked', !!user.poi_approved_at)
        .attr('title', user.poi_approved_at ? 'Approved at ' + user.poi_approved_at : 'Not approved')
        .on('click', function(e) {
            var $cb = $(this).prop('disabled', true)
            patchUser(user.user_id, { poi_approved: $(this).prop('checked') })
            .then(function() {
                $cb.prop('disabled', false)
            })
            .fail(alertError)
        })
        .closest('tr')

        // "Proof of Address" checkbox
        var $poiRow = $('<tr><td>Proof of Address<td><input type=checkbox></tr>')
        .insertAfter($poiRow)
        .find('input')
        .prop('checked', !!user.poa_approved_at)
        .attr('title', user.poa_approved_at ? 'Approved at ' + user.poa_approved_at : 'Not approved')
        .on('click', function(e) {
            var $cb = $(this).prop('disabled', true)
            patchUser(user.user_id, { poa_approved: $(this).prop('checked') })
            .then(function() {
                $cb.prop('disabled', false)
            })
            .fail(alertError)
        })
        .closest('tr')

        // Auto complete international payments
        if (currency != 'NOK') {
            $('[data-action="add to justcoin"]').trigger('click')
        }

        // Auto complete domestic if user is poi and poa
        if (user.user.poi_approved_at && user.user.poa_approved_at) {
            $('[data-action="add to justcoin"]').trigger('click')
        }
    })
}
