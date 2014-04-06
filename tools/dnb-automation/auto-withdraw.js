// ==UserScript==
// @name       Justcoin AutoWithdraw
// @namespace  https://justcoin.com
// @version    0.1
// @description  Auto credit from DnB
// @match      https://chrome.google.com/webstore/category/apps?hl=en
// @copyright  2013, Justcoin
// @include https://www.dnb.no/*
// @require http://code.jquery.com/jquery-1.10.1.min.js
// @require //cdnjs.cloudflare.com/ajax/libs/lodash.js/2.4.0/lodash.min.js
// ==/UserScript==

var sepaCountries = 'AL,AD,BE,BA,BG,DK,EE,FI,FR,FO,GI,GL,GG,GR,IE,IS,IM,IT,JE,HR,CY,LV,LI,LT,LU,MK,MT,MU,MC,ME,NL,NO,PL,PT,RO,SM,RS,SK,SI,ES,GB,CH,SE,CZ,TN,TR,DE,HU,AT'.split(',')
, domesticRegisterUrl = 'https://www.dnb.no/segb/apps/nbb/betalinginnland/betalingmottaker.registrer'
, sepaRegisterUrl = 'https://www.dnb.no/segb/apps/nbb/betalingutland/lavprisoppdragdetaljutland.page'
, intRegisterUrl = 'https://www.dnb.no/segb/apps/nbb/betalingutland/standardoppdragdetaljutland.page'
, endpoint = 'https://justcoin.com/api/'
, domesticConfirmUrl = 'https://www.dnb.no/segb/apps/nbb/betalinginnland/betalingmottaker.confirm'
, sepaConfirmUrl = 'https://www.dnb.no/segb/apps/nbb/betalingutland/lavprisoppdragdetaljutland.confirm'
, intConfirmUrl = 'https://www.dnb.no/segb/apps/nbb/betalingutland/standardoppdragdetaljutland.confirm'
, authorizeUrl = 'https://www.dnb.no/segb/apps/nbb/autorisasjon/autorisasjon.soek?segment=segb'
, justcoinAccount = {
    EUR: '12506115084;DNBANOKK',
    USD: '12500506111;DNBANOKK',
    NOK: '15033659595;DNBANOKK'
}
, autoRegister = true
, justcoinDomesticNokAccount = '1503.36.59595'
, fees = {
    domestic: {
        NOK: 10
    },
    sepa: {
        NOK: 30,
        EUR: 5,
        USD: 6
    },
    intl: {
        NOK: 60,
        EUR: 10,
        USD: 12
    }
}
, mock = false

function popAndProcess() {
    popWithdrawRequest()
    .then(function(req) {
        if (!req) {
            state('drained')
            location.href = authorizeUrl
            return
        }

        state('popped')

        console.log('??? finding full request')

        return xhr({
            method: 'GET',
            url: endpoint + 'admin/withdraws/' + req.id
        })
        .then(function(req) {
            console.log('??? full request', req)

            console.log(req.bankSwiftbic)

            if (!req.bankSwiftbic) {
                if (req.currency != 'NOK') {
                    return alert('can not send ' + req.currency + ' to domestic')
                }

                GM_setValue('jaw.req', req)
                state('waiting to fill domestic')
                location.href = domesticRegisterUrl
                return
            }

            if (req.bankIban) {
                var countryCodeMatch = req.bankIban.match(/^[A-Z]{2}/)
                if (!countryCodeMatch) return alert('IBAN is invalid: ' + req.bankIban)
                console.log('??? country code of iban', countryCodeMatch[0])
                var isSepa = !!~sepaCountries.indexOf(countryCodeMatch[0])
                console.log('??? sepa?', isSepa)

                if (isSepa) {
                    if (!req.bankForceSwift) {
                        GM_setValue('jaw.req', req)
                        state('waiting to fill sepa')
                        location.href = sepaRegisterUrl
                        return
                    } else {
                        console.log('??? forcing swift instead of sepa')
                    }
                }
            }


            GM_setValue('jaw.req', req)
            state('waiting to fill int')
            location.href = intRegisterUrl
            return
        })
    })
}

function alertError(err) {
    alert(err.message || err)
}

function xhr(opts) {
    var d = $.Deferred()
    opts.onload = function(res) {
        if (res.status < 200 || res.status >= 300) {
            return d.reject('http status ' + res.status)
        }
        d.resolve(res.responseText ? JSON.parse(res.responseText) : null)
    }
    GM_xmlhttpRequest(opts)
    return d
}

function fetchWithdrawRequests() {
    return xhr({
        method: 'GET',
        url: endpoint + 'admin/withdraws?activeOnly=1'
    })
}

