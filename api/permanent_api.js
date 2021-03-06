/*
Permanent Legacy Foundation - permanent.org
Author: Jerry Peters 5-15-2018
*/

var permanent = (function () {
  'use strict';

  var view_container;
  var docBody;
  var data_url;
  var the_data;
  var popup;
  var popup_url;
  var VERSION = '1.0.0';

  // Event handlers
  var handlers = {
    onLoaded: null
  };

  // Public Methods
  var publicMethods = {
    onLoaded: (callback) => {
      handlers.onLoaded = callback;
      return this;
    }
  };

  function init() {
    view_container = document.querySelector("[permanent-view]");
    docBody = document.querySelector("[permanent-data]");
    data_url = docBody.getAttribute('permanent-data');
    // popup = document.querySelector("[permanent-popup]");

    getData();

    // if (popup) {
    //   getPopUp();
    // }
  }

  function getData() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', data_url, true);
    xhr.onload = function (e) {
      if (this.status === 200) {
        the_data = JSON.parse(this.response);
        dataLoaded();
      }
    };
    xhr.send();
  }

  function dataLoaded() {
    checkProfile();
    checkView();

    if (typeof handlers.onLoaded === "function") {
      handlers.onLoaded();
    }
  }

  function checkView() {
    var repeats = document.querySelectorAll("[p-repeat]");
    var shifts = document.querySelectorAll("[p-shift]");
    var binds = document.querySelector("[p-bind]");

    if (view_container) {
      // Repeat Properties
      repeats.forEach(function (repeater) {
        var attrval = repeater.getAttribute('p-repeat');
        var scope = attrval.split('in')[1].trim();
        var data = the_data[scope];

        if (data) {


          data.forEach(function (obj) {
            var rpt = repeater.cloneNode();
            if (rpt.hasAttribute('p-click')) {
              rpt.onclick = function (evt) {
                OnClick(evt, obj);
              };
            }

            checkTemplateStrings(obj, rpt);

            if (rpt.hasAttribute('p-eventHld')) {
              var binder = rpt.getAttribute('p-eventHld');
              if (rpt.onclick) {

              }
              else {
                rpt.onclick = function (evt) {
                  window[binder](evt, obj);
                };
              }
            }

            for (var i = 0; i < repeater.children.length; i++) {
              var child = repeater.children[i];
              var div = child.cloneNode(true);
              bindChild(obj, div);
              rpt.appendChild(div);
            }
            repeater.parentNode.appendChild(rpt);
          });
        }
        repeater.remove();
      });


      // Shift Properties
      shifts.forEach(function (shift) {
        var attrval = shift.getAttribute('p-shift');
        var [scope, target] = attrval.split(' as ');
        var data = the_data[scope][0];

        if (data) {
          bindChild(data, shift);
        } else {
          throw new Error('Invalid Scope.');
        }
      });

    }
  }

  function bindFileView(pop, file) {
    var fileview = pop.querySelector('[permanent-file-view]');
    for (var i = 0; i < fileview.children.length; i++) {
      var child = fileview.children[i];
      bindChild(file, child);
    }
  }

  function checkProfile() {
    var profile = document.querySelector("[permanent-profile]");
    if (profile && profile.children) {
      for (var i = 0; i < profile.children.length; i++) {
        var child = profile.children[i];
        bindChild(the_data['Profile'], child);
      };
    }
  }

  /**
   * Get attribute data
   *
   * @param  {Object} scope
   * @param  {Object} child
   * @param  {String} attribute
   *
   * @return {Void}
   */
  function attributeData(scope, child, attribute) {
    var data = child.getAttribute(attribute).split('.')[1];

    if (data) {
      return scope[data];
    } else {
      throw new Error('No data found for ' + attribute);
    }
  }

  function bindChild(scope, child) {

    // Include data into the tag
    if (child.hasAttribute('p-bind')) {
      child.innerText = attributeData(scope, child, 'p-bind');
    }

    // Images Src or Background
    if (child.hasAttribute('p-src')) {
      child.setAttribute('src', attributeData(scope, child, 'p-src'));
    }
    else if (child.hasAttribute('p-bkgrd')) {
      child.style.backgroundImage = "url(" + attributeData(scope, child, 'p-bkgrd') + ")";
    }

    // Add alt attribute
    if (child.hasAttribute('p-alt')) {
      child.setAttribute('alt', attributeData(scope, child, 'p-alt'));
    }

    // Show if not empty
    if (child.hasAttribute('p-show')) {
      if (!attributeData(scope, child, 'p-show')) {
        child.display = "none";
      }
    }

    checkTemplateStrings(scope, child);

    // Recursive
    if (child.children.length > 0) {
      for (var i = 0; i < child.children.length; i++) {
        var isRpt = child.getAttribute('p-repeat');
        if (isRpt) {
          checkRepeats(child, scope);
        }
        bindChild(scope, child.children[i]);
      }
    }
  }

  function checkRepeats(element, data) {
    var attrval = element.getAttribute('p-repeat');
    var scope = attrval.split('in')[1].trim();
    if (scope.indexOf('.') > -1) {
      scope = scope.split('.')[1];
    }
    var dataSubset = data[scope];

    if (dataSubset) {

      dataSubset.forEach(function (obj) {
        var rpt = element.cloneNode();
        if (rpt.hasAttribute('p-click')) {
          rpt.onclick = function (evt) {
            OnClick(evt, obj);
          };
        }

        // checkTemplateStrings(obj, rpt);

        if (rpt.hasAttribute('p-eventHld')) {
          var binder = rpt.getAttribute('p-eventHld');
          if (rpt.onclick) {

          }
          else {
            rpt.onclick = function (evt) {
              window[binder](evt, obj);
            };
          }
        }

        for (var i = 0; i < element.children.length; i++) {
          var child = element.children[i];
          var div = child.cloneNode(true);
          bindChild(obj, div);
          rpt.appendChild(div);
        }

        if (element.parentNode) {
          element.parentNode.appendChild(rpt);
        }

      });
    }
    element.remove();

  }

  function checkTemplateStrings(scope, child) {
    var attrWhitelist = ['alt', 'src', 'class', 'id', 'href', 'srcset', 'type', 'datetime', 'data-filter'];

    for (var attr of attrWhitelist) {
      if (!child.hasAttribute(attr)) {
        continue
      }

      var interpolated = interpolate(scope, child.getAttribute(attr));
      if (interpolated) {
        child.setAttribute(attr, interpolated);
      }
    }

    var grandChild = child.firstChild;
    while (grandChild) {
      if (grandChild.nodeType === 3 && grandChild.data) {
        var trimmed = grandChild.data.replace(/(?:\r\n|\r|\n)/g, '').trim();
        var interpolated;
        if (trimmed.length) {
          interpolated = interpolate(scope, grandChild.data);
        }

        if (interpolated) {
          grandChild.data = interpolated;
        }
      }
      grandChild = grandChild.nextSibling;
    }
  }

  function interpolate(scope, templateString) {
    var rxp = /{([^}]+)}/g;
    var found = [];
    var curMatch;

    while (curMatch = rxp.exec(templateString)) {
      found.push(curMatch[1]);
    }

    if (!found.length) {
      return false;
    }

    for (var match of found) {
      var binder = match.split('.')[1];
      var replaceWith = scope[binder];
      var replace = '{' + match + '}';
      if (replaceWith) {
        templateString = templateString.replace(replace, replaceWith);
      }
    }

    return templateString
  }

  function StringBuilder() {

    this.theString = null;

    this.append = function (str) {
      if (this.theString === null) {
        this.theString = str;
      }
      else {
        this.theString = this.theString.concat(str);
      }
    };

    this.toString = function () {
      return this.theString;
    };

    this.clear = function () {
      this.theString = null;
    };

    return this;

  }

  function OnClick(evt, args) {
    popup = document.querySelector("[permanent-popup]");

    
    if (popup) {
      getPopUp().then(function () {
        var pop = document.querySelector(".pop-wrapper");
        if (pop) {
          pop.classList.remove('hide');
          bindFileView(pop, args);
        }
      });
    }
  }

  function getPopUp() {

    return new Promise((resolve, reject) => {

      popup_url = docBody.getAttribute('permanent-popup');
      var xhr = new XMLHttpRequest();
      if (popup_url) {
        xhr.open('GET', popup_url, true);
        xhr.onload = function (e) {
          if (this.status === 200) {
            var popwrapper = document.createElement('div');
            popwrapper.classList.add('pop-wrapper');
            popwrapper.classList.add('hide');
            popwrapper.innerHTML = this.response;
            document.body.appendChild(popwrapper);
            addCloseButton(popwrapper);

            resolve();
          }
        };
        xhr.send();
      }
    });
  }

  function addCloseButton(popwrapper) {
    var closeBtn = popwrapper.querySelector('[permanent-btn-close]');
    var mt = closeBtn.getAttribute('permanent-btn-close');

    closeBtn.onclickHandlers = [];
    closeBtn.onclickHandlers.push(mt);
    closeBtn.onclickHandlers.push(function (evt) { OnPopClose(evt, popwrapper); });
    closeBtn.onclick = fireClickHandlers;

  }

  function fireClickHandlers(evt, data) {

    for (var i = 0; i < evt.srcElement.onclickHandlers.length; i++) {
      var dd = evt.srcElement.onclickHandlers[i];
      if (typeof dd == 'string') {
        if (window[dd]) {
          window[dd](evt);
        }
      }
      else {
        dd();
      }
    }
  }

  function OnPopClose(evt, popwrapper) {
    popwrapper.classList.add('hide');
    var pops = document.querySelectorAll(".pop-wrapper");
    for(var i=0;i<pops.length;i++){
      document.body.removeChild(pops[i]);
    }
    
  }



  init();

  return publicMethods;
})();