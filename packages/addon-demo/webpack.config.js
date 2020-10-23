const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const { ModuleFederationPlugin } = require('webpack').container;
const { WatchIgnorePlugin } = require('webpack')

const packageJson = require('./package')

module.exports = {
  entry: './src/index',
  mode: 'development',
  output: {
    path: path.resolve(__dirname, 'public')
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: ['@babel/preset-react'],
        },
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      }
    ],
  },
  plugins: [
    // Use Plugin
    new ModuleFederationPlugin({
      name: 'Addon Demo',
      library: { type: 'var', name: packageJson.name.replace(/-/g, '_') },
      filename: 'remoteEntry.js',
      exposes: {
        // expose each component you want 
        './AppPanel': './src/components/AppPanel',
        './AddonPanel': './src/components/AddonPanel',
      },
      shared: ['react', 'react-dom', 'react-leaflet'],
    }),
    new WatchIgnorePlugin({
      paths: [path.resolve(__dirname, 'public/')]}),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};