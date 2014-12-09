var AppConfig = function() {

  var csInterface = new CSInterface()
  window.util = new Util()
  var SLUG_NAME = util.SLUG_NAME
  var CONFIG_PATH = util.CONFIG_PATH
  var CONFIG_DIR_PATH = util.CONFIG_DIR_PATH

  var hostMajorVersion = -1;
  var hostMinorVersion = -1;
  var hostFixVersion   = -1;
  var debugMode = <%= typeof debug !== 'undefined' && debug === true ? 'true' : 'false' %>;
  var os = ""

  var AppConfig = {}

  AppConfig = {
      AppVersion: util.EXTENSION_VERSION,
      //
      //AppVersion: 902,
      UUID: null
  }
  AppConfig.generateUUID = function() {

    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });

    return uuid;
}

AppConfig.init = function() {

    var result = cep.fs.readFile(CONFIG_PATH);
    console.log('Reading config file at:' + CONFIG_PATH);
        //file does not exist, generating and writing UUID to file
        if(result.err == cep.fs.ERR_NOT_FOUND) {
            AppConfig.UUID = AppConfig.generateUUID();
            AppConfig.writeConfig(AppConfig);

        } else if(result.err === cep.fs.NO_ERROR) {

            AppConfig.readConfig();

        //some other error message
    } else {
      console.warn('Error reading config file:', util.getErrorMessage(result.err));
  }
}

AppConfig.initConfigDirectory = function() {

  var result = cep.fs.makedir(CONFIG_DIR_PATH);

  if(result.err !== cep.fs.NO_ERROR && (result.err !== cep.fs.ERR_NOT_FOUND)) {
    console.warn('Error creating app config directory: Problem reading app config dir (' + CONFIG_DIR_PATH + '): ' + util.getErrorMessage(result.err));
  } else if(result.err === cep.fs.ERR_NOT_FOUND) {
    console.log('Config dir already exists, proceeding..');
  } else {
    console.log('Config dir has been created.')
  }

  return result;
}


AppConfig.writeConfig = function(config) {

  AppConfig.initConfigDirectory();
  var result = cep.fs.writeFile(CONFIG_PATH, JSON.stringify(config));
  if(result.err !== cep.fs.NO_ERROR) {
      console.warn('Error reading files: Problem reading app config file (' + CONFIG_PATH + '): ' + ERROR[result.err])
  } else {
      console.log('Config file written successfuly to ' + CONFIG_PATH)
      console.log('Config:', config)
      AppConfig.UUID = config.UUID;
  }
}


AppConfig.readConfig = function() {

    var result = cep.fs.readFile(CONFIG_PATH);
    var config = null;
    try {

        var config = JSON.parse(result.data);
        //console.log(config)
        AppConfig.UUID = config.UUID;
        //console.log('Read appconfig:', AppConfig)
        console.log('Config file ' + CONFIG_PATH + ' was read successfuly.')
        return config;
    } catch(e) {
        console.warn('Error checking for updates - error parsing json config file(' + CONFIG_PATH + ')', e)
        return null;
    }
}

AppConfig.getPluginVersion = function() {
  return AppConfig.AppVersion;
}

AppConfig.getUUID = function() {
  return AppConfig.UUID || AppConfig.generateUUID();
}

AppConfig.getBuildVersion = function() {

  var version = Math.floor(AppConfig.AppVersion / 10000)
  var mili_version = Math.floor(AppConfig.AppVersion / 100) % 100
  var micro_version = Math.floor(AppConfig.AppVersion) % 100
  var VN = [version, mili_version, micro_version].join('.')

  return VN

}

AppConfig.getVersionString = function() {

  os = csInterface.getOSInformation()
  var name = [];

  if (debugMode === true) {
    name.push('dev')
  }
  if (devMode) {
    name.push(devMode)
  }

  var _os = "";

  name.push(AppConfig.getBuildVersion())

  if(AppConfig.isMac()) {

    _os = _os + "M"
    var _minorVersionParts = os.split('.')
    _os = _os + _minorVersionParts[_minorVersionParts.length - 2]

  } else {
    _os = _os + 'W'

    if (os.indexOf("XP") >= 0 )
    {
      _os += "X";
    }
    else if (os.indexOf("Vista") >= 0 )
    {
      _os += "V";
    }
    else if (os.indexOf(" 7") >= 0 )
    {
      _os += "7";
    }
    else if (os.indexOf(" 8") >= 0 )
    {
      _os += "8";
    }
    else
    {
      _os += "U"; // unknown
    }
  }
  name.push(_os + "." + AppConfig.getHostVersion())

  return name.join('_')
}

AppConfig.getHostVersion = function() {

  var versionString = csInterface.hostEnvironment.appVersion;
  var versionArray = versionString.split(".")

  if(versionArray.length >= 1) {
    hostMajorVersion = parseInt(versionArray[0], 10)
  }

  if(versionArray.length >= 2) {
    hostMinorVersion = parseInt(versionArray[1], 10)
  }

  if(versionArray.length >= 3) {
    hostFixVersion   = parseInt(versionArray[2], 10)
  }

  return [hostMajorVersion, hostMinorVersion, hostFixVersion].join('.')

}

AppConfig.isMac = function() {
  return os.indexOf('Mac') !== -1
}

AppConfig.isWin = function() {
  return os.indexOf('Windows') !== -1
}

return AppConfig

}
