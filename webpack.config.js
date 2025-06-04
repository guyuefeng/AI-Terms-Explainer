const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    background: './src/background/background.ts',
    content: './src/content/content.ts',
    fullscreen: './src/fullscreen/fullscreen.ts'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { 
          from: 'manifest.json', 
          to: 'manifest.json',
          transform(content) {
            // 修改manifest.json中的路径
            const manifest = JSON.parse(content.toString());
            
            // 修改背景脚本路径
            if (manifest.background && manifest.background.service_worker) {
              manifest.background.service_worker = 'background.js';
            }
            
            // 修改内容脚本路径
            if (manifest.content_scripts && manifest.content_scripts.length > 0) {
              manifest.content_scripts.forEach(script => {
                if (script.js) {
                  script.js = script.js.map(js => js.replace('dist/', ''));
                }
              });
            }
            
            // 修改web_accessible_resources路径
            if (manifest.web_accessible_resources && manifest.web_accessible_resources.length > 0) {
              manifest.web_accessible_resources.forEach(resource => {
                if (resource.resources) {
                  resource.resources = resource.resources.map(res => res.replace('dist/', ''));
                }
              });
            }
            
            // 修改options_page路径
            if (manifest.options_page) {
              manifest.options_page = manifest.options_page.replace('dist/', '');
            }
            
            return JSON.stringify(manifest, null, 2);
          }
        },
        { 
          from: 'src/fullscreen/fullscreen.html',
          to: 'fullscreen.html',
          noErrorOnMissing: true
        },
        { 
          from: 'src/fullscreen/fullscreen.css',
          to: 'fullscreen.css',
          noErrorOnMissing: true
        },
        { 
          from: 'images',
          to: 'images',
          noErrorOnMissing: true
        },
        { 
          from: '_locales',
          to: '_locales',
          noErrorOnMissing: true
        }
      ],
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
}; 