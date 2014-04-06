module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: {
            development: 'public',
            production: 'dist'
        },

        ejs: {
            options: {
            },

            'index.html': {
                src: 'controllers/index.ejs',
                dest: 'public/index.html'
            }
        },

        stylus: {
            development: {
                files: {
                    'public/app.css': 'controllers/index.styl'
                }
            }
        },

        bower: {
            install: {
                options: {
                    layout: 'byComponent',
                    cleanBowerDir: true
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
                        'lib/modernizr/modernizr.js'
                    ],
                    'public/vendor.js': [
                        'lib/jquery/jquery.js',
                        'lib/jquery.cookie/jquery.cookie.js',
                        'lib/sjcl/sjcl.js',
                        'node_modules/alertify/lib/alertify.js',
                        'lib/bootstrap/js/bootstrap.js',
                        'lib/bootstrap-notify/js/bootstrap-notify.js'
                    ]
                }
            },

            development_css: {
                options: {
                    separator: ';'
                },

                files: {
                    'public/vendor.css': [
                        'lib/bootstrap/css/bootstrap.min.css',
                        'lib/bootstrap/css/bootstrap-responsive.min.css',
                        'lib/bootstrap-notify/css/bootstrap-notify.css',
                        'node_modules/alertify/themes/alertify.core.css',
                        'node_modules/alertify/themes/alertify.bootstrap.css'
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
                    'dist/head.js': ['lib/raven-js/raven.js', 'public/head.js'],
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
                    port: 6072,
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
                                port: 6072
                            })
                        })

                        proxy.listen(6073)

                        return [
                            function(req, res, next) {
                                if (!grunt.file.exists(options.base, req.url)) {
                                    req.url = '/'
                                }

                                next()
                            },

                            connect['static'](options.base)
                        ]
                    }
                }
            }
        },

        watch: {
            styles: {
                files: ['controllers/**/*.styl'],
                tasks: 'stylus'
            },

            scripts: {
                files: ['controllers/**/*.js', 'routes/**/*.js', 'helpers/**/*.js', '*.js'],
                tasks: 'browserify:development'
            },

            templates: {
                files: ['controllers/**/*.html'],
                tasks: 'browserify:development'
            }
        },

        concurrent: {
            options: {
                logConcurrentOutput: true
            },

            serve: ['watch', 'connect:development']
        }
    })

    grunt.loadNpmTasks('grunt-bower-task')
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
        'bower',
        'ejs',
        'stylus',
        'concat',
        'browserify:development'
    ])

    grunt.registerTask('production', [
        'bower',
        'ejs',
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
