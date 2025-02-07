require('dotenv').config()

const _ = require('lodash')
const { getBaseurl, getenv, ncp } = require('./utils')
const fg = require('fast-glob')
const fsPromises = require('fs').promises
const htmlMinifier = require('html-minifier').minify
const log = require('debug')('app:index')
const path = require('path')
const pug = require('pug')
const UglifyJS = require('uglify-es')

exports.build = async () => {
  const PUG_OPTIONS = {
    basedir: path.resolve(__dirname),
    baseurl: getBaseurl(),
    GA_MEASUREMENT_ID: getenv('GA_MEASUREMENT_ID', 'UA-39556213-12'),
    NODE_ENV: getenv('NODE_ENV', 'production'),
    ..._.fromPairs(_.map([
      'LIFFID_FULL',
      'LIFFID_SHARE_CSV',
      'LIFFID_SHARE',
    ], k => [_.camelCase(k), getenv(k)])),
  }

  const htmlMinifierOptions = {
    caseSensitive: true,
    collapseBooleanAttributes: true,
    collapseInlineTagWhitespace: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    decodeEntities: true,
    minifyCSS: true,
    minifyJS: code => UglifyJS.minify(code).code,
    removeCDATASectionsFromCDATA: true,
    removeComments: true,
    removeCommentsFromCDATA: true,
    removeEmptyAttributes: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    sortAttributes: true,
    sortClassName: true,
    useShortDoctype: true,
  }

  // copy public files
  await ncp('src', 'dist', {
    stopOnErr: true,
    filter: filename => !/\.pug$/.test(filename), // 複製除了 .pug 之外的檔案
  })

  // compile pug files
  const pugFiles = _.map(await fg('src/**/*.pug'), file => file.slice(4))

  for (const file of pugFiles) {
    try {
      const html = htmlMinifier(pug.renderFile(path.resolve(__dirname, 'src', file), PUG_OPTIONS), htmlMinifierOptions)
      const dist = path.resolve(__dirname, 'dist', file.replace(/\.pug$/, '.html'))
      await fsPromises.mkdir(path.dirname(dist), { recursive: true })
      await fsPromises.writeFile(dist, html)
    } catch (err) {
      log(file, err)
      throw err
    }
  }
}
