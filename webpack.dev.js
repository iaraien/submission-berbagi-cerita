const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    static: './dist',
    port: 8080,
    open: true,
    hot: true,
    compress: true,
    client: {
      webSocketURL: 'ws://localhost:8080/ws',
      logging: 'info',
      overlay: {
        errors: true,
        warnings: false
      }
    }
  },
});