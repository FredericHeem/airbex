var debug = require('../../helpers/debug')('register')

function verifyEmailCode(code){
    
    debug('the user is verifying email to complete registration: ', code)

    return api.call('v1/users/verify/' + code, {})
    .then(null, function(err) {
        if (err.name == 'UnknownEmailVerifyCode') {
            debug('trying to recover from unknown code (ignore)')
            alertify.alert(err.message)
            location.hash = '';
            //return $.Deferred().resolve()
            return;
        }

        return err
    })
    .then(function() {
        
        var userKey = $.cookie('register.userKey')
        if (userKey) {
            alertify.alert('Your email has been verified.')
            var email = $.cookie('register.email')
            debug('can auto-login user %s from user key from registration', email)
            $.removeCookie('register.userKey')
            $.removeCookie('register.email')
            return api.loginWithUserKey(email, userKey).then(function(){
                location.hash = '';
            })
        }

        debug('theres no user key. redirecting to login')
        alertify.alert('Your email has been verified, redirecting to login.')
        $.cookie('existingUser', true)
        
        location.hash = '';
    })
    .fail(errors.alertFromXhr)
}

function verifyWithdrawCode(code){
    debug('verifyWithdrawCode ', code)

    return api.call('v1/withdraw/verify/' + code, {})
    .then(null, function(err) {
        if (err.name == 'UnknownEmailVerifyCode') {
            alertify.alert('Invalid or expired withdraw confirmation code')
            return;
        } else {
            //alertify.alert('Error while verifying withdraw confirmation code')
            return err
        }
    })
    .then(function() {
        alertify.alert('Your withdraw has been confirmed.')
        location.hash = '';
    })
    .fail(errors.alertFromXhr)
}
module.exports = function(router, master, authorize) {
    return router
    .add(/^account$/, function() {
        router.go('account/funds', true)
    })
    .add(/^account\/funds$/, function() {
        if (!authorize.user()) return
        master(require('./funds')(), 'account')
    })
    .add(/^account\/vouchers$/, function() {
        if (!authorize.user()) return
        master(require('./vouchers')(), 'account')
    })
    .add(/^account\/activity$/, function() {
        if (!authorize.user()) return
        master(require('./activity')(), 'account')
    })
    .add(/^account\/transactions(?:\/(\d+))?$/, function(skip) {
        if (!authorize.user()) return
        master(require('./transactions')(+skip || 0), 'account')
    })
    .add(/^account\/bankaccounts$/, function() {
        if (!authorize.user()) return
        master(require('./bankaccounts')(), 'account')
    })
    .add(/^account\/bankaccounts\/add$/, function() {
        if (!authorize.user()) return
          master(require('./bankaccounts/add')(), 'account')
    })
    .add(/^([a-z0-9]{20})$/, function(code) {
        verifyEmailCode(code)
    })
    .add(/^withdraw\/([a-z0-9]{20})$/, function(code) {
        verifyWithdrawCode(code)
    })
}
