var webpack = require('webpack');
var path = require('path');
var fs = require('fs');

var nodeModules = {};
fs.readdirSync('node_modules')
  .filter(function(x) {
    return ['.bin'].indexOf(x) === -1;
  })
  .forEach(function(mod) {
    nodeModules[mod] = 'commonjs ' + mod;
  });

module.exports = {
  entry: ['babel-polyfill', './src/server/index.js'],
  target: 'node',
  output: {
    path: path.join(__dirname, 'build'),
    filename: 'server.js'
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        use: [
          'babel-loader'
        ],
      },
      {
        test: /\.(txt|proto)(\?v=\d+\.\d+\.\d+)?$/,
        use: ['raw-loader']
      }
    ]
  },
  externals: nodeModules,
  plugins: [
    new webpack.IgnorePlugin(/\.(css|less)$/),
    new webpack.BannerPlugin({banner: 'require("source-map-support").install();', raw: true, entryOnly: false})
  ],
  devtool: 'sourcemap'
}
