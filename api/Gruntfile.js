'use strict';

module.exports = function(grunt) {

  //Load NPM tasks
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-env');
  grunt.loadNpmTasks('grunt-markdown');

  // Project Configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    watch: {
      readme: {
        files: ['README.md'],
        tasks: ['markdown']
      },
      js: {
        files: ['Gruntfile.js', 'index.js', 'modules/**/*.js'],
        options: {
          livereload: true,
        },
      },
    },
    nodemon: {
      dev: {
        script: 'index.js',
        options: {
          args: [],
          ignore: ['test/**/*', 'util/**/*', 'dev-util/**/*'],
          // nodeArgs: ['--debug'],
          delayTime: 1,
          env: {
              NODE_ENV: 'brush'
          },
          cwd: __dirname
        }
      }
    },
    concurrent: {
      tasks: ['nodemon', 'watch'],
      options: {
        logConcurrentOutput: true
      }
    },
    env: {
      test: {
        NODE_ENV: 'test'
      }
    },
    markdown: {
      all: {
        files: [
         {
           expand: true,
           src: 'README.md',
           dest: '.',
           ext: '.html'
         }
        ]
      }
    }
  });

  //Making grunt default to force in order not to break the project.
  grunt.option('force', true);

  //Default task(s).
  grunt.registerTask('default', ['concurrent']);

  //Test task.
  grunt.registerTask('test', ['env:test', 'mochaTest']);
};
