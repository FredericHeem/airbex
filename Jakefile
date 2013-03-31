require('shelljs/global')

task('publish-production', function() {
    jake.exec([
        'git checkout production',
        'git merge master',
        'git checkout master',
        'git push production production:master'
    ], { printStderr: true })
})
