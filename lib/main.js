var fs = require('fs-plus')
var path = require('path')
var temp = require('temp')
var template = require('lodash.template')
var glob = require('glob')

var generateExtension = function (params) {
  var target = temp.mkdirSync('extension-' + params.name)
  var source = path.join(__dirname, '..', 'template')

  var files = glob.sync('**/*.*', {
    cwd: source
  })

  files.forEach(function (file) {
    var filename = path.join(source, file)
    var dirname = path.dirname(file)

    if (dirname !== '.') {
      fs.makeTreeSync(path.join(target, dirname))
    }

    var content = fs.readFileSync(filename, 'utf8')
    fs.writeFileSync(path.join(target, file), template(content, params))
  })

  var iconTarget = path.join(target, 'icons')
  fs.makeTreeSync(iconTarget)

  var icons = ['icon-light', 'icon-dark']
  icons.forEach(function (icon) {
    fs.linkSync(path.resolve(params.panel[icon]), path.join(iconTarget, icon + '.png'))
  })

  return target
}

module.exports = function (params) {
  var production = generateExtension(params)

  console.log('production', production)

  params.panel.identifier += '.dev'
  params.panel.title += ' (dev)'
  params.debug = true

  var dev = generateExtension(params)

  console.log('dev', dev)

  fs.removeSync('/Users/marekhrabe/Desktop/abcd')
  fs.copySync(dev, '/Users/marekhrabe/Desktop/abcd')
}