function mockPopWithdrawRequest() {
    console.log('??? fetching')
    var ignores = GM_getValue('jaw.mock ignores') || []
    return fetchWithdrawRequests()
    .then(function(reqs) {
        console.log('??? fetched', reqs.length)
        reqs = reqs.filter(function(req) {
            return req.state == 'requested' &&
                req.method == 'bank' &&
                !~ignores.indexOf(req.id)
        })
        if (!reqs.length) return null
        console.log('??? popping (MOCK)', reqs[0].id)
        ignores.push(reqs[0].id)
        GM_setValue('jaw.mock ignores', ignores)
        return reqs[0]
    })
}

function popWithdrawRequest() {
    if (mock) return mockPopWithdrawRequest()

    console.log('??? fetching')
    return fetchWithdrawRequests()
    .then(function(reqs) {
        console.log('??? fetched', reqs.length)
        reqs = reqs.filter(function(req) {
            return req.state == 'requested' &&
                req.method == 'bank'
        })
        if (!reqs.length) return null
        console.log('??? popping', reqs[0].id)
        return xhr({
            method: 'PATCH',
            url: endpoint + 'admin/withdraws/' + reqs[0].id,
            data: JSON.stringify({ state: 'processing' }, null, 4),
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            }
        })
        .then(function() {
            return reqs[0]
        })
    })
}

function toNorwayDate(d) {
    function zeroPad(x) {
        return (x.length < 2 ? '0' : '') + x
    }

    console.log('??? d', d, d.getDay())

    return [
        zeroPad(d.getDate().toString()),
        zeroPad((d.getMonth() + 1).toString()),
        d.getFullYear()
    ].join('.')
}

function fillDomesticPaymentForm(req) {
    // Choose the client account in the dropdown
    $('#FraKontoNr').val(justcoinDomesticNokAccount)

    // Amount (but with comma as decimal separator)
    var amount = (req.amount - fees.domestic.NOK).toString()

    // Strip trailing zeroes after decmial point
    amount = amount.replace(/\.0*$/, '')

    // Use comma as decimal separator
    amount = amount.replace(/\./, ',')

    $('#Beloep').val(amount)

    $('#TilKontoNr').val(req.bankAccountNumber)

    // Enable 'strukturert melding'
    $('#kidmelding').trigger('click')

    // Invoice date
    $('#FakturaDato').val(toNorwayDate(new Date(req.createdAt)))

    // Invoice number
    $('#FakturaNr').val(req.id)

    // Customer number
    $('#KundeNr').val(req.userId)

    // Our reference
    $('#Egenreferanse').val(req.userId + '/' + req.id)

    console.log('??? fetching user')

    return xhr({
        method: 'GET',
        url: endpoint + 'admin/users/' + req.userId
    })
    .then(function(user) {
        console.log('??? fetched user', user)

        $('#TilNavn').val(user.first_name + ' ' + user.last_name)
        $('#TilAdresse1').val(user.address.split('\n')[0])
        $('#TilAdresse2').val(user.address.split('\n')[1] || '')
        $('#Postnummer').val(user.postal_area).trigger('change')

        var d = $.Deferred()
        , timer = setInterval(function() {
            if (!$('#Poststed').val()) return
            clearInterval(timer)
            d.resolve()
        }, 25)

        return d
    })
}

function registerDomestic(req) {
    return fillDomesticPaymentForm(req)
    .then(function() {
        if (!autoRegister) return
        state('registered domestic')
        $('#registrereButton').trigger('click')
    })
}

function registerSepa(req) {
    return fillSepaPaymentForm(req)
    .then(function() {
        if (!autoRegister) return
        state('registered sepa')
        $('#registrereButton').trigger('click')
    })
}

function registerInt(req) {
    return fillIntPaymentForm(req)
    .then(function() {
        if (!autoRegister) return
        state('registered int')
        $('#registrereButton').trigger('click')
    })
}

function state(x) {
    if (x !== undefined) {
        GM_setValue('jaw.state', x)
        console.log('??? state -->', x)
    }
    return GM_getValue('jaw.state')
}

console.log('??? state', state())

