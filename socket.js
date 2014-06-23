
/* ソケット通信の実装 */

var _LOG = require('utils')._LOG;

var Socket = function (httpServer, cookieParser) {

  var io = require('socket.io').listen(httpServer);

  io.set( "log level", 1 );

  var passportIo = require("passport.socketio");
  var settings = require('settings');

  var async = require('async');

  var Village = require('./models/Village');

  var onAuthorizeSuccess = function(data, accept) {
    console.log('socket.io auth success!!');
    accept(null, true);
  };

  var onAuthorizeFail = function(data, message, error, accept) {
    if (error)
      throw new Error(message);
    console.log('socket.io auth failed...', message);
    //accept(null, false);
    accept(null, false);
  };


  io.set('authorization', passportIo.authorize({
    cookieParser: cookieParser,
    key: settings.sessionKey,
    secret: settings.sessionSecret,
    store: settings.getSessionStore(),
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail,
  }));

  // 
  var handleError = function (err, socket) {
    console.log('[handle error]', err && (err.stack || err));
    if (socket) socket.json.emit('handle error', {error:true, message:err.message});
  }; 

  // ブロードキャスト用関数の定義
  // 2回目以降、変更になるようなものではない、メモリリークに気をつけて、メモリ上に残す
  var broadcastMessage = function (data, restTimeMs, room) {
    try {
      if (!room) throw data;
      io.of('/vil').in(room).emit('notice message', {
        noticeArray: data,
        restTimeMs: restTimeMs,
        now: new Date(),
      });
    }
    catch (e) {
      handleError(e); 
    }
  };

  var namespaceVil = io.of('/vil').on('connection', function (socket) {
  try { 
    // ログインチェック...はいらなかった
    // 'connect' イベントが成功で、 'error'イベントが失敗だって話
    var client = { user: socket.handshake.user };

    // vidのデータがない
    if (!client.user.vid) {
      socket.json.emit('error', {message: "vid undefined"});
    }

    // vilの取得
    Village.getVillageById(client.user.vid, broadcastMessage, function (err, vil) {
      try {
        if (err) throw err;
        if (!vil) throw 'vil not found';

        // 過去ログ
        if (vil.state >= 4) return socket.json.emit('redirect', { message: "vil is already finished" });

        /* TODO: パスワード制限、あるいはIPキック、同IP接続の処理を追加します */

        // 全ての処理が正しく終了したら
        socket.join(vil.room);
        socket.json.emit('joined', {room: vil.room});
      } catch (e) {
        if (e instanceof Error) 
          handleError(e, socket);
        else
          socket.json.emit('getvil error', {error: true, message: e});
        return;
      }
    });

    //
    // vil取得のラッパーとエラーハンドリング
    var getVil = function (callback) {
      Village.getVillageById(client.user.vid, broadcastMessage, function (err, vil) {
        //
        // このエラーハンドリングは、１階層のみに有効、非同期階層を下げる際には注意しなさい
        try {
          // エラー
          if (err) throw err;
          // 該当なし
          if (!vil) return socket.json.emit('error', { message: "vil not found" });
          // 過去ログ
          if (vil.state >= 4) return socket.json.emit('redirect', { message: "vil is already finished" });


          callback(vil);
        }
        catch (e) {
          if (e instanceof Error) 
            handleError(e, socket);
          else
            socket.json.emit('getvil error', {error: true, message: e});
          return;
        }
      });
    };

    //
    // vilの保存のラッパーとエラーハンドリング
    var saveVil = function (vil, callback) {
      vil.save(function (err) {
        try {
          if (err) throw err;
          callback(vil);
        }
        catch (e) {
          handleError(e, socket);
        }
      });
    };


    /*
      以下通信処理
      ビジネスロジックはなるべくVillageに投げること
      ここはあくまで通信のコントローラー
    */

    //
    // イニシャライズ (pidの取得or発行)
    socket.on('req init', function (){
      getVil(function (vil) {

        // connection = { int pid, bool isNew }
        var connection = vil.createConnection(client.user.name, socket.id);

        if (!connection.isNew) {
          // TODO: 本番環境で二窓を禁止したいならばここに io.sockets.socket(vil.players[pid].user.socketId).disconnect() 等
        }

        vil.save(function () {
          socket.json.emit('ret init', connection);
        });
      });
    });

    //
    // 初期化、再構築用モデルの要求
    socket.on('req construct', function () {
      getVil(function (vil) {

        var pInfo = vil.getPlayersInfoByUserName(client.user.name);
        var sInfo = vil.getSelfInfoByUserName(client.user.name);

        var ret = {
          vilInfo: vil.info,
          selfInfo: sInfo,
          playersInfo: pInfo,
        };

        vil.getMessages(client.user.name, function(err, messages) {
          if (err) return handleError(err, socket);

          ret.messages = messages;
          socket.json.emit('ret construct', ret);
        });
      });
    });

    //
    // メッセージ受信
    socket.on('send message', function (data) {
      if (!data) return;
      var retSeq = (data.seq) ? data.seq : null;
      getVil(function (vil) {
        vil.updatePlayerTimeByUserName(client.user.name);
        var retSuccess = vil.insertMessage(client.user.name, data.day, data.periodName, data.content, {
          messageOption: data.messageOption,
        });
        if (retSuccess) {
          saveVil(vil, function() {
            if (retSeq) socket.json.emit('ret seq', {success: true, seq: retSeq});
          });
        } 
        else {
          if (retSeq) socket.json.emit('ret seq', {error: true, seq: retSeq});
        }
      });
    });

    //
    // メッセージ送信依頼
    socket.on('req messages', function (data) {
      if (!data) return;
      var retSeq = (data.seq) ? data.seq : null;
      var subtitle = (retSeq) ? 'ret seq' : 'ret messages';
      var reqSteps = data.reqSteps;
      getVil(function (vil) {
        vil.getMessages(client.user.name, reqSteps, function (err, messages) {
          if (err) return handleError(err, socket);
          if (messages) {
            socket.json.emit(subtitle, {messages: messages, seq: retSeq});
          }
          else {
            if (retSeq) socket.json.emit(subtitle, {messages: [], seq: retSeq});
          }
        });
      });
    });

    //
    // vil/players情報の送信依頼
    socket.on('req update', function () {
      getVil(function (vil) {
        var pInfo = vil.getPlayersInfoByUserName(client.user.name);
        var sInfo = vil.getSelfInfoByUserName(client.user.name);
        var vInfo = vil.info;

        socket.json.emit('ret update', {
          playersInfo: pInfo,
          vilInfo: vInfo,
          selfInfo: sInfo,
        });
      });
    });

    //
    // コマンドの受信、処理
    socket.on('command', function (data) {
      if (!data) return;
      var retSeq = (data.seq) ? data.seq : null;
      var command = data.command;
      delete data.command;
      getVil(function (vil) {
        try {
          var result = vil.handleCommand(command, client.user.name, data);
          if (result.error) {
            if (retSeq) {
              result.seq = retSeq;
              socket.json.emit('ret seq', result);
            }
            return; // エラーなら何も保存せずここで処理終了
          }
        }
        catch (e) {
          return handleError(e, socket); // 同じく処理終了
        }

        // エラー無ければ保存
        saveVil(vil, function () {
          if (retSeq) {
            socket.json.emit('ret seq', {success: true, seq: retSeq});
          }
        });

      }); // End of getVil()
    }); // End of 'command'

  }catch(e){ console.log('[socket.js] fatal error', e.stack); }
  });

};

module.exports = Socket;