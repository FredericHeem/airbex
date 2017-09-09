module.exports = function(grunt) {
    
    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);
    
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        
        clean: {
            development: 'public',
            production: 'dist'
        },
        browserify: {
            options: {
                detectGlobals: false,
                transform: ['browserify-ejs']
            },
            production: {
                files: {
                    'dist/main.js': 'app/main.js'
                }
            },
            development: {
                options: {
                    debug: true
                },
                files: {
                    'public/main.js': 'app/main.js'
                }
            }
        },
        copy: {
            development: {
                expand: true,
                cwd: 'assets',
                src: ['*'],
                dest: 'public',
                filter: 'isFile'
            },

            production: {
                expand: true,
                cwd: 'assets',
                src: ['*'],
                dest: 'dist',
                filter: 'isFile'
            }
        },

        ejs: {
            options: {
                segment: process.env.SEGMENT,
                optimizely: process.env.OPTIMIZELY,
                environment: process.env.NODE_ENV || 'dev'
            },

            all: {
                src: ['*.ejs'],
                dest: 'public/',
                expand: true,
                ext: '.html'
            }
        },

        stylus: {
            options: {
                'include css': true
            },
            development: {
                files: {
                    'public/app.css': 'index.css'
                }
            }
        },

        concat: {
            development_js: {
                options: {
                    separator: ';'
                },

                files: {
                    'public/vendor.js': [
                        'vendor/jquery*.js',
                        'vendor/skrollr.min.js'
                    ]
                }
            }
        },

        uglify: {
            libraries: {
                files: {
                    'dist/vendor.js': 'public/vendor.js'
                }
            },

            application: {
                options: {
                    beautify: true
                },

                files: {
                    'dist/main.js': 'dist/main.js'
                }
            }
        },

        htmlmin: {
            options: {
                collapseWhitespace: true
            },

            production: {
                files: {
                    'dist/index.html': 'public/index-en.html',
                    'dist/index.no.html': 'public/index.no.html'
                }
            }
        },

        cssmin: {
            production: {
                files: {
                    'dist/app.css': 'public/app.css'
                }
            }
        },

        connect: {
            development: {
                options: {
                    hostname: '0.0.0.0',
                    port: 7072,
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
                                host: '0.0.0.0',
                                port: 7072
                            })
                        })

                        proxy.listen(7073)

                        return [
                            function(req, res, next) {
                                req.url = req.url.replace(/\/([a-z]{2})\/$/, '/index-$1.html')
                                req.url = req.url.replace(/\/([a-z]{2})\/(about|terms|contact|privacy|faq)$/, '/$2-$1.html')

                                next()
                            },

                            connect['static'](options.base)
                        ]
                    }
                }
            }
        },

        watch: {
            templates: {
                files: ['**/*.ejs'],
                tasks: ['ejs:all']
            },

            stylus: {
                files: ['**/*.styl', '**/*.css'],
                tasks: ['stylus']
            },

            grunt: {
                files: ['Gruntfile.js','app/**/*.js','app/**/*.html'],
                tasks: ['development']
            }
        },

        concurrent: {
            options: {
                logConcurrentOutput: true
            },

            serve: ['watch', 'connect:development']
        }
    })

    grunt.registerTask('development', [
        'copy:development',
        'browserify:development',
        'stylus',
        'concat',
        'ejs:all'
    ])

    grunt.registerTask('production', [
        'copy:production',
        'browserify:production',
        'stylus',
        'concat',
        'uglify',
        'htmlmin',
        'cssmin',
        'ejs:all'
    ])

    grunt.registerTask('serve', ['development', 'concurrent:serve'])
    grunt.registerTask('default', ['development'])
}
