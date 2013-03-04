require('shelljs/global')

task('test', function() {
    jake.exec('mocha -R spec -b')
})

task('publish-prod', ['test'], function() {
    jake.exec([
        'git checkout prod',
        'git merge master',
        'git checkout master',
        'git push heroku prod:master'
    ], { printStderr: true })
})
