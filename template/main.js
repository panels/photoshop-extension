var bootstraped = false
<% if(panel['requires-auth'] && panel['requires-auth'] === true) {%>
var requiresAuth = true;
var pluginAuthId = '<%= panel['plugin-auth-id'] %>'
<% } else  {%>
var requiresAuth = false;
<% } %>

var checkAuth = function() {
  var iframe  = document.getElementById('app')
  if(requiresAuth) {
    document.body.classList.add('login')
    window.addEventListener("message", function(event) {
    if(event.data && event.data.type === 'authenticationResult') {
      console.log('Extension successfuly authenticated, proceeding to panel')
      setTimeout(init, 500)}}, false)

    iframe.onload = function() {
      var loginMessage = {
        pluginAuthId: pluginAuthId,
        type: 'startLogin'
      }
      iframe.contentWindow.postMessage(loginMessage, '*')
    }
    iframe.src = './login.html'
  }
}

var poll = function () {
  var script = document.createElement('script')
  script.src = 'http://127.0.0.1:37379/_panels/ping?callback=init&random=' + Math.random()
  script.onerror = function () {
    document.body.removeChild(script)
    delete script
    setTimeout(poll, 1000)
  }
  document.body.appendChild(script)
}

window.changeTheme = function(e) {

  var iframe = document.getElementById('app')
  var skinInfo = JSON.parse(window.__adobe_cep__.getHostEnvironment()).appSkinInfo;
  var themeObject = {
    type:'themeChange',
    theme:'dark',
    skinInfo: skinInfo
  }

  iframe.contentWindow.postMessage(themeObject, '*')
}

window.init = function () {
  if (bootstraped) {
    return
  }
  bootstraped = true

  var iframe = document.getElementById('app')
  iframe.onload = function () {
    window.__adobe_cep__.addEventListener("com.adobe.csxs.events.ThemeColorChanged", changeTheme)
    changeTheme()
  }
  iframe.src = 'http://127.0.0.1:37379/?platform=photoshop&debug' + ((requiresAuth === true) ? '&requiresAuth' : '') + ((pluginAuthId) ? pluginAuthId : '')
}

window.onload = checkAuth
