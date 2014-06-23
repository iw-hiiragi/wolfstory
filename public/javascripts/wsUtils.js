
var wsUtils = angular.module('wsUtils', ['ui.bootstrap']);

wsUtils.factory('wsAlert', ['$modal', '$sce', function ($modal, $sce) {
  
  var open = function (/* content, title, okStr, cancelStr, icon, lock, callback */) {

    var content, title, okStr, cancelStr, icon, cb, lock;
    for (var i=0, len=arguments.length; i<len; i++) {
      if (typeof arguments[i] === 'function') {
        cb = arguments[i];
        break;
      }
      else if (typeof arguments[i] === 'boolean') {
        lock = arguments[i];
      }
      else {
        var v = arguments[i];
        switch (i) {
          case 0:
            content = v;
            break;
          case 1:
            title = v;
            break;
          case 2:
            okStr = v;
            break;
          case 3:
            cancelStr = v;
            break;
          case 4:
            icon = v;
            break;
        }
      }
    }

    var _str = {
      title: title || "確認",
      content: content || "よろしいですか？",
      ok: okStr || "OK",
      cancel: cancelStr || null,
    };


    var instance = $modal.open({
      templateUrl: '/templates/wsUtils/wsAlert.html',
      resolve: {},
      windowClass: 'wsAlert-modal',
      backdrop: (lock) ? 'static' : true,
      keyboard: (lock) ? false : true,
      controller: ['$scope', '$modalInstance', function modalController($scope, $modalInstance) {
        $scope.str = _str;
        $scope.str.content = $sce.trustAsHtml($scope.str.content);
        $scope.ok = function() {
          $modalInstance.close({ok:true});
        };
        $scope.cancel = function () {
          $modalInstance.close({cancel:true});
        };
      }]
    });

    instance.result.then(function(ret) {
      if (cb) cb(ret);
    });

  };

  var warning = function (content, title, okStr, cancelStr, callback) {
    return open(content, title, okStr, cancelStr, callback);
  };

  var error = function (content, title, okStr, cancelStr, callback) {
    return open(content, title, okStr, cancelStr, callback);
  };  

  var info = function (content, title, okStr, cancelStr, callback) {
    return open(content, title, okStr, cancelStr, callback);
  };

  return {
    open: open,
    warning: warning,
    error: error, 
    info: info,
  };

}]);