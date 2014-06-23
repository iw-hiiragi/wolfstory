
var ngApp = angular.module('WolfStory', ['ui.bootstrap', 'ngAnimate', 'wsUtils', 'village']);

var HOST = 'http://dev.localhost.com';

/*
  メインエントリポイント
*/
ngApp.controller('GameWindowController', ['$scope', '$vil', 'wsAlert', function ($scope, $vil, wsAlert) {

  $scope.sceneList = ['loading', 'main', 'error'];
  $scope.gameScene = 'loading';

  setTimeout(function Constructor() {
    $scope.$apply(function () {
      /* uiCallback() */
      $vil.connectServer(function (msg, data) {
        if (!msg) { 
          $scope.$apply(function () {
            $scope.gameScene = 'main';
          });
          return;
        }
        switch (msg) {
          case 'AuthorizeError':
            $scope.gameScene = 'error';
            wsAlert.info('ゲームに参加するには、ログインが必要です。', true, function (ans) {
              window.location.href = HOST + '/#!/login';
            });
            break;
          case 'Disconnected':
            $scope.gameScene = 'error';
            wsAlert.open('You are Disconnected.', true, function (ans) {

            });
            break;
          case 'Reconnection':
            $scope.gameScene = 'error';
            wsAlert.info('通信が切断されました。<br>再接続を試みますか？', '通信エラー', 'はい', 'いいえ', true, function (ans) {
              if (ans.ok) {
                $vil.reconnectServer();
              }
              else {
                window.location.href = HOST + '/';
              }
            });
            break;
          case 'VillageNotFound':
            $scope.gameScene = 'error';
            wsAlert.error('村が見つかりませんでした。', true, function (ans) {
              window.location.href = HOST + '/';
            });
            break;
          case 'VillageEnd':
            $scope.gameScene = 'error';
              wsAlert.error('村が終了しました', true, function (ans) {
              window.location.href = HOST + '/';
            });
            break;
          default:
            console.log('[unknown msg from village.js]', msg, data);
        }
      });
    });
  }, 10);

}]);


/*
  MessageController
 */
ngApp.controller('MessageController', ["$scope", "$vil", function ($scope, $vil) {

  $vil.setMessageCtrlScope($scope);

  $scope.getMessages = function () {
    return $vil.getMessages();
  };
  $scope.getFullName = function (p) {
    return $vil.getFullNameByPlayer(p);
  };
  $scope.isValidIcon = function (url) {
    if (typeof url === 'string' || url instanceof String) return true;
    return false;
  };
  $scope.isValidMessage = function (msg) {
    if (!msg || !msg.step || msg.hidden) return false;
    return true;
  };

}]);


/*
  TimeController
*/

ngApp.controller('TimeController', ['$scope', '$vil', function ($scope, $vil) {

  $vil.setTimeCtrlScope($scope);

  $scope.getRestTimeSec = function () {
    return Math.floor( $vil.getTime() / 1000 );
  };

}]);

/*
  
*/
ngApp.controller('InfoController', ['$scope', '$vil', function ($scope, $vil) {

  // $vil.setInfoCtrlScope($scope);

  $scope.getCurrentDay = function () {
    return $vil.getCurrentDay();
  };

  $scope.showPeriod = function () {
    var periodName = $vil.getCurrentPeriod();
    if (periodName === 'gameOver') return '感想戦';
    
    return $vil.isNight() ? '夜' : '昼';
  };

}]);


/*
  PlayerController
 */
ngApp.controller('PlayerController', ['$scope', '$vil', function($scope, $vil) {

  $vil.setPlayerCtrlScope($scope);

  $scope.getConditionTypes = function () {
    return $vil.getConditionTypes();
  };
  $scope.getTitle = function (type) {
    return $vil.getTitleByConditionType(type);
  };
  $scope.getFullName = function (player) {
    return $vil.getFullNameByPlayer(player);
  };
  $scope.getPlayers = function(type) {
    var players = $vil.filterPlayersInfo(function (p) {
      if (p.condition.type === type) return true;
      return false;
    });
    return players;
  };

}]);

/*
 MessageFormController
 */
ngApp.controller('MessageFormController', ['$scope', '$vil', function($scope, $vil) {

  $scope.content = '';  


  $scope.isTextareaDisabled = false;

  $scope.selfInfo = $vil.selfInfo;
  $scope.selectedOption = void 0;

  $scope.selectOption = function (opt) {
    $scope.selectedOption = opt;
  };


  $scope.$watch(function () { return $vil.selfInfo.messageOptions[0]; }, function (n, o) {
    if (!$scope.selectedOption) return ($scope.selectedOption = n);

    for (var i=0, len=$vil.selfInfo.messageOptions.length; i<len; i++) {
      if ($scope.selectedOption.name === $vil.selfInfo.messageOptions[i].name)
        return ($scope.selectedOption); // 変更なし
    }

    return ($scope.selectedOption = n);
  });


  var allowTimeUpdate = true;
  $scope.sendMessage = function () {
    if ($scope.content && $scope.content.replace(/\s/, '').length > 0) {
      $scope.isTextareaDisabled = true;
      
      var msgOption;
      if ($scope.selectedOption) {
        msgOption = $scope.selectedOption.name;
      }
      else {
        msgOption = $vil.selfInfo.messageOptions[0].name;
      }

      $vil.sendMessage({
        content: $scope.content,
        messageOption: msgOption,
        day: $vil.getCurrentDay(),
        periodName: $vil.getCurrentPeriod()
      }, function (err, result) {
        $scope.content = '';
        $scope.selectedOption = void 0;
        $scope.isTextareaDisabled = false;
      });
    }
    else {
      if ($vil.selfInfo.entry) {
        //連打防止
        if (allowTimeUpdate) {
          allowTimeUpdate = false;
          $vil.fire('updatePlayerTime');
          setTimeout(function(){ allowTimeUpdate = true; }, 3000);
        }
      }
    }
  };

}]);


