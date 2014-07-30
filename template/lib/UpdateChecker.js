var AppConfig = function() {

  var csInterface = new CSInterface()
  var util = new Util()
  var SLUG_NAME = util.SLUG_NAME
  var CONFIG_PATH = util.CONFIG_PATH
  var CONFIG_DIR_PATH = util.CONFIG_DIR_PATH

  var hostMajorVersion = -1;
  var hostMinorVersion = -1;
  var hostFixVersion   = -1;
  var debugMode = true;
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
    console.warn('Error creating app config directory: Problem reading app config dir (' + CONFIG_DIR_PATH + '): ' + ERROR[result.err]);
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

  if(debugMode) {
    name.push('dev')
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

var UpdateChecker = function() {

    var appConfig = new AppConfig()
    var util = new Util()
    var SLUG_NAME = util.SLUG_NAME

    appConfig.init()

    var csInterface = new CSInterface();

    // update channels enum
    var CHANNEL = {
      BETA: 'beta',
      STABLE: 'stable',
      INTERNAL: 'internal'
    }

    var CurrentChannel = CHANNEL.STABLE;

    var UpdateChecker = {};

    UpdateChecker.UPDATE_URL = 'https://madebysource.com/api/update/' + SLUG_NAME + '/v1/?channel=' + CurrentChannel;

    UpdateChecker.openBrowser = window.cs.openURLInDefaultBrowser

    UpdateChecker.checkForUpdates = function() {

        var payload = {
            "plugin_version": appConfig.getPluginVersion(),
            "uuid": appConfig.getUUID(),
            "os_version": csInterface.getOSInformation(),
            "photoshop_version": csInterface.hostEnvironment.appVersion,
            "events": [], //TODO hook event tracking mechanism
            "channel": CHANNEL.STABLE
        }
        console.log('Checking updates, payload:', payload)
        var xhr = new XMLHttpRequest()
        xhr.open('POST', UpdateChecker.UPDATE_URL, true)
        xhr.setRequestHeader("Content-type","application/json");
        xhr.timeout = 10000;
        xhr.ontimeout = function () { console.warn('Update request timed out, proceeding...')}
        //xhr.setRequestHeader("Authorization", 'Bearer ' + authService.getAuthToken());
        xhr.onreadystatechange = function (oEvent) {
            if (xhr.readyState === 4) {
                var data = JSON.parse(xhr.responseText)
                var status = xhr.status
                if (xhr.status === 200) {
                   console.log('Latest plugin version: ' + data.latest_version + ', current version: ' + appConfig.AppVersion)
                   if(data.latest_version > appConfig.AppVersion) {
                      UpdateChecker.confirmUpdate(data.url)
                   }
                } else {
                   console.warn('Error getting update check response', data, status)
                }
            }
        }
        xhr.send(JSON.stringify(payload))
    }

    UpdateChecker.confirmUpdate = function(url) {
      var script = "confirm('New version of extension is available. Do you want to download it ?')"
      csInterface.evalScript(script, function(result) {
        if(result === 'true') {
          UpdateChecker.openBrowser(url);
        } else {
          console.warn('Update not confirmed, JSX result:', result )
        }
      })
    }

    return UpdateChecker
}
