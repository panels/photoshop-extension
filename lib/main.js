var fs = require('fs-plus')
var path = require('path')
var temp = require('temp')
var template = require('lodash.template')
var glob = require('glob')

var PARENT_MODULE_ROOT_PATH = module.parent.filename.replace('[eval]', '')
var DEBUG_BIN_PATH = path.join(PARENT_MODULE_ROOT_PATH, 'bin-debug/')
var SIGNED_BIN_PATH = path.join(PARENT_MODULE_ROOT_PATH, 'bin/') 

var generateExtensionBundle = function (params) {
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
  //copying extension icons
  var icons = ['icon-light', 'icon-dark']
  icons.forEach(function (icon) {
    console.log('Copying icon: ' + icon + ': ' + path.resolve(params.panel[icon]) + ' ' + path.join(iconTarget, icon + '.png'))
    fs.linkSync(path.resolve(params.panel[icon]), path.join(iconTarget, icon + '.png'))
  })

  //copying logo
  var logoTarget = path.join(target, 'logo')
  fs.makeTreeSync(logoTarget)
  fs.linkSync(path.resolve(params.panel['extension-logo']), path.join(logoTarget, 'extension-logo.png'))

  return target
}

var sign = function(params) {

    var CERT_PASSWORD = ''
    var CERT_PATH = path.join(PARENT_MODULE_ROOT_PATH, params.panel['cert'])
    if(typeof params.panel['cert-password'] !== 'undefined' && params.panel['cert-password'])
    {
      CERT_PASSWORD = params.panel['cert-password']
    }

    var path_to_sh = path.join(__dirname, '..', 'bin')
    var exec = require('child_process').exec;
    var child = null;
    console.log('\n')
    console.log('Generating signed extension ...')
    console.log('Input directory:' +  DEBUG_BIN_PATH)
    console.log('Output directory:' + SIGNED_BIN_PATH)
    console.log('Certificate path:' + CERT_PATH)
    console.log('\n')

    child = exec('cd ' + path_to_sh + ';sh sign.sh ' + DEBUG_BIN_PATH + ' ' + SIGNED_BIN_PATH + ' ' + CERT_PATH + ' ' + CERT_PASSWORD,
      function (error, stdout, stderr) {
        if(stdout!==''){
          console.log('ZXP signer stdout: \n' + stdout);
        }
        if(stderr!==''){
          console.log('ZXP signer stderr: \n' + stderr);
        }
        if (error !== null) {
          console.log('ZXP exec error:\n[' + error+']');
        }
      });
}

module.exports = function (params) {

  //generating extension bundles
  var production = generateExtensionBundle(params)

  console.log('production', production)

  params.panel.identifier += '.dev'
  params.panel.title += ' (dev)'
  params.debug = true

  var dev = generateExtensionBundle(params)

  console.log('dev', dev)

  var HOME_DIR = fs.getHomeDirectory();

  // copy sources to desired locations
  //TODO: what about cep 5 ?
  var PSPath = HOME_DIR + "/Library/Application Support/Adobe/CEPServiceManager4/extensions/"
  var copiedDirName  = dev;
  var desiredDirName = PSPath + '/' + params.panel.identifier

  fs.copySync(copiedDirName, desiredDirName)
  fs.copySync(copiedDirName, DEBUG_BIN_PATH)
  //fs.copySync(copiedDirName, signedModulePath)
  console.log('Copying Photoshop extension dev build from \n' + copiedDirName + '\n to \n' + desiredDirName)

  sign(params)
}

