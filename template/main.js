var bootstraped = false
<% if(panel['requires-auth'] && panel['requires-auth'] === true) {%>
var requiresAuth = true;
var pluginAuthId = '<%= panel['plugin-auth-id'] %>'
var authToken = null;
<% } else  {%>
var requiresAuth = false;
var pluginAuthId = null
var authToken = null
<% } %>

var iframe = null

var poll = function () {
  var script = document.createElement('script')
  script.src = 'http://127.0.0.1:<%= panel.port %>/_panels/ping?callback=init&random=' + Math.random()
  script.onerror = function () {
    document.body.removeChild(script)
    delete script
    setTimeout(poll, 1000)
  }
  document.body.appendChild(script)
}

window.changeTheme = function(e) {
  var skinInfo = JSON.parse(window.__adobe_cep__.getHostEnvironment()).appSkinInfo;
  var themeObject = {
    type:'themeChange',
    theme:'dark',
    skinInfo: skinInfo
  }

  iframe.contentWindow.postMessage(themeObject, '*')
}

var checkAuth = function() {
  if (requiresAuth) {
    document.body.classList.add('login')
    window.addEventListener("message", function(event) {
    if(event.data && event.data.type === 'authenticationResult') {
      console.log('Extension successfuly authenticated, proceeding to panel')
      console.log('Passing auth token:' + event.data.token)
      authToken = event.data.token;
      iframe.onload = function () {
      window.__adobe_cep__ && window.__adobe_cep__.addEventListener("com.adobe.csxs.events.ThemeColorChanged", changeTheme)
      document.body.classList.add('loaded')
      changeTheme()
      }
      iframe.src = 'http://127.0.0.1:<%= panel.port %>/?platform=photoshop&debug' + ((requiresAuth === true) ? '&token=' + authToken : '') + ((pluginAuthId) ? '&pluginAuthId=' + pluginAuthId : '')
      if(!event.data.tokenExisted) {
        alert('You have been successfuly logged in.')
      }
    }
    }, false)

    iframe.onload = function() {
      var loginMessage = {
        pluginAuthId: pluginAuthId,
        type: 'startLogin',
      }
      iframe.contentWindow.postMessage(loginMessage, '*')
    }
    iframe.src = './login.html'
  }
}

//deprecated
window.init = function () {
  if (bootstraped) {
    return
  }
  bootstraped = true

  iframe = document.getElementById('app')
  iframe.onload = function () {
    window.__adobe_cep__ && window.__adobe_cep__.addEventListener("com.adobe.csxs.events.ThemeColorChanged", changeTheme)
    document.body.classList.add('loaded')
    changeTheme()
  }

  if (requiresAuth) {
    checkAuth()
  } else {
    iframe.src = 'http://127.0.0.1:<%= panel.port %>/?platform=photoshop&debug' + ((requiresAuth === true) ? '&token=' + authToken : '') + ((pluginAuthId) ? '&pluginAuthId=' + pluginAuthId : '')
  }
}

window.onload = poll
