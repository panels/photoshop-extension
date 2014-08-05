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

  if (params.debug) {
    files.push('.debug')
  }

  files.forEach(function (file) {
    var filename = path.join(source, file)
    var dirname = path.dirname(file)

    if (dirname !== '.') {
      fs.makeTreeSync(path.join(target, dirname))
    }

    var content = fs.readFileSync(filename, 'utf8')
    fs.writeFileSync(path.join(target, file), template(content, params))
  })

  // copying extension icons
  var iconTarget = path.join(target, 'icons')
  fs.makeTreeSync(iconTarget)
  var icons = ['icon-light', 'icon-dark']
  icons.forEach(function (icon) {
    fs.linkSync(path.resolve(params.panel[icon]), path.join(iconTarget, icon + '.png'))
  })

  // copying logo (for usage in login screen)
  if (params.panel['extension-logo']) {
    var logoTarget = path.join(target, 'logo')
    fs.makeTreeSync(logoTarget)
    fs.linkSync(path.resolve(params.panel['extension-logo']), path.join(logoTarget, 'extension-logo.png'))
  }

  return target
}

var sign = function (dir, params, password) {
  console.log('Creating signed package…')

  var ucf = path.resolve(__dirname, '..', 'bin', 'ucf.jar')
  var cert = path.resolve(params.panel.cert)
  var output = temp.openSync('signed-' + params.name).path
  try {
    execSync('java -jar "' + ucf + '" -package -storetype PKCS12 -keystore ' + cert + ' -storepass ' + password + ' -tsa https://timestamp.geotrust.com/tsa "' + output + '" -C "' + dir + '" .')
    fs.moveSync(output, 'extension.zip')
    console.log('Created signed extension.zip')
  } catch (e) {
    console.log('Signing process failed')
    console.log(e)
  }
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

  var ver = params.version.split('.')
  params.panel.extensionVersion = ver.shift() + ver.map(function(n){return (n.length === 1 ? '0' : '') + n}).join('')

  // set environment to open extensions in development
  execSync('defaults write ~/Library/Preferences/com.adobe.CSXS.5.plist PlayerDebugMode -string "1"')
  execSync('killall cfprefsd')

  // generating extension bundles
  var production = generateExtensionBundle(params)

  // change some params for dev mode
  params.panel.identifier += '.dev'
  params.panel.title += ' (dev)'
  params.debug = true

  var dev = generateExtensionBundle(params)

  deploy(production, originalIdentifier)
  deploy(dev, originalIdentifier + '.dev')

  if (params.panel.cert) {
    if (!fs.existsSync(params.panel.cert)) {
      console.log('Certificate defined in package.json as "' + params.panel.cert + '" is missing')
      return
    }

    if (params.panel['cert-password']) {
      sign(production, params, params.panel['cert-password'])
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
}

