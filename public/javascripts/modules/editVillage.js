/*
  通信を行う
*/
var editVillage = angular.module('editVillage', ['ngAnimate']);

editVillage.factory('$edvil', ['$http', '$animate', function villageFactory ($http, $animate) {

  // 共通で仕様するビューモデル、及びインベントリ
  var vil = {
    /* default params */
    vid: 0,

    name: "",

    user: {
      name: "",
    },

  };

  var insertFlag = false;
  var insert = function (callback) {
    if (insertFlag) return;
    insertFlag = true;
    var promise = $http.post('/json/new/vil', vil);
    promise.success(function(data) {
      insertFlag = false;
      if (typeof callback === 'function') callback(data);
    });
  };

  return {
    /* public api and properties */
    vil: vil,
    insert: insert,
  };

}]);
