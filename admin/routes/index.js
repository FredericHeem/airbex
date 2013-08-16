var balances = require('../controllers/balances')
, users = require('../controllers/users')
, adminUser = require('../controllers/user')
, withdraws = require('../controllers/withdraws')
, transactions = require('../controllers/transactions')
, userBankAccounts = require('../controllers/user/bankaccounts')
, userWithdraws = require('../controllers/user/withdraws')
, userAccounts = require('../controllers/user/accounts')
, userActivity = require('../controllers/user/activity')
, userOrders = require('../controllers/user/orders')
, userBankCredit = require('../controllers/user/bankcredit')
, overview = require('../controllers/overview')
, authorize = require('../authorize')
, master = require('../controllers/master')
, master = require('../controllers/master')
, login = require('../controllers/login')
, notfound = require('../controllers/notfound')
, authorize = require('../authorize')

module.exports = function() {
    router
    .add(/^$/, function() {
        api.once('user', function(user) {
            if (user) {
                master(overview())
            } else {
                master(login())
            }
        })
    })
    .add(/^login(?:\?after=(.+))?$/, function(after) {
        master(login(after), 'login')
    })
    .add(/^$/, function() {
        if (!authorize.admin()) return
        master(overview(), 'overview')
    })
    .add(/^users\/(\d+)$/, function(userId) {
        if (!authorize.admin()) return
        master(adminUser(userId), 'admin')
    })
    .add(/^users\/(\d+)\/bank-accounts$/, function(userId) {
        if (!authorize.admin()) return
        master(userBankAccounts(userId), 'admin')
    })
    .add(/^users\/(\d+)\/accounts$/, function(userId) {
        if (!authorize.admin()) return
        master(userAccounts(userId), 'admin')
    })
    .add(/^users\/(\d+)\/withdraw-requests$/, function(userId) {
        if (!authorize.admin()) return
        master(userWithdraws(userId), 'admin')
    })
    .add(/^users\/(\d+)\/activity$/, function(userId) {
        if (!authorize.admin()) return
        master(userActivity(userId), 'admin')
    })
    .add(/^users\/(\d+)\/orders$/, function(userId) {
        if (!authorize.admin()) return
        master(userOrders(userId), 'admin')
    })
    .add(/^users\/(\d+)\/bank-credit$/, function(userId) {
        if (!authorize.admin()) return
        master(userBankCredit(userId), 'admin')
    })
    .add(/^balances$/, function() {
        if (!authorize.admin()) return
        master(balances(), 'admin')
    })
    .add(/^transactions(?:\?userId=(\d+))?$/, function(userId) {
        if (!authorize.admin()) return
        master(transactions(userId), 'admin')
    })
    .add(/^users$/, function() {
        if (!authorize.admin()) return
        master(users(), 'admin')
    })
    .add(/^withdraws$/, function() {
        if (!authorize.admin()) return
        master(withdraws(), 'admin')
    })
    .add(/^(.+)$/, function(hash) {
        master(notfound(hash))
    })
}
