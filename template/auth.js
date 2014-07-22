
var TokenStore = function(pluginAuthId) {

        self = this
        ERROR = [];
        ERROR[0] = 'NO_ERROR';
        ERROR[1] = 'ERR_UNKNOWN';
        ERROR[2] = 'ERR_INVALID_PARAMS';
        ERROR[3] = 'ERR_NOT_FOUND';
        ERROR[4] = 'ERR_CANT_READ';
        ERROR[5] = 'ERR_UNSUPPORTED_ENCODING';
        ERROR[6] = 'ERR_CANT_WRITE';
        ERROR[7] = 'ERR_OUT_OF_SPACE';
        ERROR[8] = 'ERR_NOT_FILE';
        ERROR[9] = 'ERR_NOT_DIRECTORY';
        ERROR[10]= 'ERR_FILE_EXISTS';

        var CONFIG_DIR_PATH = new CSInterface().getSystemPath(SystemPath.USER_DATA) + '/.' + pluginAuthId + '/'
        var CONFIG_PATH  = CONFIG_DIR_PATH + '.' + pluginAuthId + '-token';
        console.log(CONFIG_PATH)
        self.initConfigDirectory = function() {

            var result = cep.fs.makedir(CONFIG_DIR_PATH);
            console.log('Config directory check result:', result)
            if(result.err !== cep.fs.NO_ERROR && (result.err !== cep.fs.ERR_NOT_FOUND)) {
                console.warn('Error creating extension config directory: Problem reading extension config dir (' + CONFIG_DIR_PATH + '): ' + ERROR[result.err]);
            } else if(result.err === cep.fs.ERR_NOT_FOUND) {
                console.log('Extension config dir does not exists, proceeding..');
            } else {
                console.log('Extension config dir has been created.')
            }

            return result;
        }

        self.initConfigDirectory()

        self.saveToken = function(token) {
            self._saveToken(token);
        }

        self.getToken = function() {
            return self._getToken();
        }

        self._getToken = function() {

            var result = cep.fs.readFile(CONFIG_PATH)

            if(result.err === cep.fs.ERR_NOT_FOUND) {
                return null;
            } else if(result.err === cep.fs.NO_ERROR) {
                return result.data;
            } else {
                console.error('Error getting token:' + ERROR[data.err]);
                return null;
            }
        }

        self._saveToken = function(token) {

            var result = cep.fs.writeFile(CONFIG_PATH, token)

            if(result.err === cep.fs.NO_ERROR) {
                return result.data;
            } else {
                console.error('Error saving token' + ERROR[data.err]);
                return result;
            }
        }

        self.invalidate = function() {
            console.log(CONFIG_PATH)
            return cep.fs.deleteFile(CONFIG_PATH);
        }

        return self;
};

