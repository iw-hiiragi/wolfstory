
// file system
var fs = require('fs');

// mongoose init
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;

// Models and Schemas
var Message = require('./Message');
var Counter = require('./Counter');
var Game = require('./Game');
var PlayerSchema = require('./Player').Schema;

// Factory Methods
var createDefaultPlayer = require('./Player').createDefaultPlayer;

// Javascript Classes
var Character = require('./Character').Character;
var europeSet = require('./Character').europeSet;
var Job = require('./Job').Job;
var PlayerStatus = require('./Job').PlayerStatus;
var standardJobs = require('./Job').standardJobs;
var Composition = require('./Composition');


// Javascript Class-Related-Methods
var addPermission = require('./Job').addPermission;
var deletePermission = require('./Job').deletePermission;

// Includings
var settings = require('settings');
var resource = require('resource');
var utils = require('utils');

// Utilities
var arrayMatch = utils.arrayMatch;
var isArray = utils.isArray;
var rand = utils.rand;
var _LOG = utils._LOG;

// Resources
var TEXT = resource.text;

// モデルの宣言
var Village;

// 定数の宣言
var UPDATE_CHECK_MARGIN_MS = 5 * 1000; // 5秒以上経過している場合にのみチャレンジする
var VIL_FINALIZE_DELAY_MS = 2 * 1000; 

// グローバル変数の宣言（注: 闇雲に追加しないこと）
var tryingUpdate = {/* 'vid': boolean */}; // 異常発生時、２回以上updateチャレンジされるのを防ぐ為
var timeoutIds = {/* 'vid': timeoutId */}; // timeoutIdは、MongoDBに保存出来ない（再帰的な参照を引き起こす為）

// グローバル関数の定義


// ブロードキャスト関連の定義
var broadcastMethods = []; // socket.js経由で呼ばれていないターンからでもブロードキャストさせるため
var findBroadcastMethod = function (vid) {
  var len = broadcastMethods.length;
  for (var i=0; i<len; i++)
    if (broadcastMethods[i] && broadcastMethods[i].vid === vid)
      return broadcastMethods[i].func;
  return null;
};
var addBroadcastMethod = function (vid, func) {
  broadcastMethods.push({
    vid: vid,
    func: func,
  });
};
var deleteBroadcastMethod = function (vid) {
  var len = broadcastMethods.length;
  for (var i=0; i<len; i++)
    if (broadcastMethods[i] && broadcastMethods[i].vid === vid) {
      delete broadcastMethods[i];
      broadcastMethods.splice(i, 1);
      return true;
    }
  return false; 
};

// エラー処理の定義
var handleError = function (e) {
  _LOG('[vil error]', e && (e.stack || e));
};

// アンカー数カウンタの定義
var CountSchema = new Schema({
  say: [Number],
  think: [Number],
  groan: [Number],
  spectator: [Number],
  wolf: [Number],
  maison: [Number],
  fox: [Number],
  church: [Number],
  lover: [Number],
  brains: [Number],
  announce: [Number],
  info: [Number],
});
var newCount = function () {
  return {
    say:[1], think:[1], groan:[1], spectator:[1], wolf:[1],
    maison:[1], fox:[1], church:[1], lover:[1], brains:[1],
    announce:[1], info:[1]
  };
};

// モデルの定義
var VillageSchema = new Schema({

  name: String,

  gameType: {type: String, default: 'JinroGame'},

  periods : {
    gameReady: {type: Number, default: 36000}, 
    morning:   {type: Number, default: 15000},
    day:       {type: Number, default: 30000},
    evening:   {type: Number, default: 30000},
    night:     {type: Number, default: 15000},
    midnight:  {type: Number, default: 15000},
    dawn:      {type: Number, default: 30000},
    gameOver:  {type: Number, default: 18000},
  },
  currentPeriod: String,
  nextUpdateMethod: String,

  /* ここから下は入力・編集できないプロパティ */
  /* つまりイニシャライズが必要 */

  vid: Number,

  user: {
    name: String,
  },

  pIndex: {type:Number,default:1},

  step: {type:Number,default:1},
  day: {type:Number,default:1},
  state: {type:Number,default:1},

  timeStamps : {
    nextUpdate: {type:Date},
    created: {type:Date},
    started: {type:Date},
    finished: {type:Date},
  },

  compositions: Array,

  count : [CountSchema],
  players : [PlayerSchema],
  jobs: Array, 
  characters: Array,
  lock : {type:Boolean, default:false},

}, settings.schemaOptions);


