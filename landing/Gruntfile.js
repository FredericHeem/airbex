module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: {
            development: 'public',
            production: 'dist'
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
                src: ['img/**', 'app.js'],
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
                    'public/app.css': 'index.styl'
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
                        'vendor/jquery*.js'
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
                    'dist/index.html': 'public/index.html',
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
                    hostname: 'localhost',
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
                                host: 'localhost',
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
                files: '**/*.styl',
                tasks: ['stylus']
            },

            grunt: {
                files: ['Gruntfile.js'],
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
        'copy:development',
        'stylus',
        'concat',
        'ejs:all'
    ])

    grunt.registerTask('production', [
        'copy:production',
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
