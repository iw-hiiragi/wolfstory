/*
  通信を行う
*/
var csModule = angular.module('coreSocketModule', []);

var _LOG = function (arg1, arg2, arg3) {
  if (arg2 && !arg3)
    console.log('core-socket:', arg1, arg2);
  else if (arg3)
    console.log('core-socket:', arg1, arg2, arg3);
  else
    console.log('core-socket:', arg1);
};

csModule.factory('coreSocket', [function () {

  // Village Handler オブジェクト
  var $vil;
  var setVillageHandlers = function (handlers) {
    $vil = handlers;
    /*
      handleUpdate, handleInfo, handleInventory,
      adjustRestTime, adjustDate
    */
  };

  // Public APIの宣言
  var sendMessage,    // : message, opt_callback
      reqMessage,     // : request, opt_callback
      fire,           // : commandName, opt_data, opt_callback 
      connectServer,  // : mainCallback
      reconnectServer,// :
      reqUpdate,      // : 
      endGame;

  // ソケット状態
  var socket;
  var authorized;
  var constructed;
  var connected;
  var isReconnectable;
  var isEnd;

  var uiCallback;

  /*
   *  通信ラッパーの定義
   */

  // 連番を生成する関数を生成
  var _seq = (function(){
    var seq = 1;
    return (function () { 
      return seq++;
    }); 
  })();


  // 連番の戻り値に対応するコールバックを実行する
  var _seqCallbacks = []; // コールバックはグローバル変数に保存
  var _seqReceiver = function (data) {
    var seq = data.seq;
    var callback;
    _LOG('[_emit] seq '+ seq + ' received: ', data);
    for (var i=0, len=_seqCallbacks.length; i<len; i++) {
      if (_seqCallbacks[i].seq === seq) {
        callback = _seqCallbacks[i].cb;
        // メモリリーク対策
        delete _seqCallbacks[i];
        _seqCallbacks.splice(i, 1);
        break;
      }
    }
    if (!seq || typeof callback !== 'function') return false;
    callback(data);
  };
  // メッセージを送信し、対応するコールバックを登録する
  var _emit = function (emitMessage, emitObject, callback) {
    var callbackExists = (typeof callback === 'function');

    if (authorized !== 1) return (callbackExists) ? callback({error: true, message: 'unauthorized'}) : null;
    if (callbackExists) emitObject.seq = _seq();

    // 送信する
    socket.json.emit(emitMessage, emitObject);
    
    // コールバック登録
    if (callbackExists) {
      var seq = emitObject.seq;
      // 10秒待機でタイムアウト
      var timeoutId = setTimeout( function(){
        callback({error: true, message: 'timeout'});
        delete _seqCallbacks[seq];
      }, 10000);
      var tmp = {
        seq: seq,
        cb: function (data) {
          clearTimeout(timeoutId);
          if (data.error) {
            callback(data);
          } else {
            callback(null, data);
          }
        }
      };
      // コールバック用のオブジェクトを登録
      _seqCallbacks.push(tmp);
    }
  };

  // message送信用の_emitラッパー
  sendMessage = function (message, callback) {
    // 多少のバリデート
    if (!message) return (typeof callback === 'function') ? callback('empty') : null;
    _emit('send message', message, callback);
  };

  // messageリクエスト用の_emitラッパー
  reqMessage = function (request, callback) {
    _emit('req messages', request, callback);
  };

  // command着火用の_emitラッパー
  fire = function (commandName, opt_data, opt_callback) {
    var data, callback;
    if (typeof opt_data === 'function') {
      callback = opt_data;
      data = {};
    }
    else {
      callback = opt_callback;
      data = opt_data || {};
    }

    data.command = commandName;
    _emit('command', data, callback);
  };

  // 再度のupdate (handleUpdateが呼ばれることを期待)への要求
  reqUpdate = function () {
    socket.emit('req update');
  };

  // FIX: メッセージは全てPIDで管理することになったが、
  // コンストラクトをリクエストするシナリオはあるのか？
  var reqConstruct = function (callback) {
    // 再接続用に明示する
    constructed = false;
    socket.emit('req construct');
  };


  /*
    サーバー接続用関数の定義
    （メインエントリポイントから１度だけ呼ばれる）
  */

  connectServer = function (callback) {

    uiCallback = callback;

    socket = io.connect('/vil', {
      reconnect: false, // 自動再接続はしない
    });

    socket.on('connect', function (data) {
      _LOG('[connect] agrument: ', data);
      authorized = 1;
    });

    // errorイベントは、passportIOの専売特許にする
    socket.on('error', function (err) {
      _LOG('[error] message: '+ (err && err.message), err);
      authorized = 0;
      socket.disconnect();
      return uiCallback('AuthorizeError', err);
    });
    
    // socket.jsがハンドルするエラー
    socket.on('handle error', function (err) {
      _LOG('[handle error] message: ' + (err && err.message), err);
    });

    // ロック中 / vil取得エラー の処理
    socket.on('getvil error', function (err) {
      _LOG('[getvil error] message: ' + err.message, err);
      var errorMessage = err.message;
      if (errorMessage === 'village is locked') {
        var timeoutInterval = 1000;
        if (constructed) {
          _LOG('[getvil error] wait for "message notice"');
          // ロックはVillageのupdateでしかかからない
          // 通信が確立しているなら、ほうっておいてもmessage noticeに信号がきて処理が再開される
        }
        else {
          // ならば運悪くロック中に接続を試みたので、再接続を促す
          _LOG('[getvil error] suggest to reconnect');
          isReconnectable = true;
          socket.disconnect();
        }
      }
      else {
        // 村の取得が出来なかった場合もgetvil errorらしい
        socket.disconnect();
        return uiCallback('VillageNotFound');
      }
    });

    // 通信が切断された場合
    socket.on('disconnect', function (arg) {
      _LOG('[disconnect] isReconnectable: '+ isReconnectable +
            ', authorized: '+ authorized +', connected: '+ connected +', argument: ', arg);

      if (!authorized) {
        // 何もしない
      }
      else if (isEnd) {
        uiCallback('VillageEnd');
      }
      else if (isReconnectable || connected) {
        // 通信確立前にisReconnectable==trueで切断されたか、あるいは既に通信確立していた場合
        uiCallback('Reconnection');
      }

      isReconnectable = false;
      constructed = false;
      connected = false;
      authorized = 0;
    });

    // 参加完了通知を受け取る（初期化ルーチンの開始）
    socket.on('joined', function (data) { 
      _LOG('[joined] argument: ', data);
      socket.emit('req init');
    });

    // イニシャライズ
    socket.on('ret init', function (data) {
      _LOG('[ret init] argument: ', data);
      connected = true; // イニシャライズ完了 === 通信可能(通信権限あり)
      
      // TODO: data.new で判定 おかえりなさいか否か

      socket.emit('req construct');
    });

    // モデル構築
    socket.on('ret construct', function (data) {
      _LOG('[ret construct] argument: ', data);

      $vil.handleConstruct(data.messages);
      $vil.handleUpdate(data.playersInfo, data.vilInfo, data.selfInfo);

      // コンストラクトまでの終了 (ゲーム開始可能）
      constructed = true;
      uiCallback(null, true);
    });

    // （ゲーム開始後に受信）アップデート
    socket.on('ret update', function (data) {
      _LOG('[ret update] argument: ', data);
      $vil.handleUpdate(data.playersInfo, data.vilInfo, data.selfInfo);
    });

    // ( ゲーム開始後 )
    // notice messageで受け取った配列を（reqStep等用いて）整形して
    // $vilのhandleInventoryに渡します
    socket.on('notice message', function __nm_recall(data) {

      /* TODO: コンストラクトまち、実装はこれで良いのか？ */
      if (!constructed) {
        return setTimeout(function(){
          if (connected) __nm_recall(data);
        }, 500);
      }

      // restTimeMsの調整情報
      $vil.adjustRestTime( data.restTimeMs );
      $vil.adjustDate(data.now);

      var messageNoticeArray = data.noticeArray;
      var len = messageNoticeArray.length;
      var inventory_ = [];
      var reqSteps = [];
      for (var i=0; i<len; i++) {
        var notice = messageNoticeArray[i].notice;
        switch (notice) {
          case 'info':
            $vil.handleInfo( messageNoticeArray[i] );
            inventory_.push( messageNoticeArray[i] );
            break;
          case 'attached':
            inventory_.push( messageNoticeArray[i] );
            break;
          case 'notice':
            reqSteps.push( messageNoticeArray[i].step );
            break;
          case 'hidden':
            inventory_.push( messageNoticeArray[i] );
            break;
          default:
            break;
        }
      }

      // 個別に要求すべきstepがあれば
      if (reqSteps.length > 0) {
        reqMessage({reqSteps: reqSteps}, function (err, data) {
          var recMessages = data.messages;
          var recLen = recMessages.length;
          for (var j=0; j<recLen; j++) {
            inventory_.push(recMessages[j]);
          }
          $vil.handleInventory(inventory_);
        });
      }
      else {
        $vil.handleInventory(inventory_);
      }

    });

    // シークエンス戻りの取得 (_emit用)
    socket.on('ret seq', _seqReceiver);
  };

  reconnectServer = function () {
    if (connected) return;
    socket.socket.reconnect();
  };

  endGame = function () {
    isEnd = true;
    socket.disconnect();
  };

  return {
    connectServer: connectServer,
    reconnectServer: reconnectServer,
    sendMessage: sendMessage,
    reqMessage: reqMessage,
    reqUpdate: reqUpdate,
    fire: fire,
    endGame: endGame,

    setVillageHandlers: setVillageHandlers,
  };

}]);