const path = require('path');
const fs = require('fs');
const webpack = require('webpack');

const dotenvFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: path.resolve(__dirname, dotenvFile) });

// Plugins
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const ScratchWebpackConfigBuilder = require('scratch-webpack-configuration');
const { CdnReplacerPlugin } = require('./webpack/CdnReplacerPlugin');

const isProductionBuild = process.env.NODE_ENV === 'production';

const CDN_LOCAL = process.env.CDN_LOCAL || 'https://cdn.uchi.local';

const commonHtmlWebpackPluginOptions = {
  // Google Tag Manager ID
  // Looks like 'GTM-XXXXXXX'
  gtm_id: process.env.GTM_ID || '',

  // Google Tag Manager env & auth info for alterative GTM environments
  // Looks like '&gtm_auth=0123456789abcdefghijklm&gtm_preview=env-00&gtm_cookies_win=x'
  // Taken from the middle of: GTM -> Admin -> Environments -> (environment) -> Get Snippet
  // Blank for production
  gtm_env_auth: process.env.GTM_ENV_AUTH || '',
  inject: 'body'
};

const baseConfig = new ScratchWebpackConfigBuilder({
  rootPath: path.resolve(__dirname),
  enableReact: true,
  shouldSplitChunks: false,
  publicPath: isProductionBuild ? CDN_LOCAL : '/'
})
  .setTarget('browserslist')
  .merge({
    output: {
      assetModuleFilename: 'static/assets/[name].[contenthash][ext][query]',
      library: {
        name: 'GUI',
        type: 'umd2'
      }
    },
    ignoreWarnings: [
      {
        module: /file-type[\\/].*index\.js/,
        message: /Critical dependency: the request of a dependency is an expression/
      }
    ],
    resolve: {
      extensions: ['.ts', '.tsx', '.mjs', '.cjs', '.js', '.jsx', '.json'],
      alias: {
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
      },
      fallback: {
        Buffer: require.resolve('buffer/'),
        stream: require.resolve('stream-browserify')
      }
    }
  })
  .addModuleRule({
    test: /\.tsx?$/,
    include: [
      fs.realpathSync(path.resolve(__dirname, 'node_modules/@code-cat-studio/api-client')),
      fs.realpathSync(path.resolve(__dirname, 'node_modules/@code-cat-studio/sentry'))
    ],
    loader: 'babel-loader',
    options: {
      presets: ['@babel/preset-env', '@babel/preset-typescript', '@babel/preset-react']
    }
  })
  .addModuleRule({
    test: /\.(svg|png|wav|mp3|gif|jpg)$/,
    resourceQuery: /^$/, // reject any query string
    type: 'asset' // let webpack decide on the best type of asset
  })
  .addPlugin(
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(isProductionBuild ? 'production' : 'development'),
      'process.env.DEBUG': Boolean(process.env.DEBUG),
      // Public path prefix for runtime-resolved assets (e.g. scratch-blocks
      // media). Mirrors webpack's publicPath: in production it is CDN_LOCAL,
      // which CdnReplacerPlugin later rewrites to the real CDN host; locally
      // it is "/" so assets load from origin. Consumed by the GUI `basePath`
      // prop so blocks-media resolves absolutely instead of relative to the
      // current page URL (which caused 404s under /code-cat-studio/project/).
      'process.env.PUBLIC_PATH': JSON.stringify(isProductionBuild ? CDN_LOCAL : '/'),
      'process.env.S3_PUBLIC': JSON.stringify(process.env.S3_PUBLIC),
      // Backend toggle: when "false", the api-client runs in mock mode.
      'process.env.IS_BACKEND_ENABLED': JSON.stringify(process.env.IS_BACKEND_ENABLED ?? 'true'),
      'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL ?? ''),
      'process.env.GA_ID': `"${process.env.GA_ID || 'UA-000000-01'}"`,
      'process.env.GTM_ENV_AUTH': `"${process.env.GTM_ENV_AUTH || ''}"`,
      'process.env.GTM_ID': process.env.GTM_ID ? `"${process.env.GTM_ID}"` : null,
      // Sentry
      'process.env.SENTRY_DSN': JSON.stringify(process.env.SENTRY_DSN ?? ''),
      'process.env.SENTRY_RELEASE': JSON.stringify(process.env.SENTRY_RELEASE ?? 'off'),
      'process.env.SENTRY_ENVIRONMENT': JSON.stringify(process.env.SENTRY_ENVIRONMENT ?? '')
    })
  )
  .addPlugin(
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join(path.dirname(require.resolve('scratch-blocks/package.json')), 'media'),
          to: 'static/blocks-media/default'
        },
        {
          from: path.join(path.dirname(require.resolve('scratch-blocks/package.json')), 'media'),
          to: 'static/blocks-media/high-contrast'
        },
        {
          // overwrite some of the default block media with high-contrast versions
          // this entry must come after copying scratch-blocks/media into the high-contrast directory
          from: 'src/lib/themes/high-contrast/blocks-media',
          to: 'static/blocks-media/high-contrast',
          force: true
        },
        {
          context: 'node_modules/scratch-vm/dist/web',
          from: 'extension-worker.{js,js.map}',
          noErrorOnMissing: true
        }
      ]
    })
  );

