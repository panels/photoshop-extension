var fs = require('fs-plus')
var path = require('path')
var temp = require('temp').track()
var template = require('lodash.template')
var glob = require('glob')
var prompt = require('prompt')
var execSync = require('exec-sync')

var generateExtensionBundle = function (params) {
  var target = temp.mkdirSync('extension-' + params.name)
  var source = path.join(__dirname, '..', 'template')

  var files = glob.sync('**/*.*', {
    cwd: source
  })

  // todo: define debug port in package
  // if (params.debug) {
  //   files.push('.debug')
  // }

  files.forEach(function (file) {
    var filename = path.join(source, file)
    var dirname = path.dirname(file)

    if (dirname !== '.') {
      fs.makeTreeSync(path.join(target, dirname))
    }

    var content = fs.readFileSync(filename, 'utf8')
    fs.writeFileSync(path.join(target, file), template(content, params))
  })

  //copying extension icons
  var iconTarget = path.join(target, 'icons')
  var icons = ['icon-light', 'icon-dark']
  icons.forEach(function (icon) {
    fs.copySync(path.resolve(params.panel[icon]), path.join(iconTarget, icon + '.png'))
  })

  // copying logo - when needed?
  if (params.panel['extension-logo']) {
    var logoTarget = path.join(target, 'logo')
    fs.copySync(path.resolve(params.panel['extension-logo']), path.join(logoTarget, 'extension-logo.png'))
  }

  return target
}

var sign = function (dir, params, password) {
  var ucf = path.resolve(__dirname, '..', 'bin', 'ucf.jar')
  var cert = path.resolve(params.panel.cert)
  var output = temp.openSync('signed-' + params.name).path
  try {
    execSync('java -jar "' + ucf + '" -package -storetype PKCS12 -keystore ' + cert + ' -storepass ' + password + ' -tsa https://timestamp.geotrust.com/tsa "' + output + '" -C "' + dir + '" .')
    fs.moveSync(output, 'extension.zip')
  } catch (e) {
    console.log('Signing process failed')
    console.log(e)
  }
  console.log('Created signed extension.zip')
}

var deploy = function (source, name) {
  var targets = {
    darwin: [
      fs.absolute('~/Library/Application Support/Adobe/CEPServiceManager4/extensions/'),
      fs.absolute('~/Library/Application Support/Adobe/CEP/extensions/'),
    ]
  }

  if (!process.platform in targets) {
    console.log('Not implemented CEP deployment on platform ' + process.platform)
    return
  }

  targets[process.platform].forEach(function (target) {
    target = path.join(target, name)
    fs.removeSync(target)
    fs.copySync(source, target)
  })

  console.log('Successfully deployed ' + name)
}

module.exports = function (params) {
  var originalIdentifier = params.panel.identifier

  // generating extension bundles
  var production = generateExtensionBundle(params)

  // change some params for dev mode
  params.panel.identifier += '.dev'
  params.panel.title += ' (dev)'
  params.debug = true

  var dev = generateExtensionBundle(params)

  deploy(production, originalIdentifier)
  deploy(dev, originalIdentifier + '.dev')

  if (params.panel['cert-password']) {
    sing(production, params, params.panel['cert-password'])
  } else {
    console.log('Leave blank to skip signing extension')

    prompt.message = prompt.delimiter = ''
    prompt.start()

    prompt.get([{
      name: 'password',
      message: 'Password for ' + path.basename(params.panel.cert),
    }], function (err, input) {
      if (input.password) {
        sign(production, params, input.password)
      }
    })
  }
}

