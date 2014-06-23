
var TEMPLATE_DIR = '/templates';

/*
  ConfigModalController
 */
ngApp.controller('ConfigModalController', ['$scope', '$modal', function($scope, $modal) {
  $scope.openModal = function () {
    var instance = $modal.open({
      templateUrl: TEMPLATE_DIR + '/game/modals/config.html',
      resolve: {},
      controller: ['$scope', '$modalInstance', function modalController($scope, $modalInstance) {
        $scope.ok = function() {
          $modalInstance.close('ok');
        };
      }]
    });

    instance.result.then(function(ret) {console.log(ret);});

  };
}]);

/*
    EntryModalController
*/
ngApp.controller('EntryModalController', ['$scope', '$modal', '$vil', 'wsAlert', function($scope, $modal, $vil, wsAlert) {
  $scope.openModal = function () {
    var instance = $modal.open({
      templateUrl: TEMPLATE_DIR + '/game/modals/entry.html',
      resolve: {
        characters: function() {return $vil.vilInfo.characters;},
      },
      controller: ['$scope', '$modalInstance', function modalController($scope, $modalInstance) {
        $scope.selectedId = null;
        $scope.frm = {serif: ""};
        $scope.placeHolderText = "";

        $scope.characters = $vil.vilInfo.characters;

        $scope.getFullName = function (c) {
          return (c.name.first) ? c.name.first + ' ' + c.name.last : c.name.last;
        };

        $scope.setSelectedId = function (index) {
          $scope.selectedId = index;
          $scope.placeHolderText = $scope.characters[index].serif; 
        };

        $scope.ok = function() {
          var serif = $scope.frm.serif || $scope.placeHolderText;
          var selectedId = $scope.selectedId;
          if (!selectedId || !serif) {       
            wsAlert.warning("キャラクターを選択してください。");
            return;
          }

          /* 通信処理 */
          var _dup =  JSON.parse(JSON.stringify($scope.characters[selectedId]));
          _dup.serif = serif;
          $vil.fire('entry', {chara:_dup}, function (err, ret) {
            if (err) {
              wsAlert.error("問題が発生したため、処理を中断しました。<br>理由: "+err.message);
              return;
            }
            else {
              $modalInstance.close({success:true});
            }
          });

        };

        $scope.cancel = function () {
          $modalInstance.close({cancel:true});
        };

      }],
    });

    instance.result.then(function (ret) {
      
    });

  };
}]);

/*
  VoteModalController
*/
ngApp.controller('VoteModalController', ['$scope', '$modal', '$vil', 'wsAlert', function($scope, $modal, $vil, wsAlert) {
  $scope.openModal = function () {
    var instance = $modal.open({
      templateUrl: TEMPLATE_DIR + '/game/modals/vote.html',
      controller: ['$scope', '$modalInstance', function modalController($scope, $modalInstance) {
        $scope.selectedId = null;
        $scope.frm = {serif: ""};
        $scope.placeHolderText = "";

        $scope.players = $vil.filterPlayersInfo(function (p) { return p.condition.type === 'survivor'; });

        $scope.getFullName = function (c) {
          return (c.name.first) ? c.name.first + ' ' + c.name.last : c.name.last;
        };

        $scope.setSelectedId = function (index) {
          $scope.selectedId = index;
        };

        $scope.ok = function() {
          var serif = $scope.frm.serif || $scope.placeHolderText;
          var selectedId = $scope.selectedId;
          if (selectedId === null) {       
            wsAlert.warning("キャラクターを選択してください。");
            return;
          }

          /* 通信処理 */
          var voteId = $scope.players[selectedId].pid;
          $vil.fire('vote', {voteId: voteId}, function (err, ret) {
            if (err) {
              wsAlert.error("問題が発生したため、処理を中断しました。<br>理由: "+err.message);
              return;
            }
            else {
              $modalInstance.close({success:true});
            }
          });

        };

        $scope.cancel = function () {
          $modalInstance.close({cancel:true});
        };

      }],
    });

    instance.result.then(function (ret) {
      
    });

  };
}]);


/*
  TargetModalController
*/
ngApp.controller('TargetModalController', ['$scope', '$modal', '$vil', 'wsAlert', function($scope, $modal, $vil, wsAlert) {
  $scope.openModal = function () {
    var instance = $modal.open({
      templateUrl: TEMPLATE_DIR + '/game/modals/target.html',
      controller: ['$scope', '$modalInstance', function modalController($scope, $modalInstance) {
        
        $scope.selectedIds = [];
        $scope.targetLists = [];
        $scope.listTypes = [];

        var tLists = $vil.selfInfo.targetLists;
        var numTargets = $scope.numTargets = (tLists) ? tLists.length : 0;

        var createListFilterMethod = function (l) {
          var list = l;
          return function (t) {
            for (var i=0, len=list.length; i<len; i++) {
              if (t.pid === list[i]) return true;
            }  
            return false;
          };
        };

        for (var ti=0; ti<numTargets; ti++) {
          var list = tLists[ti];
          if (!list) break;
          if (typeof list[0] === 'string') {
            $scope.listTypes[ti] = 'string';
            $scope.targetLists[ti] = list;
          }
          else if (typeof list[0] === 'number') {
            $scope.listTypes[ti] = 'player';

            var filter = createListFilterMethod(list);
            $scope.targetLists[ti] = $vil.filterPlayersInfo(filter);
          }
          else {
            break;
          }
        }

        $scope.getFullName = function (c) {
          return (c.name.first) ? c.name.first + ' ' + c.name.last : c.name.last;
        };

        $scope.select = function (i, index) {
          $scope.selectedIds[i] = index;
        };

        $scope.ok = function() {
          var targets = [];
          for (var i=0, target=null; (targetId = $scope.selectedIds[i]) !== undefined; i++) {
            var listType = $scope.listTypes[i];
            if (listType === 'player')
              targets.push($scope.targetLists[i][targetId].pid);
            else if (listType === 'string')
              targets.push(targetId);
          }

          if (targets.length < $scope.numTargets) return wsAlert.warning('対象を選択してください。');

          // 通信処理
          $vil.fire('selectTargets', {targets: targets}, function (err, ret) {
            if (err)
              return wsAlert.error('問題が発生したため、処理を中断しました。<br>理由: ' + err.message);
            $modalInstance.close({success:true});
          });
        };

        $scope.cancel = function () {
          $modalInstance.close({cancel:true});
        };

      }],
    });

    instance.result.then(function (ret) {
      
    });

  };
}]);

/*
  LeaveModalController
*/
ngApp.controller('LeaveModalController', ['$scope', '$vil', 'wsAlert', function($scope, $vil, wsAlert) {

  $scope.openModal = function() { 
    wsAlert.open('参加を取り消してもよろしいですか？', '確認', 'はい', 'いいえ', function (ans) {
      if (ans.ok) {
        $vil.fire('leave', {}, function (err, ret) {
          if (err) 
            wsAlert.error("参加を取り消せませんでした。<br>理由: "+err.message);
          else
            wsAlert.info("参加を取り消しました。");
        });
      }
      else {
        return;
      }
    });
  };

}]);