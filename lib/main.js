var fs = require('fs-plus')
var path = require('path')
var temp = require('temp').track()
var template = require('lodash.template')
var glob = require('glob')
var prompt = require('prompt')
var execSync = require('child_process').execSync

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
  var icons = ['light', 'dark']
  icons.forEach(function (icon) {
    fs.linkSync(path.resolve(params.panel.icons[icon]), path.join(iconTarget, 'icon-' + icon + '.png'))
  })

  // extra jsx for extension (legacy CEP style)
  if (params.panel['extensionJsxPath']) {
    var jsxTarget = path.join(target, 'jsx')
    fs.makeTreeSync(jsxTarget)
    fs.linkSync(path.resolve(params.panel['extensionJsxPath']), path.join(jsxTarget, 'hostscript.jsx'))
  }

  // copying logo (for usage in login screen)
  if (params.panel.logo && params.panel.logo.src) {
    var logoTarget = path.join(target, 'logo')
    fs.makeTreeSync(logoTarget)
    fs.linkSync(path.resolve(params.panel.logo.src), path.join(logoTarget, 'extension-logo.png'))
  } else {
    // todo default logo
  }

  return target
}

var sign = function (dir, params, password, postfix) {
  console.log('\nCreating signed package…')

  var ucf = path.resolve(__dirname, '..', 'bin', 'ucf.jar')
  var cert = path.resolve(params.panel.cert)
  var output = temp.openSync('signed-' + params.name).path
  try {
    execSync('java -jar "' + ucf + '" -package -storetype PKCS12 -keystore ' + cert + ' -storepass ' + password + ' "' + output + '" -C "' + dir + '" .')
    fs.moveSync(output, 'extension.' + params.version + (postfix ? '-' + postfix : '') + '.zip')
    console.log('Created signed extension.' + params.version + (postfix ? '-' + postfix : '') + '.zip')
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
  var originalTitle = params.panel.title

  var ver = params.version.split('.')
  params.panel.extensionVersion = ver.shift() + ver.map(function(n){return (n.length === 1 ? '0' : '') + n}).join('')

  // set environment to open extensions in development
  execSync('defaults write ~/Library/Preferences/com.adobe.CSXS.5.plist PlayerDebugMode -string "1"')
  execSync('killall cfprefsd')

  // generating extension bundles
  var production = generateExtensionBundle(params)

  // generating staging extension if needed
  var staging;
  if (params.panel.generateStagingExtension) {
    params.panel.identifier = originalIdentifier + '.staging'
    params.panel.title = originalTitle + ' (staging)'
    params.debug = false
    params.staging = true
    staging = generateExtensionBundle(params)
  }

  // change some params for dev mode
  params.panel.identifier = originalIdentifier + '.dev'
  params.panel.title = originalTitle + ' (dev)'
  params.debug = true
  params.staging = false

  // have some fun with dev icons (when imagemagick installed)
  if (execSync('which composite')) {
    var icons = ['dark', 'light']
    var colors = ['yellow', 'tomato', 'steelblue', 'hotpink', 'green']
    var randomColor = function () {
      return colors[Math.floor(Math.random() * colors.length)]
    }
    icons.forEach(function (icon) {
      var originalPath = path.resolve(params.panel.icons[icon])
      var destination = temp.openSync({ suffix: '.png' }).path
      execSync('composite -compose Atop -size 23x23 plasma:' + randomColor() + '-' + randomColor() + ' "' + originalPath + '" "' + destination + '"')
      params.panel.icons[icon] = destination
    })
  }

  var dev = generateExtensionBundle(params)

  deploy(production, originalIdentifier)
  deploy(dev, originalIdentifier + '.dev')

  if (staging) {
    deploy(staging, originalIdentifier + '.staging')
  }

  if (params.panel.cert) {
    if (!fs.existsSync(params.panel.cert)) {
      console.log('Certificate defined in package.json as "' + params.panel.cert + '" is missing')
      return
    }

    if (params.panel['cert-password']) {
      sign(production, params, params.panel['cert-password'])
      sign(staging, params, params.panel['cert-password'], 'staging')
    } else {
      console.log('\nLeave blank to skip signing extension')

      prompt.message = prompt.delimiter = ''
      prompt.start()

      prompt.get([{
        name: 'password',
        message: 'Password for ' + path.basename(params.panel.cert),
      }], function (err, input) {
        if (input.password) {
          sign(production, params, input.password)
          sign(staging, params, input.password, 'staging')
        }
      })
    }
  }
}
