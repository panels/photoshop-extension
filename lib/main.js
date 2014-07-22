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

  if(params.debug) {
    files.push('./.debug')
  }

  console.log('Processing files:'  + files)

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
    console.log('Copying icon: ' + icon + ': ' + path.resolve(params.panel[icon]) + ' ' + path.join(iconTarget, icon + '.png'))
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

  var HOME_DIR = fs.getHomeDirectory();

  //TODO: what about cep 5 ?
  var PSPath = HOME_DIR + "/Library/Application Support/Adobe/CEPServiceManager4/extensions/"
  var copiedDirName  = dev;
  var desiredDirName = PSPath + '/' + params.panel.identifier

  fs.copySync(copiedDirName, desiredDirName)
  console.log('Copying Photoshop extension build from \n' + copiedDirName + '\n to \n' + desiredDirName)
}