var AuthService = function(pluginAuthId) {

    var tokenStore = new TokenStore(pluginAuthId)

    var authService = {};

    authService.anonymousToken = null;

    authService.userData = null;

    authService.numberOfAttempts = 0;

    authService.authenticated = false;

    authService.successCallback = function(data, status, headers, config) {

    }

    authService.errorCallback  = function(data, status, headers, config) {
        console.error('error', data, status, headers, config)
    }

    authService.authorize = function() {
        console.log('Authorization')

        //var request = new XmlHttpRequest('GET', );

        // $http({
        //     url: 'https://madebysource.com/api/check-token/' + pluginAuthId,
        //     method: 'GET',
        //     headers: {'Authorization': 'Bearer ' + tokenStore.getToken()}
        // }).success(function(data, status, headers, config) {
        //     console.log('Saved auth token OK')
        //     authService.setAuthToken(tokenStore.getToken())
        //     authService.successCallback(data, status, headers, config);
        // }).error(function(data, status, headers, config) {
        //     console.warn('Token with contents: \n' +  tokenStore.getToken() + ' is invalid, invalidating')
        //     console.log('Invalidation result', tokenStore.invalidate());
        //     authService.errorCallback(data, status, headers, config)
        // })

        var xhr = new XMLHttpRequest()
        xhr.open('GET', 'https://madebysource.com/api/check-token/' + pluginAuthId, true)
        xhr.setRequestHeader("Authorization", 'Bearer ' + authService.getAuthToken());
        xhr.onreadystatechange = function (oEvent) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var data = JSON.parse(xhr.responseText)
                    var status = xhr.status
                    authService.anonymousToken = data
                    authService.successCallback(data, status)
                } else {
                   authService.errorCallback(xhr.responseText, xhr.status)
                }
            }
        }
        xhr.send()
    }

    authService.authenticate = function() {

        //reset internal state
        // authService.anonymousToken = null;
        // authService.userData = null;
        // authService.numberOfAttempts = 0;

        // //do anonymous auth
        // $http({url:'https://auth.firebase.com/auth/anonymous?transport=json&firebase=source', method:'GET'}).
        // success(function(data, status, headers, config) {
        //     authService.anonymousToken = data;
        //     authService.authenticateAsSourceUser()
        //     console.log(data)
        // }).error(function(data, status, headers, config) {
        //     //@TODO error handling
        //     authService.errorCallback(data, status, headers, config)
        // })

        var xhr = new XMLHttpRequest()
        xhr.open('GET', 'https://auth.firebase.com/auth/anonymous?transport=json&firebase=source', true)
        xhr.onreadystatechange = function (oEvent) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    authService.anonymousToken = JSON.parse(xhr.responseText)
                    authService.authenticateAsSourceUser()
                } else {
                   authService.errorCallback(xhr.responseText, xhr.status)
                }
            }
        }
        xhr.send()
    }

    authService.authenticateAsSourceUser = function() {
        console.log(authService.anonymousToken)
        var url = 'https://madebysource.com/external-login/' + pluginAuthId + '/?key=' + authService.anonymousToken.user.id;
        authService.openBrowser(url);
        authService.authServiceChecker()
    }

    authService.authServiceChecker = function() {

        authService.numberOfAttempts++;
        console.log('Auth attempt #' + authService.numberOfAttempts);
        authService.getAuthenticatedSourceUserData();
    }

    authService.getAuthenticatedSourceUserData = function() {
        var xhr = new XMLHttpRequest()
        console.log('getAuthenticatedSourceUserData', authService.anonymousToken)
        var url = 'https://source.firebaseio.com/auth/requests/' + authService.anonymousToken.user.id + '.json?auth=' + authService.anonymousToken.token;
        xhr.open('GET', url, true)
        xhr.onreadystatechange = function (oEvent) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var data = JSON.parse(xhr.responseText)
                    if(data && data.user && data.token) {
                        authService.userData = data.user;
                        authService.setAuthToken(data.token)
                        authService.authenticated = true
                        if(authService.successCallback && typeof authService.successCallback === 'function') {
                            var status = xhr.status
                            authService.successCallback(data, status)
                        } else if(typeof successCallback !== 'function') {
                            console.error('authService.succesCallback is not a function')
                        }
                    } else {
                        if(!authService.authenticated) {
                            authService.numberOfAttempts++;
                            setTimeout(authService.getAuthenticatedSourceUserData, 500)
                        }
                    }
                } else {
                    var data = JSON.parse(xhr.responseText)
                    var status = xhr.status
                    if(authService.errorCallback && typeof authService.errorCallback === 'function') {
                        console.log('getAuthenticatedSourceUserData():', data, status)
                        authService.errorCallback(xhr.responseText, xhr.status)
                    } else if(typeof authService.errorCallback !== 'function') {
                        console.error('authService.errorCallback is not a function')
                    }
                }
            }
        }
        xhr.send()
        // $http({url:url, method: 'GET'}).success(function(data, status, headers, config) {
        //     if(data && data.user && data.token) {
        //         authService.userData = data.user;
        //         //clearInterval(authService.checkerId)
        //         authService.setAuthToken(data.token)
        //         if(authService.successCallback && typeof authService.successCallback === 'function') {
        //             authService.successCallback(data, status, headers, config)
        //         } else if(typeof successCallback !== 'function') {
        //             console.error('authService.succesCallback is not a function')
        //         }
        //     } else {
        //         authService.numberOfAttempts++;
        //         setTimeout(authService.getAuthenticatedSourceUserData, 500)
        //     }
        // }).error(function(data, status, headers, config) {
        //     if(authService.errorCallback && typeof authService.errorCallback === 'function') {
        //         console.log('getAuthenticatedSourceUserData():', data, status, headers)
        //         authService.errorCallback(data, status, headers, config)
        //     } else if(typeof authService.errorCallback !== 'function') {
        //         console.error('authService.errorCallback is not a function')
        //     }
        // })
    }

    authService.setAuthToken = function(token) {

        try {
            tokenStore.saveToken(token)
            //$http.defaults.headers.common.Authorization = 'Bearer ' + token;
            console.error('Set global Bearer header with token for all requests !')
        }
        catch(e) {
            console.error('Error saving token:' + e);
        }

    }

    authService.getAuthToken = function() {

        try {
            return tokenStore.getToken();
        }
        catch(e) {
            console.warn('Erorr getting token:' + e)
            return null;
        }
    }

    authService.tokenExists = function() {
        if(authService.getAuthToken() !== null) {
            return true;
        } else {
            return false;
        }
    }

    authService.openBrowser = function(url) {
        var rootDir = "/";
        var isWindows = window.navigator.platform.toLowerCase().indexOf("win") > -1;
        if (isWindows) {
            rootDir = csInterface.getSystemPath(SystemPath.COMMON_FILES).substring(0, 3);
        }
        var processPath = "/usr/bin/open";

        if (isWindows) {
            processPath = rootDir + "Windows/explorer.exe";
        }

        var proc = window.cep.process.createProcess(processPath, url);

        return proc;
    }

    return authService;
}
