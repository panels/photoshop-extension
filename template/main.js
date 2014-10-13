window.cs = new CSInterface()
var bootstraped = false
var appConfig = new AppConfig()

<% if(panel['requires-auth'] && panel['requires-auth'] === true) {%>
var requiresAuth = true
var pluginAuthId = '<%= panel['sourceProductID'] %>'
var authToken = null
<% } else  {%>
var requiresAuth = false
var pluginAuthId = null
var authToken = null
<% } %>

var iframe = null

var generatorEnabled = false
var enableGenerator = function () {
  if (generatorEnabled) {
    return
  }
  cs.evalScript('var id=charIDToTypeID,a=new ActionReference;a.putProperty(id("Prpr"),id("PlgP")),a.putEnumerated(id("capp"),id("Ordn"),id("Trgt"));var b=new ActionDescriptor;b.putBoolean(id("generatorEnabled"),!0),b.putBoolean(id("generatorDisabled"),!1);var c=new ActionDescriptor;c.putReference(id("null"),a),c.putObject(id("T   "),id("PlgP"),b),executeAction(id("setd"),c,DialogModes.NO);')
  generatorEnabled = true
}

var poll = function () {
  var script = document.createElement('script')
  script.src = 'http://127.0.0.1:<%= panel.port %>/_panels/ping?callback=init&random=' + Math.random()
  script.onerror = function () {
    enableGenerator()
    document.body.removeChild(script)
    delete script
    setTimeout(poll, 1000)
  }
  document.body.appendChild(script)
}

var themeManager = new ThemeManager()
window.changeTheme = function (e) {
  var skinInfo = JSON.parse(window.__adobe_cep__.getHostEnvironment()).appSkinInfo
  themeManager.handleThemeChange(skinInfo)

  var themeObject = {
    type: 'themeChange',
    theme: 'dark',
    skinInfo: skinInfo
  }

  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(themeObject, '*')
  }
}

var loginCallback = false
var showLogin = function (authService) {
  document.getElementById('login-button').innerHTML = 'Sign in with your Source account'
  document.body.classList.add('login')
  if (!loginCallback) {
    document.getElementById('login-button').addEventListener('click', function (e) {
      e.target.innerHTML = 'Please wait…'
      authService.authenticate()
      return false
    })
  }
}

var checkAuth = function() {
  var authService = new AuthService(pluginAuthId)

  authService.errorCallback = function(data, status) {
    if (status == 400 || status === 401 || status === 403) {
      console.log('Using expired or invalid token, should be invalidated')
      console.log('Invalidation result', authService.tokenStore.invalidate())
    } else if (status == 0) {
      if (!navigator.onLine) {
        alert('This extension needs internet connection for full functionality. Please check your internet connection and try again.\n\nSorry for that, offline version is high on our priority list.')
      }
    } else {
      alert('Unexpected error: ' + data  + 'Status:' + status + ' Please try again later. If problem persist, contact our support at team@madebysource.com')
    }

    if (status === 400 || status === 401 || status === 403) {
      showLogin(authService)
    }
  }

  authService.successCallback = function(data, status) {
    console.log('Auth suceeded')
    authToken = authService.tokenStore.getToken()
    startPanel()
  }

  if (authService.tokenExists()) {
    console.log('Checking existing token', authService.tokenStore.getToken())
    authService.authorize()
  } else {
    showLogin(authService)
  }
}

var startPanel = function () {
  document.body.classList.remove('login')

  var url = 'http://127.0.0.1:<%= panel.port %>/panel/?platform=photoshop&version=' + appConfig.getVersionString()

  if (requiresAuth === true) {
    url += '&token=' + authToken
  }

  if (pluginAuthId != null) {
    url += '&pluginAuthId=' + pluginAuthId
  }

  if (<%= typeof debug !== 'undefined' && debug ? 'true' : 'false' %>) {
    url += '&debug'
  }

  iframe.src = url
}

window.init = function () {
  if (bootstraped) {
    return
  }
  bootstraped = true

  <% if(panel['update-checker'] && panel['update-checker'] === true) {%>
  //initialize and run update check, fail silently with log warn in case of any error
  var updates = new UpdateChecker()
  updates.checkForUpdates()
  <% } %>

  iframe = document.getElementById('app')
  iframe.onload = function () {
    document.body.classList.add('loaded')
    changeTheme()
  }

  if (requiresAuth) {
    checkAuth()
  } else {
    startPanel()
  }
}

window.__adobe_cep__ && window.__adobe_cep__.addEventListener('com.adobe.csxs.events.ThemeColorChanged', changeTheme)
window.addEventListener('load', changeTheme, false)
window.addEventListener('load', poll, false)

window.addEventListener('message', function (e) {
  if (e.data === 'logout') {
    var authService = new AuthService(pluginAuthId)
    authService.logout()
    setTimeout(function () {
      window.location.reload()
    })
  }
}, false)

<% if (typeof debug === 'undefined' || debug === false) { %>
var e = new CSEvent('com.adobe.PhotoshopPersistent', 'APPLICATION')
e.extensionId = '<%= panel.identifier %>'
cs.dispatchEvent(e)
<% } %>