if (!process.env.CI) {
  baseConfig.addPlugin(new webpack.ProgressPlugin());
}

const distConfig = baseConfig
  .clone()
  .merge({
    entry: {
      'scratch-gui': path.join(__dirname, 'src/index.js')
    },
    output: {
      path: path.resolve(__dirname, 'dist')
    }
  })
  .addExternals(['react', 'react-dom'])
  .addPlugin(
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/lib/libraries/*.json',
          to: 'libraries',
          flatten: true
        }
      ]
    })
  );

const buildConfig = baseConfig
  .clone()
  .enableDevServer(process.env.PORT || 8601)
  .merge({
    devServer: {
      historyApiFallback: {
        rewrites: [
          { from: /^\/code-cat-studio\/project/, to: '/index.html' },
          { from: /^\/code-cat-studio\/sandbox/, to: '/index.html' },
          {
            from: /\/static\/(.+)$/,
            to: function (context) {
              return `/static/${context.match[1]}`;
            }
          }
        ]
      }
    },
    entry: {
      gui: './src/playground/index.jsx',
      blocksonly: './src/playground/blocks-only.jsx',
      compatibilitytesting: './src/playground/compatibility-testing.jsx',
      player: './src/playground/player.jsx'
    },
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: 'static/[name].[contenthash].js',
      chunkFilename: 'static/chunks/[name].[contenthash].js'
    }
  })
  .addPlugin(
    new HtmlWebpackPlugin({
      ...commonHtmlWebpackPluginOptions,
      chunks: ['gui'],
      template: 'src/playground/index.ejs',
      title: 'КотоКод Студия'
    })
  )
  .addPlugin(
    new HtmlWebpackPlugin({
      ...commonHtmlWebpackPluginOptions,
      chunks: ['blocksonly'],
      filename: 'blocks-only.html',
      template: 'src/playground/index.ejs',
      title: 'КотоКод Студия'
    })
  )
  .addPlugin(
    new HtmlWebpackPlugin({
      ...commonHtmlWebpackPluginOptions,
      chunks: ['compatibilitytesting'],
      filename: 'compatibility-testing.html',
      template: 'src/playground/index.ejs',
      title: 'КотоКод Студия'
    })
  )
  .addPlugin(
    new HtmlWebpackPlugin({
      ...commonHtmlWebpackPluginOptions,
      chunks: ['player'],
      filename: 'player.html',
      template: 'src/playground/index.ejs',
      title: 'КотоКод Студия'
    })
  )
  .addPlugin(
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'static',
          to: 'static'
        },
        {
          from: 'extensions/**',
          to: 'static',
          context: 'src/examples'
        }
      ]
    })
  );

if (isProductionBuild) {
  buildConfig.addPlugin(
    new CdnReplacerPlugin({
      verbose: true,
      from: CDN_LOCAL,
      to: 'https://<%ASSETS_CDN_HOST-%>/<%APP_NAME-%>/'
    })
  );
}

const buildDist = process.env.NODE_ENV === 'production' || process.env.BUILD_MODE === 'dist';

module.exports = buildDist ? [buildConfig.get(), distConfig.get()] : buildConfig.get();