/*
  公開される情報
*/
VillageSchema.virtual('info').get(function(){
  return {
    master: this.user.name,
    day: this.day,
    state: this.state,
    currentPeriod: this.currentPeriod,
    isNight: this.isNight(),
    timeStamps: this.timeStamps,
    restTimeMs: this.getRestTimeMs(),
    characters: (this.state === 1) ? this.characters : null,
    jobs: this.jobs,
    conditionTypeMap: this.getVisibleConditionTypeMap(),
    numClients: (this.players.length - 2),
    numPlayers: (this.getEntriedPlayers().length),
  };
});

VillageSchema.virtual('room').get(function(){
  return '_CVD_' + this._id;
});

VillageSchema.pre('save', function(next) {

  var inv = this.inventory_ || null;
  var broadcast = this.broadcast_ || findBroadcastMethod(this.vid) || null;
  var _this = this;

  // 追加ログが存在する場合
  if (inv && inv.length > 0) {
    var len = inv.length;
    var index = 0;

    // ログ書き込み用の再帰クロージャ
    var saveAllLog = function __self_recall(callback) {
      try {
        if (index >= len) {
          // 書き込み終了 
          callback();
        }
        else {
          var msg = new Message(inv[index]);
          msg.save(function(err) {
            if (err) return callback(err);
            index++;
            __self_recall(callback);
          });
        }
      } catch (e) { callback(e); }
    };
    // ログ書き込み、終了後はブロードキャスト
    saveAllLog(function finished(err){
      try {
        if (err) throw err;
        var restTimeMs = _this.getRestTimeMs();
        var broadcastArray = [];
        for(var i=0; i<len; i++) {
          broadcastArray[i] = _this.sanitizeMessage(inv[i]);
        }
        if (broadcast) broadcast(broadcastArray, restTimeMs, _this.room);
      } catch (e) {
        if (broadcast) broadcast(e);
        else console.log(e, e.stack);
      } 
    });
  }

  delete this.inventory_;
  delete this.broadcast_;
  next();
});

VillageSchema.statics = {

  getVillageById: function __gv_recall(vid, broadcast, callback) {
    Village.findOne({vid:vid}).exec(function (err, vil){
      // 取得できず
      if (err || !vil) return callback(err || 'village not found');
      
      // updateによりロック中
      if (vil.lock) {
        return callback('village is locked');
      }

      // 自動アップデートが停止していれば、アップデートの再開を試みる
      // グローバル変数の tryingUpdate を使用します
      if (Date.now() > vil.timeStamps.nextUpdate.getTime() + UPDATE_CHECK_MARGIN_MS) {
        process.nextTick(function () {
          console.log('[vil] trying to restart update method...');
          var vKey = '' + vil.vid;
          try {
            if (!tryingUpdate[vKey]) {
              tryingUpdate[vKey] = true;
              vil.updateGame(function (e) { 
                if (e) console.log('[vil] restart update method fail!', e && (e || e.stack));
                delete tryingUpdate[vKey];
                console.log('[vil] tryingUpdate['+vKey+'] deleted (as ' + tryingUpdate[vKey] + ')');
              });
            }
            else {
              console.log('[vil] already trying / denied.');
            }
          }
          catch (e) { 
            delete tryingUpdate[vKey];
            console.log('[vil] error and tryingUpdate['+vKey+'] deleted (as ' + tryingUpdate[vKey] + ')');
            handleError(e); 
          }
        });
      }

      // private: ブロードキャスト用コールバックの設定
      if (!findBroadcastMethod(vid)) addBroadcastMethod(vid, broadcast);
      vil.broadcast_ = broadcast;

      // private: tmpオブジェクトの初期化設定
      vil.tmp_ = {};
      
      //成功
      callback(null, vil);

    });
  },

  create: function(initObj, callback) {
    /* TODO: ここにmakevilのバリデーション */
    if (!initObj || !initObj.user || !initObj.user.name) return callback('error'); 

    /* TODO: ここにイニシャライズ */
    initObj.count = [[]]; // 0日目のスキップ
    initObj.count.push(newCount());
    
    var i, len;

    var cs = initObj.characters = [];
    for (i=0, len=europeSet.length; i<len; i++) {
      var n = new Character(europeSet[i]);
      cs.push(n);
    }
    initObj.jobs = [];
    for (i=0, len=standardJobs.length; i<len; i++) {
      initObj.jobs.push( new Job(standardJobs[i]) );
    }

    // PID0, DUMMYの割り当て
    initObj.players = [];
    initObj.players.push(createDefaultPlayer('@undefined'));
    var dummy = createDefaultPlayer('@dummy');
    dummy.pid = 1;
    initObj.players.push(dummy);

    initObj.compositions = [];
    
    initObj.timeStamps = {
      created: new Date(),
      nextUpdate: new Date(Date.now() + 60*10*1000),
    };



    // オートインクリメントvidの取得
    Counter.getNextSeq('vid', function (err, counter) {
      try {
        if (err) throw err;
        initObj.vid = counter.seq;
        var newVil = new Village(initObj);
        newVil.initialize();
        newVil.save(function (err) {
          if (err) return callback(err);
          callback(null, newVil);
          console.log('[a new village added]', newVil);
        });
      }
      catch (e) {
        return callback(e);
      }
    });
  },

};