function fillSepaPaymentForm(req) {
    console.log('??? fill sepa', req)

    var ourAccount =

    // Choose the client account in the dropdown
    $('#FraKontoNr').val(justcoinAccount[req.currency]).trigger('change')

    // Select the same as the send invoice amount
    $('#FakturaValuta').val(req.currency).trigger('change')

    // Credit/send currency
    $('#KredValuta').val('EUR').trigger('change')

    // Amount (but with comma as decimal separator)
    var amount = (req.amount - fees.sepa[req.currency]).toString()

    // Strip trailing zeroes after decmial point
    amount = amount.replace(/\.0*$/, '')

    // Use comma as decimal separator
    amount = amount.replace(/\./, ',')

    $('#Beloep').val(amount).trigger('change')

    // Extract account from destination
    $('#TilKontoNr').val(req.bankIban).trigger('change')

    // Customer number
    $('#LeverandoerNr')
    .val(req.userId)
    .attr('lastleverandoernr', req.userId)
    .trigger('change')

    // Destination SWIFT
    $('#TilSwiftAdresse').val(req.bankSwiftbic).trigger('change')

    // Save the recipient
    $('#Lagre').trigger('click')

    console.log('??? fetching user')

    return xhr({
        method: 'GET',
        url: endpoint + 'admin/users/' + req.userId
    })
    .then(function(user) {
        console.log('??? fetched user', user)

        $('#TilNavn').val(user.first_name + ' ' + user.last_name).trigger('change')
        $('#TilAdresse1').val(user.address.split('\n')[0]).trigger('change')
        $('#TilAdresse2').val(user.address.split('\n')[1] || '').trigger('change')
        $('#TilAdresse3').val(user.postal_area + ' ' + user.city).trigger('change')
        $('#TilLand').val(user.country).trigger('change')

        // Our reference
        $('#Egenreferanse').val(req.userId + '/' + req.id).trigger('change')
    })
}

function fillIntPaymentForm(req) {
    console.log('??? fill int', req)

    // Choose the client account in the dropdown
    $('#FraKontoNr').val(justcoinAccount[req.currency]).trigger('change')

    // Select the send invoice amount
    $('#FakturaValuta').val(req.currency).trigger('change')

    // Credit/send currency
    $('#KredValuta').val(req.currency).trigger('change')

    // Amount (but with comma as decimal separator)
    var amount = (req.amount - fees['intl'][req.currency]).toString()

    // Strip trailing zeroes after decmial point
    amount = amount.replace(/\.0*$/, '')

    // Use comma as decimal separator
    amount = amount.replace(/\./, ',')

    $('#Beloep').val(amount)

    // Extract account from destination
    $('#TilKontoNr').val(req.bankIban || req.bankAccountNumber).trigger('change')

    // Customer number
    $('#LeverandoerNr')
    .val(req.userId.toString())
    .trigger('blur')
    .trigger('change')

    // Destination SWIFT
    $('#TilSwiftAdresse').val(req.bankSwiftbic).trigger('change')

    // Save the recipient
    $('#Lagre').trigger('click')

    console.log('??? fetching user')

    return xhr({
        method: 'GET',
        url: endpoint + 'admin/users/' + req.userId
    })
    .then(function(user) {
        console.log('??? fetched user', user)

        $('#TilNavn').val(user.first_name + ' ' + user.last_name)
        $('#TilAdresse1').val(user.address.split('\n')[0])
        $('#TilAdresse2').val(user.address.split('\n')[1] || '')
        $('#TilAdresse3').val(user.postal_area + ' ' + user.city).trigger('change')
        $('#TilLand').val(user.country).trigger('change')

        // Our reference
        $('#Egenreferanse').val(req.userId + '/' + req.id)
    })
}
var $justcoinNav = $('<dl><dt>Justcoin</dt></dl>')
.appendTo('#gomitc4x .mainMenuContentWrapperBottom')

var $startAutoWithdraw = $('<dd><a href="#">Start Auto-Withdraw</a></dd>')
.appendTo($justcoinNav)
.on('click', function(e) {
    e.preventDefault()
    state('')
    popAndProcess()
})

// Forget mock ignores (testing)
$('<dd><a href="#">Forget Ignores</a></dd>')
.appendTo($justcoinNav)
.on('click', function(e) {
    e.preventDefault()
    GM_deleteValue('jaw.mock ignores')
    alert('OK!')
})

fetchWithdrawRequests()
.then(function(reqs) {
    var count = reqs.filter(function(req) {
        return req.method == 'bank' && req.state == 'requested'
    }).length

    $startAutoWithdraw.find('a').text('Start Auto-Withdraw (' + count + ')')
})
.fail(alertError)


// At the confirmation page, pop another request
if ((~location.href.indexOf(domesticConfirmUrl) && state() == 'registered domestic') ||
    (~location.href.indexOf(sepaConfirmUrl) && state() == 'registered sepa') ||
    (~location.href.indexOf(intConfirmUrl) && state() == 'registered int'))
{
    popAndProcess()
}

if (~location.href.indexOf(domesticRegisterUrl)) {
    if (state() == 'waiting to fill domestic') {
        return registerDomestic(GM_getValue('jaw.req'))
    }
}

if (~location.href.indexOf(sepaRegisterUrl)) {
    if (state() == 'waiting to fill sepa') {
        return registerSepa(GM_getValue('jaw.req'))
    }
}

if (~location.href.indexOf(intRegisterUrl)) {
    if (state() == 'waiting to fill int') {
        return registerInt(GM_getValue('jaw.req'))
    }
}
