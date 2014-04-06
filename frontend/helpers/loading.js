module.exports = exports = function() {
    function checkForLoader() {
        setTimeout(function()  {
            $('.is-loading-indicator').animate({opacity: 1}, 300)
        }, 500)
    }

    $(window).on('hashchange', checkForLoader)
    checkForLoader()
}
