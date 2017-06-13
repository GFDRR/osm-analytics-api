'use strict';

module.exports = function (grunt) {

    grunt.file.setBase('..');
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({

        clean: {},
        express: {
            dev: {
                options: {
                    script: 'app/index.js',
                    node_env: 'dev',
                    port: process.env.PORT,
                    output: 'started'
                }
            }
        },

        mochaTest: {
            unit: {
                options: {
                    reporter: 'spec',
                    quiet: false, // Optionally suppress output to standard out (defaults to false)
                    clearRequireCache: true, // Optionally clear the require cache before running tests (defaults to false)
                },
                src: ['app/test/unit/**/*.test.js']
            },
            e2e: {
                options: {
                    reporter: 'spec',
                    quiet: false, // Optionally suppress output to standard out (defaults to false)
                    clearRequireCache: true, // Optionally clear the require cache before running tests (defaults to false)
                },
                src: ['app/test/e2e/**/*.spec.js']
            }
        },
        watch: {
            options: {
                livereload: 35730
            },
            jssrc: {
                files: [
                    'app/src/**/*.js',
                ],
                tasks: ['mochaTest:unit', 'express:dev'],
                options: {
                    spawn: false
                }
            },
            unitTest: {
                files: [
                    'app/test/unit/**/*.test.js',
                ],
                tasks: ['mochaTest:unit'],
                options: {
                    spawn: false
                }
            },
            e2eTest: {
                files: [
                    'app/test/e2e/**/*.spec.js',
                ],
                tasks: ['mochaTest:e2e'],
                options: {
                    spawn: true
                }
            },

        }
    });


    grunt.registerTask('unitTest', ['mochaTest:unit']);

    grunt.registerTask('e2eTest', ['mochaTest:e2e']);

    grunt.registerTask('e2eTest-watch', ['watch:e2eTest']);

    grunt.registerTask('test', ['unitTest']);

    grunt.registerTask('serve', ['express:dev', 'watch']);

    grunt.registerTask('default', 'serve');

};
