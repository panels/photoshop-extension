var bootstraped = false

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

window.init = function () {
  if (bootstraped) {
    return
  }
  bootstraped = true

  var iframe = document.getElementById('app')
  iframe.src = 'http://127.0.0.1:<%= panel.port %>/?platform=photoshop<% print(typeof debug !== "undefined" ? "&debug" : "") %>'
  iframe.onload = function () {
    document.body.classList.add('loaded')
  }
}

window.onload = poll
