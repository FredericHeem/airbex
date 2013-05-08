require('shelljs/global')

task('pp', ['publish-production'])

task('publish-production', function() {
    jake.exec([
        'npm version patch',
        'git checkout production',
        'git merge master',
        'git checkout master',
        'git push production production:master'
    ], { printStderr: true })
})
