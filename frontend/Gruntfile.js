module.exports = function(grunt) {
    var getConfigFile = function(){
        var operator = process.env.SNOW_OPERATOR || "airbex";
        return grunt.file.readJSON('./config/' + operator + '.json')
    }
    var getStylusFile = function(){
        var operator = process.env.SNOW_OPERATOR || "airbex";
        return "./css/" + operator + ".styl";
    }	
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            all: [
                '{,*/}*.js',
                '!node_modules/*',
                '!vendor/*',
                '!public/*',
                '!dist/*',
                '!Gruntfile.js',
                '!config.js'
            ]
        },
        clean: {
            development: 'public',
            production: 'dist'
        },
        replace: {
            config: {
              options: {
                patterns: [{
                  json: getConfigFile()
                }]
              },
              files: [{
                expand: true,
                flatten: true,
                src: ['config.js'],
                dest: 'config/'
              }]
            }
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
                        }
                        ]
            }
        },

        ejs: {
            options: {
                segment: process.env.SEGMENT,
                optimizely: process.env.OPTIMIZELY,
                environment: process.env.NODE_ENV || 'dev',
                config:getConfigFile().config
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
                    'public/app.css': ['index.styl',getStylusFile()]
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
                                                            'vendor/bootstrap/bootstrap.js',
                                                            'vendor/sjcl/sjcl.js',
                                                            'vendor/blueimp-file-upload/jquery.ui.widget.js',
                                                            'vendor/blueimp-tmpl/tmpl.js',
                                                            'vendor/blueimp-canvas-to-blob/canvas-to-blob.js',
                                                            'vendor/blueimp-load-image/load-image.js',
                                                            'vendor/blueimp-load-image/load-image-meta.js',
                                                            'vendor/blueimp-file-upload/jquery.iframe-transport.js',
                                                            'vendor/blueimp-file-upload/jquery.fileupload.js',
                                                            'vendor/blueimp-file-upload/jquery.fileupload-process.js',
                                                            'vendor/blueimp-file-upload/jquery.fileupload-image.js',
                                                            'vendor/blueimp-file-upload/jquery.fileupload-validate.js',
                                                            'vendor/highstock.js',
                                                            'vendor/alertify/js/alertify.js',
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
                    hostname: '0.0.0.0',
                    port: 5072,
                    base: 'public',
                    open: false,
                    keepalive: true,
                    middleware: function(connect, options) {
                        
                        var http = require('http');
                        var httpProxy = require('http-proxy');
                        
                        var demo = false;
                        
                        var remoteHostWeb = "http://127.0.0.1:5072";
                        var remoteHostApi = "http://127.0.0.1:5071";
                        var remoteHostWs = "http://127.0.0.1:5071";
                        if(demo){
                            //remoteHostWeb = "https://demo.airbex.net:443";
                            remoteHostApi = "https://demo.airbex.net:443";
                            remoteHostWs = "https://demo.airbex.net:443";
                        }
                        var proxyWeb = httpProxy.createProxyServer({ target: remoteHostWeb});
                        var proxyApi = httpProxy.createProxyServer({ target: remoteHostApi});
                        var proxyWs = httpProxy.createProxyServer({ target: remoteHostWs,ws:true });
                        
                        var server = http.createServer(function(req, res) {
                            console.log("url ", req.url)
                            if (req.url.match(/^\/api\//)) {
                                // remove /api prefix
                                if(demo){
                                    
                                } else {
                                    req.url = req.url.substr(4)
                                }
                                
                                return proxyApi.web(req, res);
                            } else if (req.url.match(/^\/socket.io\//)) {
                                return proxyWs.web(req, res);
                            } else if (req.url.match(/^\/explorer\//)) {
                                return proxyApi.web(req, res);
                            }
                            proxyWeb.web(req, res);
                        });
                        
                        server.on('upgrade', function (req, socket, head) {
                            console.log("upgrade ", req.url)
                            proxyWs.ws(req, socket, head);
                        });
                        
                        server.listen(5073)

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
                files: ['css/**/*.styl', 'css/**/*.css','modules/**/*.styl', 'assets/**/*.styl', 'modules/**/*.css'],
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

        // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);

    grunt.registerTask('development',
            [
             //'bower',
             'replace:config',
             'ejs',
             'copy:development',
             'stylus',
             'concat',
             'browserify:development'
             ]
    )

    grunt.registerTask('production',
            [
             //'bower',
             'replace:config',
             'ejs',
             'copy:production',
             'stylus',
             'concat',
             'browserify:production',
             'uglify',
             'htmlmin',
             'cssmin'
             ]
    )

    grunt.registerTask('serve', ['development', 'concurrent:serve'])
    grunt.registerTask('default', ['development'])
}
