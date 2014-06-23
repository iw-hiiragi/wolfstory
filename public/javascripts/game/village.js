/*
  通信を行う
*/
var vilModule = angular.module('village', ['ngAnimate', 'coreSocketModule']);

var _LOG = function (arg1, arg2, arg3) {
  if (arg2 && !arg3)
    console.log(arg1, arg2);
  else if (arg3)
    console.log(arg1, arg2, arg3);
  else
    console.log(arg1);
};

vilModule.factory('$vil', ['$rootScope', '$sce', '$location', 'coreSocket',
function villageFactory ($rootScope, $sce, $animate, coreSocket) {

  // 共通で仕様するビューモデル、及びインベントリ
  var messages = []; // === viewModel
  var messageInventory = []; // === inventory

  var vilInfo = {};
  var selfInfo = {};
  var otherInfo = {
    passedTimeMs: 0, // 参照が変わってしまうので
  };
  var playersInfo = [];

  // UIとやりとりする際の、オーソライズ、エラー発生等のコールバック
  var uiCallback;

  // UIのスコープ
  var timeCtrlScope,
      messageCtrlScope,
      playerCtrlScope;

  /*
    ハンドラーの宣言
  */
  var handleConstruct,
      handleUpdate,
      handleInfo,
      handleInventory;

  /*
    共通 APIの宣言
  */
  var adjustRestTime,
      adjustDate;

  /*
    コアモジュールAPIの宣言
  */
  var Core;
  var connectServer,
      reconnectServer,
      sendMessage,
      reqMessage,
      fire,
      reqUpdate,
      endGame;


  /*
    ハンドラの定義
  */

  // private: １秒ごと、timetickを定義
  var tickIntervalId = null;
  var tickInterval = function () {
    if (timeCtrlScope) {
      timeCtrlScope.$apply(function(){
        otherInfo.passedTimeMs += 1000;
      });
    }
    else {
      otherInfo.passedTimeMs += 1000;
    }
  };

  //
  // 残り時間を調整
  var lastAdjustMs = 0;
  adjustRestTime = function (restTimeMs, opt_lostTimeMs, opt_forceAdjust) {

    // 負荷軽減のため、強制時以外は最低10secのマージンを取る
    if (lastAdjustMs && !opt_forceAdjust) {
      var passedMs = Date.now() - lastAdjustMs;
      if (passedMs < 10000) {
        _LOG('[adjustRestTime] passedMs: '+ passedMs + ' < 10000, denied');
        return;
      }
    }

    var lostTimeMs = opt_lostTimeMs || 0;

    // 値の初期化
    vilInfo.restTimeMs = restTimeMs;
    otherInfo.passedTimeMs = 0;

    // インターバルの消去
    if (tickIntervalId) clearInterval(tickIntervalId);

    // 時間のずれを計算
    var gapMs = (vilInfo.restTimeMs % 1000) - lostTimeMs;
    var overflowMs = 0;
    if (gapMs < 0) { 
      overflowMs = 1000;
      gapMs = (gapMs + 20000) % 1000;
    }

    // インターバルの設定
    if (gapMs < 100) {
      tickIntervalId = setInterval(tickInterval, 1000);
    }
    else {
      tickIntervalId = 'waiting';
      setTimeout(function () {
        if (tickIntervalId !== 'waiting') return;
        otherInfo.passedTimeMs += overflowMs;
        tickIntervalId = setInterval(tickInterval, 1000);
      }, gapMs - 10);
    }

    lastAdjustMs = Date.now();

    _LOG('[adjustRestTime] restTimeMs: '+ restTimeMs +', lostTimeMs: '+ lostTimeMs +
          ', gapMs: '+ gapMs + ', overflowMs: '+ overflowMs +', opt_forceAdjust: ' + opt_forceAdjust);
  };

  //
  // 現在の日時を調整
  adjustDate = function (new_now) {
    vilInfo.now = new_now;
  }; 

  handleConstruct = function (new_messages) {
    // 初期メッセージのアサイン
    var recMessages = new_messages;
    var msgScope = messageCtrlScope || $rootScope;
    msgScope.$apply(function(){
      for (var i=0,len=recMessages.length; i<len; i++) {
        recMessages[i].content = $sce.trustAsHtml(recMessages[i].content);
        messages[recMessages[i].step] = recMessages[i];
      }
    });
  };

  //
  // playersInfo, vilInfo, selfInfoをハンドル
  handleUpdate = function (newPlayersInfo, newVilInfo, newSelfInfo) {
    var startTimeMs = Date.now();
    
    // $rootScopeで良いと思う
    $rootScope.$apply( function() {

      if (newVilInfo) {
        for (var keyA in vilInfo) 
          delete vilInfo[keyA];
        for (var keyB in newVilInfo)
          vilInfo[keyB] = newVilInfo[keyB];
      }
      if (newSelfInfo) {
        for (var keyC in selfInfo)
          delete selfInfo[keyC];
        for (var keyD in newSelfInfo)
          selfInfo[keyD] = newSelfInfo[keyD];
      }
      if (newPlayersInfo) {
        while (playersInfo.length) playersInfo.pop();
        for (var i=0, len=newPlayersInfo.length; i<len; i++) {
          playersInfo.push( newPlayersInfo[i] );
        }  
      }

    });

    _LOG('[handleUpdate] (new) pInfo: ', newPlayersInfo);
    _LOG('[handleUpdate] (new) vInfo: ', newVilInfo);
    _LOG('[handleUpdate] (new) sInfo: ', newSelfInfo);

    // 残り時間の初期化
    adjustRestTime(vilInfo.restTimeMs, Date.now() - startTimeMs, true);
  };

  //
  // インベントリをハンドル
  var autoReload = true; // TODO: 実装
  handleInventory = function (inv, opt_relaod) {
    var reload = (typeof opt_reload === 'boolean') ? opt_reload : autoReload;
    var len = inv.length;
    $rootScope.$apply(function(){
      if (reload) {
        // リロード（messagesへのアサイン）
        var msg;
        while (inv.length > 0) {
          msg = inv.shift();
          if (!msg || !msg.step || !msg.content) continue;
          msg.content = $sce.trustAsHtml(msg.content);
          messages[msg.step] = msg; // ** attaching
        }
      }
      else {
        // TODO: 一時保管棚へのアサイン
      }
    });
  };

  //
  // infoメッセージをハンドル
  handleInfo = function (msg) {
    /* TODO: ここにinfoによるビューの変更イベントを追加して下さい */
    /* TODO: pid -- voted, unvoted, time updated, ready, unreadyは特別なinfoです */
    /* reconstruct時にはplayer.infoがもらえるので過敏になりすぎる必要もないです */
    var type = msg.content;
    var pi;
    switch (type) {
      case 'players updated':
      case 'game updated':
        reqUpdate();
        break;
      
      //
      // 付加情報を持っている特殊なinfo
      // TODO:
      //  ROOTSCOPEのFIX
      case 'player time updated':
        pi = getPlayerInfoByPlayerId(msg.info && msg.info.pid);
        if (pi && msg.info.lastUpdate) {
          $rootScope.$apply(function(){
            pi.lastUpdate = msg.info.lastUpdate;
          });
        }
        break;
      case 'player vote updated':
        pi = getPlayerInfoByPlayerId(msg.info.pid);
        if (pi)
          $rootScope.$apply(function(){
            pi.condition.voted = msg.info.voted;
          });
        break;
      case 'end':
        Core.endGame();
        break;

      default:

        break;
    }
  };

  /*
    コアモジュールの初期化  
  */
  Core = coreSocket;
  var handlers = {
    handleConstruct: handleConstruct,
    handleUpdate: handleUpdate,
    handleInfo: handleInfo,
    handleInventory: handleInventory,
    adjustRestTime: adjustRestTime,
    adjustDate: adjustDate,
  };
  Core.setVillageHandlers(handlers);

  /*
    コアモジュール APIのロード
  */
  connectServer = Core.connectServer;
  sendMessage = Core.sendMessage;
  reqMessage = Core.reqMessage;
  fire = Core.fire;
  reqUpdate = Core.reqUpdate;

  // public: autoReloadじゃない人用の、あるいはinfo-update受信後の
  // var forceAssign = function () {
  //   if (messageInventory.length === 0) return;
  //   handleInventory(messageInventory, true);
  // };

  /*
    Getter
  */

  var getMessages = function () {
    return messages;
  };

  var getConditionTypes = function () {
    var types = [];
    for (var key in vilInfo.conditionTypeMap) types.push(key);
    return types;
  };

  var getTitleByConditionType = function (conditionType) {
    return vilInfo.conditionTypeMap[conditionType] || '＠未定義';
  };

  var getPlayerInfoByPlayerId = function (pid) {
    for (var i=0, len=playersInfo.length; i<len; i++)
      if (playersInfo[i] && playersInfo[i].pid === pid) return playersInfo[i];
    return null;
  };

  var filterPlayersInfo = function (callback) {
    var pArray = [];
    for (var i=0, len=playersInfo.length; i<len; i++) {
      if ( callback(playersInfo[i]) ) pArray.push(playersInfo[i]);
    }
    return pArray;
  };

  var getFullNameByPlayer = function (pInfo) {
    return (pInfo.name.first.length > 0) ? (pInfo.name.first + ' ' + pInfo.name.last) : (pInfo.name.last);
  };

  var getTime = function () {
    var time = vilInfo.restTimeMs - otherInfo.passedTimeMs;
    return (time > 0) ? time : 0; 
  };

  var getCurrentDay = function () {
    return vilInfo.day;
  };

  var getCurrentPeriod = function () {
    return vilInfo.currentPeriod;
  };

  var isNight = function () { return vilInfo.isNight; };

  /*
    Setters
  */

  var setTimeCtrlScope = function (tScope) {
    timeCtrlScope = tScope;
  };
  
  var setMessageCtrlScope = function (mScope) {
    messageCtrlScope = mScope;
  };

  var setPlayerCtrlScope = function (pScope) {
    playerCtrlScope = pScope;
  };


  return {
    /* public APIs and properties */
    // props FIX!! this is BAD PRACTICE!!!
    messages: messages,
    vilInfo: vilInfo,
    selfInfo: selfInfo,
    playersInfo: playersInfo,
    otherInfo: otherInfo,

    /*
      CoreModule APIs
    */    
    connectServer: connectServer,
    reconnectServer: reconnectServer,
    sendMessage: sendMessage,
    reqMessage: reqMessage,
    fire: fire,

    /*
      Getters
    */

    getMessages: getMessages,

    getConditionTypes: getConditionTypes,
    getTitleByConditionType: getTitleByConditionType,
    
    filterPlayersInfo: filterPlayersInfo,
    getFullNameByPlayer: getFullNameByPlayer,
    
    getTime: getTime,
    getCurrentPeriod: getCurrentPeriod,
    getCurrentDay: getCurrentDay,

    isNight: isNight,


    /*
      Setters
    */
    setTimeCtrlScope: setTimeCtrlScope,
    setMessageCtrlScope: setMessageCtrlScope,
    setPlayerCtrlScope: setPlayerCtrlScope,
  };

}]);