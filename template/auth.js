var FS_ERRORS = {
  '0': 'NO_ERROR',
  '1': 'ERR_UNKNOWN',
  '2': 'ERR_INVALID_PARAMS',
  '3': 'ERR_NOT_FOUND',
  '4': 'ERR_CANT_READ',
  '5': 'ERR_UNSUPPORTED_ENCODING',
  '6': 'ERR_CANT_WRITE',
  '7': 'ERR_OUT_OF_SPACE',
  '8': 'ERR_NOT_FILE',
  '9': 'ERR_NOT_DIRECTORY',
  '10':'ERR_FILE_EXISTS',
}

var TokenStore = function (pluginAuthId) {
  this.pluginAuthId = pluginAuthId
  this.configDirPath = cs.getSystemPath(SystemPath.USER_DATA) + '/.' + this.pluginAuthId + '/'
  this.configPath = this.configDirPath + '.' + this.pluginAuthId + '-token';

  var directoryCreation = cep.fs.makedir(this.configDirPath);
  console.log('Config directory check result:', directoryCreation)
  if(directoryCreation.err !== cep.fs.NO_ERROR && (directoryCreation.err !== cep.fs.ERR_NOT_FOUND)) {
    console.warn('Error creating extension config directory: Problem reading extension config dir (' + this.configDirPath + '): ' + FS_ERRORS[directoryCreation.err]);
  } else if(directoryCreation.err === cep.fs.ERR_NOT_FOUND) {
    console.log('Extension config dir does not exists, proceeding..');
  } else {
    console.log('Extension config dir has been created.')
  }
};

TokenStore.prototype.saveToken = function(token) {
  var result = cep.fs.writeFile(this.configPath, token)

  if(result.err === cep.fs.NO_ERROR) {
    return result.data;
  } else {
    console.error('Error saving token' + FS_ERRORS[data.err]);
    return result;
  }
}

TokenStore.prototype.getToken = function(token) {
  var result = cep.fs.readFile(this.configPath)

  if(result.err === cep.fs.ERR_NOT_FOUND) {
    return null;
  } else if(result.err === cep.fs.NO_ERROR) {
    return result.data;
  } else {
    console.error('Error getting token:' + FS_ERRORS[data.err]);
    return null;
  }
}

TokenStore.prototype.invalidate = function() {
  return cep.fs.deleteFile(this.configPath);
}

var AuthService = function (pluginAuthId) {
  this.tokenStore = new TokenStore(pluginAuthId)

  this.anonymousToken = null;
  this.userData = null;
  this.numberOfAttempts = 0;
  this.authenticated = false;
}

AuthService.prototype.authorize = function () {
  console.log('Authorization')
  var self = this

  var xhr = new XMLHttpRequest()
  xhr.open('GET', 'https://madebysource.com/api/check-token/' + pluginAuthId, true)
  xhr.setRequestHeader("Authorization", 'Bearer ' + this.tokenStore.getToken())
  xhr.onreadystatechange = function (oEvent) {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        var data = JSON.parse(xhr.responseText)
        var status = xhr.status
        self.anonymousToken = data
        self.successCallback(data, status)
      } else {
        self.errorCallback(xhr.responseText, xhr.status)
      }
    }
  }
  xhr.send()
}

AuthService.prototype.authenticate = function () {
  //reset internal state
  this.anonymousToken = null;
  this.userData = null;
  this.numberOfAttempts = 0;
  var self = this

  var xhr = new XMLHttpRequest()
  xhr.open('GET', 'https://auth.firebase.com/auth/anonymous?transport=json&firebase=source', true)
  xhr.onreadystatechange = function (oEvent) {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        self.anonymousToken = JSON.parse(xhr.responseText)
        self.authenticateAsSourceUser()
      } else {
        self.errorCallback(xhr.responseText, xhr.status)
      }
    }
  }
  xhr.send()
}

AuthService.prototype.authenticateAsSourceUser = function () {
  console.log(this.anonymousToken)
  var url = 'https://madebysource.com/external-login/' + pluginAuthId + '/?key=' + this.anonymousToken.user.id;
  cs.openURLInDefaultBrowser(url)
  self = this
  setTimeout(function () {
    self.authServiceChecker()
  }, 3000)
}

AuthService.prototype.authServiceChecker = function () {
  this.numberOfAttempts++;
  console.log('Auth attempt #' + this.numberOfAttempts);
  this.getAuthenticatedSourceUserData();
}

AuthService.prototype.getAuthenticatedSourceUserData = function () {
  var self = this
  var xhr = new XMLHttpRequest()
  console.log('getAuthenticatedSourceUserData', self.anonymousToken)

  var url = 'https://source.firebaseio.com/auth/requests/' + self.anonymousToken.user.id + '.json?auth=' + self.anonymousToken.token;
  xhr.open('GET', url, true)
  xhr.onreadystatechange = function (oEvent) {
    if (xhr.readyState === 4 && xhr.status === 200) {
      var data;
      try {
        data = JSON.parse(xhr.responseText)
      } catch (e) {}

      if (data && data.user && data.token) {
        self.userData = data.user;
        self.tokenStore.saveToken(data.token)
        self.authenticated = true

        var status = xhr.status
        self.authorize()
        // self.successCallback(data, status) will be called by success of authorize
      } else {
        if (!self.authenticated) {
          self.numberOfAttempts++;
          setTimeout(function () {
            self.getAuthenticatedSourceUserData()
          }, 1000)
        }
      }
    }
  }
  xhr.send()
}

AuthService.prototype.tokenExists = function () {
  return !!this.tokenStore.getToken()
}

AuthService.prototype.logout = function () {
  this.tokenStore.invalidate()
  window.location.reload()
}
