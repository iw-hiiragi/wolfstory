
var indexApp = angular.module('indexApp', ['ui.bootstrap', 'ui.router', 'ngAnimate', 'editVillage']);

/*
  ルーティング
*/
indexApp.config(['$stateProvider', '$urlRouterProvider', '$locationProvider', function($stateProvider, $urlRouterProvider, $locationProvider) {
  //
  // setting html5 mode
  $locationProvider.html5Mode(true).hashPrefix('!');

  //
  // For any unmatched url, redirect to /
  $urlRouterProvider.otherwise('/');

  //
  // Now set up the states
  $stateProvider
    .state('index', {
      url: '/',
      templateUrl: '/templates/index/index.html',
    })
    .state('login', {
      url: '/login',
      templateUrl: '/templates/index/login.html',
      controller: function($scope) {

      }
    })
    .state('list', {
      abstract: true,
      url: '/list',
      template: '<ui-view/>',
    })
    .state('list.vil', {
      url: '/vil',
      templateUrl: '/templates/index/villist.html',
      controller: ['$scope', '$http', function($scope, $http) {
        $scope.activeVillages = [];
        $scope.nowLoading = true;

        $scope.ajaxGetActiveVillages = function () {
          var promise = $http.get('/json/villist/active');
          promise.success(function(data) {
            $scope.activeVillages = data.villist;
            $scope.nowLoading = false;
          });
        };

        $scope.enter = function(vid) {
          var promise = $http.post('/json/join', {vid:vid});
          promise.success(function(data) {
            console.log(data);
          });
        };
      }],
    })
    .state('list.users', {
      url: '/users',
      templateUrl: '/templates/index/userlist.html',
      controller: ['$scope', '$http', function ($scope, $http) {
        $scope.users = [];
        $scope.nowLoading = true;

        $scope.ajaxGetUsers = function () {
          var promise = $http.get('/json/list/users');
          promise.success(function(data) {
            $scope.users = data.list;
            $scope.nowLoading = false;
          });
        };
      }],
    })
    .state('new', {
      abstract: true,
      url: '/new',
      template: '<ui-view/>',
    })
    .state('new.vil', {
      url: '/vil',
      templateUrl: '/templates/index/mkvil.html',
      controller: ['$scope', '$http', '$state', '$edvil', function($scope, $http, $state, $edvil) {
        $scope.vil = $edvil.vil;
        $scope.insert = function () {
          $edvil.insert(function(ret) {
            if (ret.error) {
              console.log(ret.error);
            }
            else {
              $state.go('list.vil');
            }
          });
        };
      }],
    });

}]);

indexApp.value('indexCommon', {login:false});

indexApp.controller('AjaxPageController', ['$scope', 'indexCommon', function ($scope, indexCommon) {
  $scope.setLogin = function (bl) { indexCommon.login = bl; };
}]);

/*
  
*/

indexApp.controller('NavigatorController', ['$scope', 'indexCommon', function ($scope, indexCommon){

  $scope.menuList = [
    { title: 'トップページ', sref: 'index' },
    { title: 'ログイン', sref: 'login', not_logged_in: true },
    { title: 'ログアウト', href: './user/logout', logged_in: true },
    { title: '募集中の村一覧', sref: 'list.vil' },
    { title: 'ユーザー一覧', sref: 'list.users' }, 
    { title: '村を作成', sref: 'new.vil' },
    { title: 'TEST', href: 'test'}
  ];

  $scope.loggedIn = function (menu) {
    if (menu.logged_in) {
      return indexCommon.login;
    }
    else if (menu.not_logged_in) {
      return !indexCommon.login;
    }
    else {
      return true;
    }
  };

}]);