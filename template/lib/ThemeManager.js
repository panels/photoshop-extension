var ThemeManager = function() {

    var self = this;

    this.getSkinType = function(bgdColor) {

        if(bgdColor == '343434' || bgdColor == '2E2E2E') {
            return 0;
        } else if(bgdColor == '535353' || bgdColor == '494949') {
             return 1;
        } else if(bgdColor == 'b8b8b8' || bgdColor == 'afafaf') {
             return 2;
         } else if(bgdColor == 'd6d6d6' || bgdColor == 'd1d1d1') {
             return 3
         } else {
            //error
            return -1;
         }
    }

    this.handleThemeChange = function(skinInfo) {
      if(!skinInfo) {
        throw 'Please provide skinInfo instance as parameter'
      }
      console.log('Firing handle theme change')
      function toHex(color, delta) {
          function computeValue(value, delta) {
              var computedValue = !isNaN(delta) ? value + delta : value;
              if (computedValue < 0) {
                  computedValue = 0;
              } else if (computedValue > 255) {
                  computedValue = 255;
              }

              computedValue = Math.floor(computedValue);

              computedValue = computedValue.toString(16);
              return computedValue.length === 1 ? "0" + computedValue : computedValue;
          }

          var hex = "";
          if (color) {
              hex = computeValue(color.red, delta) + computeValue(color.green, delta) + computeValue(color.blue, delta);
          }
          return hex;
      }

      var bgdColor = toHex(skinInfo.panelBackgroundColor.color);
      var skinType = 'skin-' + self.getSkinType(bgdColor)

          document.body.classList.remove('dark');
          document.body.classList.remove('light');

          if(skinType == 'skin-0' || skinType == 'skin-1') {
              document.body.classList.add('dark');
          }

          if(skinType == 'skin-2' || skinType == 'skin-3') {
              document.body.classList.add('light');
          }

          document.body.classList.remove('skin-0');
          document.body.classList.remove('skin-1');
          document.body.classList.remove('skin-2');
          document.body.classList.remove('skin-3');
          document.body.classList.add('skin-' + self.getSkinType(bgdColor))
    }
  }