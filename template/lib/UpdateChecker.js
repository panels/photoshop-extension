var UpdateChecker = function() {

    var appConfig = new AppConfig()
    var util = new Util()
    var SLUG_NAME = util.SLUG_NAME

    appConfig.init()

    var UpdateChecker = {};

    UpdateChecker.UPDATE_URL = 'https://madebysource.com/api/update/' + SLUG_NAME + '/v1/';

    UpdateChecker.openBrowser = window.cs.openURLInDefaultBrowser

    UpdateChecker.checkForUpdates = function() {

        var payload = {
            "plugin_version": appConfig.getPluginVersion(),
            "uuid": appConfig.getUUID(),
            "os_version": cs.getOSInformation(),
            "photoshop_version": cs.hostEnvironment.appVersion,
            "events": [], //TODO hook event tracking mechanism
            "channel": '<%= panel.sourceChannel || 'stable' %>'
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
                var data;
                try {
                  data = JSON.parse(xhr.responseText)
                } catch (e) {}
                if (xhr.status === 200 && data) {
                   console.log('Latest plugin version: ' + data.latest_version + ', current version: ' + appConfig.AppVersion)
                   if(data.latest_version > appConfig.AppVersion) {
                      UpdateChecker.confirmUpdate(data.url)
                   }
                } else {
                   console.warn('Error getting update check response', data, xhr.status)
                }
            }
        }
        xhr.send(JSON.stringify(payload))
    }

    UpdateChecker.confirmUpdate = function(url) {
      var script = "confirm('New version of extension is available. Do you want to download it?')"
      cs.evalScript(script, function(result) {
        if(result === 'true') {
          UpdateChecker.openBrowser(url);
        } else {
          console.warn('Update not confirmed, JSX result:', result )
        }
      })
    }

    return UpdateChecker
}
