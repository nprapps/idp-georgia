'use strict';

var webpack = require('webpack');
var glob_entries = require('webpack-glob-entries');

module.exports = {
    entry: {
        app: './www/js/app.js'
    },
    output: {
        path: './www/js/rendered',
        filename: '[name].js'
    },
    module: {
        loaders: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader'
        }, {
            test: /\.json$/,
            loader: 'json-loader'
        }]
    },
}
