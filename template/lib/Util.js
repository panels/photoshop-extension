var Util = function() {
	  var util = {}
	  var SLUG_NAME = util.SLUG_NAME = '<%= panel.madebysource && panel.madebysource.id %>'

    util.EXTENSION_VERSION = '<%=panel['extensionVersion'] %>'

    util.CONFIG_DIR_PATH = cs.getSystemPath(SystemPath.USER_DATA) + '/' + SLUG_NAME + (window.devMode ? '-dev-' + window.devMode : '') + '/'
    util.CONFIG_PATH = util.CONFIG_DIR_PATH + 'config.json';
    util.TOKEN_PATH = util.CONFIG_DIR_PATH + 'token';

    util.getErrorMessage = function(ERR_NUMBER) {
    	var ERROR = []

  		ERROR[0] = 'NO_ERROR'
  		ERROR[1] = 'ERR_UNKNOWN'
  		ERROR[2] = 'ERR_INVALID_PARAMS'
  		ERROR[3] = 'ERR_NOT_FOUND'
  		ERROR[4] = 'ERR_CANT_READ'
  		ERROR[5] = 'ERR_UNSUPPORTED_ENCODING'
  		ERROR[6] = 'ERR_CANT_WRITE'
  		ERROR[7] = 'ERR_OUT_OF_SPACE'
  		ERROR[8] = 'ERR_NOT_FILE'
  		ERROR[9] = 'ERR_NOT_DIRECTORY'
  		ERROR[10]= 'ERR_FILE_EXISTS'

  		if(ERROR[ERR_NUMBER]) {
  			return ERROR[ERR_NUMBER]
  		} else {
  			throw 'Unknown error number:' + ERR_NUMBER
  		}
    }

	return util
}
