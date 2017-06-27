#!/bin/bash
set -e

case "$1" in
    develop)
        echo "Running Development Server"
        exec grunt --gruntfile app/Gruntfile.js | bunyan
        ;;
    cron)
        echo "Running Development Server"
        exec grunt --gruntfile app/Gruntfile.js serve-cron | bunyan
        ;;
    startDev)
        echo "Running Start Dev"
        exec node app/index
        ;;
    test)
        echo "Running Test"
        exec npm test
        ;;
    start)
        echo "Running Start"
        exec npm start
        ;;
    start-cron)
        echo "Running Start"
        exec npm run start-cron
        ;;
    *)
        exec "$@"
esac