VillageSchema.methods = {

  /*
    初期化関連メソッド
  */
    
  initialize: function() {
    this.state = 1;
    this.day = 1;

    var game = this.getGame();
  },

  /*
    取得関連メソッド、アクセサ、短縮メソッド
  */

  selectPlayer: function(/* pid or userName */) {
    if (arguments.length !== 1) return null;

    var pid, userName;
    if (typeof arguments[0] === 'number') {
      pid = arguments[0];
    }
    else {
      userName = arguments[0];
      pid = this.getPlayerIdByUserName(userName);
    }
    return (pid && this.players[pid]) || null;
  },

  getEntriedPlayers: function () {
    var pArray = [];
    var i, len;
    for (i=0, len=this.players.length; i<len; i++) {
      var p = this.players[i];
      if (!p || !p.condition || !p.condition.entry) continue;
      pArray.push(p);
    }
    return pArray;
  },

  filterPlayers: function (callback) {
    var pArray = [];
    var ps = this.getEntriedPlayers();
    for (var i=0, len=ps.length; i<len; i++) {
      var p = ps[i];
      if (callback(p)) pArray.push(p);
    }
    return pArray;
  },

  getPlayersByConditionType: function (conditionType) {
    var pArray = [];
    var ps = this.getEntriedPlayers();
    var pi, plen;
    for (pi=0, plen=ps.length; pi<plen; pi++) {
      var p = ps[pi];
      if (p && p.condition && p.condition.type === conditionType) pArray.push(p);
    }
    return pArray;
  },
  getSurvivors: function() { return this.getPlayersByConditionType('survivor'); },
  getVictims: function() { return this.getPlayersByConditionType('victim'); },
  getExecutions: function() { return this.getPlayersByConditionType('executed'); },
  getOthers: function() { return this.getPlayersByConditionType('other'); },


  getAlivePlayers: function () {
    var pArray = [];
    var ps = this.getEntriedPlayers();
    var pi, plen;
    for (pi=0, plen=ps.length; pi<plen; pi++) {
      var p = ps[pi];
      if (p && p.status && p.status.dead === 0) pArray.push(p);
    }
    return pArray;
  },

  getAlivePlayersAtPresent: function () {
    var pArray = [];
    var ps = this.getEntriedPlayers();
    var pi, plen;
    for (pi=0, plen=ps.length; pi<plen; pi++) {
      var p = ps[pi];
      if (p && p.status && p.status.dead !== 1) pArray.push(p);
    }
    return pArray;
  },

  isNight: function(opt_periodName) {
    // 実装はGameに委譲する
    var game = this.getGame();
    return game.substitute('isNight', opt_periodName);
  },

  // 正式なゲームマスターであるかどうか
  isMaster: function(userName) {
    // if (!this.options.gameMaster) return false;
    return this.isAuthor(userName);
  },

  // 村立てであるかどうか
  isAuthor: function (userName) {
    if (this.user.name === userName) return true;
    return false;
  },

  addMasterGroup: function(groupArray) {
    // TODO: 条件の最適化
    if (true) {
      groupArray.push('gm');
    }
    if (false) {
      groupArray.push('powergm');
    }
  },

  getGroupsByUserName: function (userName) {
    var p = this.selectPlayer(userName);
    if (!p) return null;

    var groupArray = p.getGroups();

    if (this.isMaster(userName)) {
      this.addMasterGroup(groupArray);
    }
    else if (/* this.state > 2 */true) {
      // groupArray.push('gm');
    }
    else if (/* p.isSpectator() === */true) {
      // groupArray.push('spectator');
    }
    else if (/* p.isDead() === */true) {
      // groupArray.push('groan');
      // groupArray.push('spectator');
    }
    else if (/* p.isAlive() === */true) {
      // nothing to do
    }
    else {
      // who the fuck
    }

    return groupArray;
  },

  getGame: function () {
    try {
      if (!this.game_) this.game_ = new Game[this.gameType](this);
      return this.game_;
    }
    catch (e) {
      console.log('getGame(): '+this.gameType+' is undefined. JinroGame will return instead.', e && e.stack);
      return new Game.JinroGame(this);
    }
  },
  
  getPlayerIdByUserName: function(uname) {
    if (this.players.length === 0) return 0;
    if (uname === '@dummy') return 1;

    for(var i=2, len=this.players.length; i<len; i++) {
      if (this.players[i] && this.players[i].user.name === uname) {
        return i;
      }
    }
    return 0;
  },

  /*
    要素追加関連メソッド、短縮メソッド
  */

  insertMessage: function(userName, day, periodName, content, opt) {
    return this.addMessage(Message.createMessage(this, userName, day, periodName, content, opt));
  },
  insertAnnounce: function(content, opt_classType, opt_groups) {
    return this.addMessage(Message.createAnnounce(this, content, opt_classType, opt_groups));
  },
  insertPrivateAnnounce: function(player, content, opt_classType) {
    var classType = opt_classType || player.getDefaultAnnounceClassType();
    var groups = [player.getPidGroup()];
    return this.addMessage(Message.createAnnounce(this, content, classType, groups));
  },
  insertInfo: function(content, opt) {
    return this.addMessage(Message.createInfo(this, content, opt));
  },

  addPlayer: function(player) {
    var new_pid = this.players.push(player) - 1;
    this.selectPlayer(new_pid).pid = new_pid;
    return new_pid;
  },

  addCharacter: function (chara) {
    var nc = new Character(chara);
    if (nc) this.characters.push(nc);
  },

  /*
    プレイヤーに関するメソッド
  */

  entryPlayer: function (userName, chara) {
    var p = this.selectPlayer(userName);
    if (!p) return false;

    p.index = this.pIndex++; //プレイヤ一覧の表示順
    p.status = this.jobs[rand(this.jobs.length)].defaultStatus;
    p.lastUpdate = new Date();

    p.name = chara.name;
    p.icon = chara.icon;
    
    p.condition.entry = true;
    p.condition.type = 'survivor';

    return true;
  },

  leavePlayer: function (userName) {
    var p = this.selectPlayer(userName);
    if (!p) return false;

    var def_p = createDefaultPlayer(p.user.name, null);
    p.name = def_p.name;
    p.icon = def_p.icon;
    p.condition = def_p.condition;
    p.status = def_p.status;

    return true;
  },

  isIconUsed: function (iconUrl) {
    var ps = this.getEntriedPlayers();
    for (var pi=0, plen=ps.length; pi<plen; pi++) {
      var p = ps[pi];
      if (p.icon && p.icon.url === iconUrl) return true;
    }
    return false;
  },

  findUnusedCharacter: function (opt_chara) {
    if (opt_chara) {
      if (!this.isIconUsed(opt_chara)) return opt_chara;
      return null;
    }
    
    for (var i=0, len=this.characters.length; i<len; i++) {
      var chara = this.characters[i];
      if (!this.isIconUsed(chara.icon.url)) return chara; 
    }
    return null;
  },

  /*
    アップデート関連メソッド
  */

  setNextUpdate: function (opt_periodMs) {
    var periodMs;
    if (opt_periodMs)
      periodMs = opt_periodMs;
    else if (this.periods[this.currentPeriod])
      periodMs = this.periods[this.currentPeriod] + 900;
    else
      periodMs = 180900;

    var _this = this;

    // グローバル変数の timeoutIds を利用します
    var vKey = '' + this.vid;
    var timeoutId = setTimeout(function () {
      try {
        delete timeoutIds[vKey];
        _this.updateGame(function (err) {
          if (err) handleError(err);
        });
      }
      catch (e)
      {
        handleError(e);
        return null;
      }
    }, periodMs);
    timeoutIds[vKey] = timeoutId;


    this.timeStamps.nextUpdate = new Date(Date.now() + periodMs);
  },

  resetNextUpdate: function (opt_periodMs) {
    // グローバル変数の timeoutIds を利用します
    var vKey = '' + this.vid;
    var timeoudId = timeoutIds[vKey];
    if (timeoutId) {
      clearTimeout(timeoutId);
      delete timeoutIds[vKey];
    }

    this.setNextUpdate(opt_periodMs);
  },

  updateGame: function (/* opt_force, callback */) {
    var opt_force, callback;
    if (arguments.length > 2 || arguments.length === 0) return null;
    if (typeof arguments[1] === 'function') {
      opt_force = arguments[0];
      callback = arguments[1];
    }
    else if (typeof arguments[0] === 'function') {
      callback = arguments[0];
    }
    else {
      return null;
    }

    Village.getVillageById(this.vid, findBroadcastMethod(this.vid), function (err, vil) {
      if (err) return callback(err);
      if (vil.lock) return callback(new Error('vil is already locked')); 
      vil.lock = true;
      vil.save(function(err, vil) {
        try {
          if (err) throw err;

          var game = vil.getGame();
          game.update();

          // finalize後は保存するものがない
          if (!vil.nextUpdateMethod) return;

          vil.modifyGameInfo();

          // 1. ブロードキャスト込みの通常保存
          vil.save(function (err, vil) {
            if (err) return callback(err);
            // 2. それの成功を受けてロック解除
            vil.lock = false;
            vil.save(function (err, vil) {
              if (err) return callback(err);
              // 3. 終了
              callback(null);
            });
          });

        }
        catch (e) {
          if (vil) {
            vil.lock = false;
            vil.save(function(){ callback(e); });
          }
          else {
            callback(e);
          }
        }
      });
    });
  },

  modifyPlayersInfo: function(player) {
    var ps = (player) ? [player] : this.players;
    this.insertInfo('players updated', {
      save: {
        players: ps
      }
    });
  },

  modifyGameInfo: function() {
    this.insertInfo('game updated', {
      save: {
        vilInfo: this.Info,
        players: this.players
      }
    });
  },

  updatePlayerTimeByUserName: function (userName) {
    var p = this.selectPlayer(userName);
    if (!p) return;
    p.lastUpdate = new Date();
    this.insertInfo('player time updated', {
      pid: p.pid,
      lastUpdate: p.lastUpdate
    });
  },

  updateVoteByUserName: function (voteId, userName) {
    var p = this.selectPlayer(userName);
    if (!p) return;
    p.status.vote = voteId;
    p.condition.voted = (votedId !== 0);
    this.insertInfo('player vote updated', {
      pid: p.pid,
      voted: p.condition.voted,
    });
  },


  /*
    各種ハンドラ（他クラスへの橋渡し）
  */

  handleCommand: function (commandName, userName, data) {
    var game = this.getGame();
    return game.command(commandName, userName, data);
  },



  /*
    メッセージ追加に関わるメソッド
  */

  addMessage: function(msg) {
    if (!msg || !msg.type) return null;

    // インベントリは一時的な静的変数
    if (!this.inventory_) this.inventory_ = [];

    msg = msg && this.increaseCount(msg);
    if (!msg) return null;

    // 成功した場合
    this.inventory_.push(msg);

    return msg;
  },

  increaseCount: function (msg) {
    var day = msg.day;
    var classType = (msg.type === 'announce') ? 'announce' : msg.classType;

    if (!this.count[day] || !this.count[day][classType]) {
      console.log('increaseCount: deny1');
      return null;
    }
    // 既にstepが存在したらまずい
    if (this.count[day][classType][this.step]) { 
      console.log('increaseCount: deny2', this.step);
      return null;
    }
    // step, countのインクリメント
    msg.step = this.step++;
    this.count[day][classType].push(msg.step);
    msg.classCount = this.count[day][classType].length-1;
    return msg;
  },

  interruptMessage: function (message) {
    // 実装はGameに委譲する
    return this.getGame().substitute('interruptMessage', message);
  },

  /*
    ビューにメッセージを返すメソッド
  */

  // ブロードキャストで使う
  sanitizeMessage: function(msg) {
    // infoは付加情報＝保存用情報なので除去
    // infoは全てeveryone向けに配信されるのでOK
    if (msg.type === 'info') {
      msg.notice = 'info';
      msg.hidden = true;
      if (msg.info && msg.info.save) msg.info.save = null; //save用の情報は除去
      return msg;
    }
    // everyoneはアタッチして送信してしまう 
    else if (msg.groups.indexOf('everyone') !== -1) {
      msg.notice = 'attached';
      return msg;
    }
    // TODO: infoように必要な気がしていたがもはやいらない気がする
    else if (msg.groups.indexOf('hidden') !== -1) {
      return {notice: "hidden", step: msg.step, content: "Permission denied.", hidden: true};
    }
    // そうでなければとりにきてもらう
    else {
      return {notice: "notice", step: msg.step};
    }
  },

  filterMessagesByUserName: function(userName, messages) {
    var p = this.selectPlayer(userName);
    if (!p) return null;

    var pGroups = this.getGroupsByUserName(userName);

    for (var i=0, len=messages.length; i<len; i++) {
      if (!messages[i]) continue;

      var matched;
      switch (messages[i].type) {
        case 'message':
        case 'announce':
          // わおーん
          if (messages[i].groups.indexOf('wolf') !== -1 && messages[i].type === 'message') {
            matched = arrayMatch(messages[i].groups, pGroups);
            if (!matched) messages[i] = this.createHowlMessage(messages[i]);
          }
          // それ以外
          else if (messages[i].groups.indexOf('everyone') === -1) {
            matched = arrayMatch(messages[i].groups, pGroups);
            if (!matched) {
              messages[i] = {step: messages[i].step, content: "Permission denied.", hidden: true};
            }
          }
          break;
        case 'info':
          messages[i] = {step: messages[i].step, content: "Permission denied.", hidden: true};
          break;
        default:
          messages[i] = {step: messages[i].step, content: "default", hidden: true};
          break;
      }
    }

    return messages;
  },

  createHowlMessage: function (message) {
    var howlLength = message.content.length/4 - 1 | 0;
    var howlBuff = '';
    for (var h=0; h<howlLength; h++) howlBuff += 'ー';
    var howlContent = 'わおー' + howlBuff + 'ん';
    message.content = howlContent;
    message.name = {first: "", last:"狼の遠吠え"};
    message.iconUrl = 'http://vipjinro5g.dip.jp/img/howl.png';
    message.groups = ['everyone'];
    message.classType = 'howl';
    return message;
  },

  getMessages: function(userName /*, opt_reqSteps, callback[err, messages] */) {
    var reqSteps, callback;
    if (typeof arguments[1] === 'function') { callback = arguments[1]; }
    else if (typeof arguments[2] === 'function') { reqSteps = arguments[1]; callback = arguments[2]; }
    else { return; }

    var p = this.selectPlayer(userName);
    if (!p) return;

    // メッセージ検索用のクエリを生成
    var query = {
      vid: this.vid,
    };
    if (reqSteps) {
      var len = reqSteps.length;
      if (len > 1) {
        query.step = { $in: reqSteps };
      }
      else if (len === 1) {
        query.step = reqSteps[0];
      }
    }

    // メッセージの検索
    var _this = this;
    Message.find(query).lean().exec(function (err, messages){
      try {
        if (err) throw err;
        messages = _this.filterMessagesByUserName(userName, messages);
        callback(null, messages);
      }
      catch (e) {
        callback(e);
      } 
    });
  },

  /*
    ビューに値を返すためのメソッド（Getter）
  */

  createConnection: function (userName, opt_socketId) {
    var p = this.selectPlayer(userName);
    if (p) {
      if (opt_socketId && p.user.sockedId !== opt_socketId) p.user.sockedId = opt_socketId;
      // 過去に接続済のユーザー
      return {
        pid: p.pid,
        isNew: false,
      };
    }
    else {
      // 新規接続ユーザー
      var new_p = createDefaultPlayer(userName, opt_socketId);
      var new_pid = this.addPlayer(new_p); 
      return {
        pid: new_pid,
        isNew: true,
      };
    }
  },

  getRestTimeMs: function() {
    var nowTimeMs = Date.now();
    var updateTimeMs = this.timeStamps.nextUpdate.getTime();
    return updateTimeMs - nowTimeMs;
  },

  filterPlayerInfoByUserName: function (t, userName) {
    if (!t || !t.status) return null;

    var name = t.toObject().name;
    delete name.nicknames;

    var new_info = {
      pid: t.pid,
      index: t.index,
      name: name,
      icon: t.icon,
      condition: t.condition,
      lastUpdate: t.lastUpdate,
      status: {},
    };

    var p = this.selectPlayer(userName);
    if (!p) return null;

    var pGroups = this.getGroupsByUserName(userName);

    for (var key in t.status.permitMap) {
      var prop = t.getStatusProperty(key, pGroups);
      if (prop) new_info.status[key] = prop;
    }

    return new_info;
  }, 

  getPlayersInfoByUserName: function (userName) {
    var pInfoArray = [];
    var ps = this.getEntriedPlayers();
    for (var i=0, len=ps.length; i<len; i++) {
      var p = ps[i];
      var new_pInfo = this.filterPlayerInfoByUserName(p, userName);
      if (new_pInfo) pInfoArray.push(new_pInfo);
    }
    return pInfoArray;
  },

  // 注意！selfInfoではフォーム等、インプット上のヴュー以外へ指示を出してはいけない
  // それはログの再生にかかわるからだ。selfInfoは保存されない！
  getSelfInfoByUserName: function (userName) {
    // 実装はGameに委譲する
    var game = this.getGame();
    return game.substitute('getSelfInfoByUserName', userName);
  },

  getVisibleConditionTypeMap: function () {
    return {
      survivor: '生存者',
      victim: '犠牲者',
      executed: '処刑',
    };
  },

  /*
    最終処理
  */

  finalize: function () {
    var _this = this;

    this.insertInfo('end', {save: {
      vilInfo: this.vilInfo,
      players: this.players,
    }});

    this.save(function (err) {
      if (err) return handleError(err);
      setTimeout(function () {
        try {
          _this.saveJsonLogFile(function () {
            Village.remove({_id:_this._id}, function (err_) {
              if (err_) return handleError(err_);

              Message.remove({vid:_this.vid}, function (err__) {
                if (err__) return handleError(err__);
              });

            });
          });
        }
        catch (e) {
          handleError(e);
        }
      }, VIL_FINALIZE_DELAY_MS);
    });
  },

  saveJsonLogFile: function (callback) {
    var _this = this;
    Message.find({vid: this.vid}).lean().exec(function (err, messages) {
      try {
        if (err) throw err;
        var pretty = (settings.DEBUG) ? '\t' : void 0;
        var logBuffer = JSON.stringify(messages, null, pretty);
        var logFileName = settings.logFileDir + 'vil' + _this.vid + '.json';

        fs.writeFile(logFileName, logBuffer, pretty, function (err) {
          try {
            if (err) throw err;
            callback();
          }
          catch (e) {
            handleError(e);
          }
        });
      }
      catch (e) {
        handleError(e);
      }
    });
  },

};

Village = module.exports = mongoose.model('Village', VillageSchema);