module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: {
            development: 'public',
            production: 'dist'
        },

        copy: {
            development: {
                files: [
                        {
                            expand: true,
                            cwd: 'assets',
                            src: 'img/**',
                            dest: 'public',
                            filter: 'isFile'
                        },
                        {
                            expand: true,
                            cwd: 'assets/proof',
                            src: '*.json',
                            dest: 'public',
                            filter: 'isFile'
                        }
                        ]
            },
            production: {
                files: [
                        {
                            expand: true,
                            cwd: 'assets',
                            src: 'img/**',
                            dest: 'dist',
                            filter: 'isFile'
                        },
                        {
                            expand: true,
                            cwd: 'assets/proof',
                            src: '*.json',
                            dest: 'dist',
                            filter: 'isFile'
                        }
                        ]
            }
        },

        ejs: {
            options: {
                segment: process.env.SEGMENT
            },

            'index.html': {
                src: 'index.ejs',
                dest: 'public/index.html'
            }
        },

        stylus: {
            development: {
                options: {
                    'include css': true,
                    'compress': false
                },
                files: {
                    'public/app.css': 'index.styl'
                }
            }
        },
        bower: {
            install: {
                options: {
                    layout: 'byComponent',
                    cleanBowerDir: true,
                    targetDir:'vendor'
                }
            }
        },
        concat: {
            development_js: {
                options: {
                    separator: ';'
                },

                files: {
                    'public/head.js': [
                                       'vendor/modernizr/modernizr.js'
                                       ],
                                       'public/vendor.js': [
                                                            'vendor/jquery/jquery.js',
                                                            'vendor/jquery.cookie/jquery.cookie.js',
                                                            'vendor/sjcl/sjcl.js',
                                                            'vendor/blueimp-file-upload/jquery.ui.widget.js',
                                                            'vendor/blueimp-file-upload/jquery.iframe-transport.js',
                                                            'vendor/blueimp-file-upload/jquery.fileupload.js',
                                                            'vendor/blueimp-file-upload/jquery.fileupload-process.js',
                                                            'vendor/blueimp-file-upload/jquery.fileupload-validate.js',
                                                            'vendor/highstock.js',
                                                            'vendor/alertify/js/alertify.js',
                                                            'vendor/bootstrap/bootstrap.js',
                                                            'vendor/iban.js',
                                                            'vendor/async/lib/async.js',
                                                            'vendor/baproof/build/baproof.js',
                                                            'vendor/lproof/build/lproof.js'
                                                            ]
                }
            },

            development_css: {
                options: {
                    separator: '\n'
                },

                files: {
                    'public/vendor.css': [
                                          'vendor/bootstrap/bootstrap.css',
                                          'vendor/blueimp-file-upload/jquery.fileupload.css',
                                          'vendor/alertify/css/alertify.core.css',
                                          'vendor/alertify/css/alertify.bootstrap.css'
                                          ]
                }
            }
        },

        browserify: {
            options: {
                detectGlobals: false,
                transform: ['browserify-ejs']
            },

            development: {
                options: {
                    debug: true
                },

                files: {
                    'public/app.js': 'index.js'
                }
            },

            production: {
                files: {
                    'dist/app.js': 'index.js'
                }
            }
        },

        uglify: {
            libraries: {
                files: {
                    'dist/head.js': ['vendor/raven-js/raven.js', 'public/head.js'],
                    'dist/vendor.js': 'public/vendor.js'
                }
            },

            application: {
                options: {
                    beautify: true
                },

                files: {
                    'dist/app.js': 'dist/app.js'
                }
            }
        },

        htmlmin: {
            options: {
                collapseWhitespace: true
            },

            production: {
                files: {
                    'dist/index.html': 'public/index.html'
                }
            }
        },

        cssmin: {
            production: {
                files: {
                    'dist/app.css': 'public/app.css',
                    'dist/vendor.css': 'public/vendor.css'
                }
            }
        },

        connect: {
            development: {
                options: {
                    hostname: 'localhost',
                    port: 5072,
                    base: 'public',
                    open: false,
                    keepalive: true,
                    middleware: function(connect, options) {
                        var proxy = require('http-proxy').createServer(function(req, res, proxy) {
                            if (req.url.match(/^\/api\//)) {
                                // remove /api prefix
                                req.url = req.url.substr(4)

                                return proxy.proxyRequest(req, res, {
                                    host: 'localhost',
                                    port: 5071
                                })
                            }

                            proxy.proxyRequest(req, res, {
                                host: 'localhost',
                                port: 5072
                            })
                        })

                        proxy.listen(5073)

                        return [
                                function(req, res, next) {
                                    next()
                                },

                                connect['static'](options.base)
                                ]
                    }
                }
            }
        },

        watch: {
            gruntfile: {
                files: ['Gruntfile.js'],
                tasks: ['stylus', 'browserify:development']
            },

            styles: {
                files: ['modules/**/*.styl', 'assets/**/*.styl', 'modules/**/*.css'],
                tasks: 'stylus'
            },

            modules: {
                files: ['modules/**/*', 'i18n/**/*.json', 'helpers/**/*', '*.js'],
                tasks: 'browserify:development'
            },

            livereload: {
                options: {
                },

                files: [
                        'public/*.js',
                        'public/*.css'
                        ]
            }
        },

        concurrent: {
            options: {
                logConcurrentOutput: true
            },

            serve: ['watch', 'connect:development']
        }
    })

    //grunt.loadNpmTasks('grunt-bower-task')
    grunt.loadNpmTasks('grunt-browserify')
    grunt.loadNpmTasks('grunt-concurrent')
    grunt.loadNpmTasks('grunt-contrib-clean')
    grunt.loadNpmTasks('grunt-contrib-concat')
    grunt.loadNpmTasks('grunt-contrib-connect')
    grunt.loadNpmTasks('grunt-contrib-copy')
    grunt.loadNpmTasks('grunt-contrib-cssmin')
    grunt.loadNpmTasks('grunt-contrib-htmlmin')
    grunt.loadNpmTasks('grunt-contrib-stylus')
    grunt.loadNpmTasks('grunt-contrib-uglify')
    grunt.loadNpmTasks('grunt-contrib-watch')
    grunt.loadNpmTasks('grunt-ejs')

    grunt.registerTask('development', [
                                       //'bower',
                                       'ejs',
                                       'copy:development',
                                       'stylus',
                                       'concat',
                                       'browserify:development'
                                       ])

                                       grunt.registerTask('production', [
                                                                         //'bower',
                                                                         'ejs',
                                                                         'copy:production',
                                                                         'stylus',
                                                                         'concat',
                                                                         'browserify:production',
                                                                         'uglify',
                                                                         'htmlmin',
                                                                         'cssmin'
                                                                         ])

                                                                         grunt.registerTask('serve', ['development', 'concurrent:serve'])
                                                                         grunt.registerTask('default', ['development'])
}
