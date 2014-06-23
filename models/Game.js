

var JOB_METHODS_LAYER_MAX = 5;
var MAX_STACK = 300;

var TEXT = require('resource').text;

var settings = require('settings');



var utils = require('utils');
var shuffleArray = require('utils').shuffleArray;
var rand = require('utils').rand;
var isArray = utils.isArray;
var PlayerIterator = utils.PlayerIterator;

var _LOG = function () {
  return console.log.apply(null, arguments);
};

var handleError = function (e) {
  _LOG('[game error]', e && e.stack);
};


var jobMethods = require('./Job').jobMethods;

var JinroGame = function (vil) {
  
  this.vil_ = vil;
  this.privateMethods.vil_ = vil;

  if (!vil.nextUpdateMethod) {
    vil.nextUpdateMethod = 'gameReady';
    this.update();
  }
};

/*

  Village.setNextUpdate / resetNextUpdate のタイムアウトから呼び出される：
    update()
    +- updateMethods[]

  Village.handleCommandから呼び出される：
    command()
    +- commandMethods[]
    
  下記のメソッドを実装して、Villageの機能を一部代替する必要がある：
    substitute()
    +- substituteMethods[]
       +- isNight
       +- getSelfInfoByUserName
       +- interruptMessage

*/

JinroGame.prototype = {
  
  update: function () {
    var vil = this.vil_;
    try {
      var uFunc = this.updateMethods[vil.nextUpdateMethod];
      if (typeof uFunc !== 'function') throw new Error('updateMethods -> ' + vil.nextUpdateMethod + ' is not a function.');

      console.log('[game] update method is called. (as ' +vil.nextUpdateMethod+ ')');

      try {
        uFunc.call(this.privateMethods, vil);
      }
      catch (e) {
        handleError(e);
      }
      finally {
        // どんなエラーがあっても次のタイムアウトは呼ばれてほしい
        if (vil.nextUpdateMethod) vil.setNextUpdate();
      }

    }
    catch (e) {
      handleError(e);
      return null;
    }
  },
  
  // Errorオブジェクトをthrowすると、実際のエラーとして処理される
  // 文字列をthrowすると、その文字列をコマンド失敗の理由としてクライアントに返す処理になる
  command: function (commandName, userName, data) {
    try {
      var vil = this.vil_;
      var cMethod = this.commandMethods[commandName];
      if (typeof cMethod !== 'function') throw new Error('commandMethods -> ' + commandName + ' is not a function.');
      _LOG('[game '+ vil.vid +'] command method ('+ commandName +') is called.');

      cMethod.call(this.privateMethods, userName, data);
      return {success: true};
    }
    catch (e) {
      if (e instanceof Error) {
        handleError(e);
        return {error: true, message: e.message};
      }
      else if (typeof e === 'string') {
        return {error: true, message: e};
      }
    }
  },

  // Villageの機能を一部代替するために用意されている
  // substituteMethodsを呼び出すためのメソッド
  substitute: function (/* methodName, args1, args2, ... */) {
    var methodName = arguments[0];
    var args;
    if (isArray(arguments[1]) && arguments.length === 2) {
      args = arguments[1];
    }
    else {
      args = [];
      for (var i=1, len=arguments.length; i<len; i++) {
        args.push(arguments[i]);
      }
    }
    
    try {
      return this.substituteMethods[methodName].apply(this.privateMethods, args);
    }
    catch (e) {
      handleError(e);
      return void 0;
    }
  },

  // updateMethods, commandMethods等から参照されるビジネスロジック郡
  privateMethods: {

    callJobMethod: function (methodName, p) {
      var vil = this.vil_;
      return jobMethods.doCall(methodName, vil, p);
    },

    handleJobMethods: function (opt_layerFrom, opt_layerTo, opt_periodName) {
      var vil = this.vil_;
      var periodName = opt_periodName || vil.currentPeriod;
      var layerFrom = opt_layerFrom || 0;
      var layerTo = opt_layerTo || JOB_METHODS_LAYER_MAX;
      var ps = shuffleArray(vil.getEntriedPlayers());

      // レイヤのループ
      var i, len;
      for (i=layerFrom, len=layerTo; i<=len; i++) {
        var layerName = '' + periodName + i;
        
        // プレイヤーのループ
        var pi, plen;
        for (pi=0, plen=ps.length; pi<plen; pi++) {
          var p = ps[pi];
          try {
            jobMethods.exec(layerName, vil, p, handleError);
          }
          catch (e) { handleError(e); }
        }
      }
    },

    resolveDeath: function (numDead, p, typeName, arrayToPush) {
      var vil = this.vil_;
      jobMethods.exec(typeName, vil, p, handleError);

      // execの結果、deadプロパティが変化したならば
      if (p.dead !== numDead) {
        return; // 再度resolveされるべし
      }

      if (arrayToPush instanceof Array) arrayToPush.push(p);
      p.dead = 1; //死亡
    },

    updateDeadProperty: function (opt_stackCnt) {
      var vil = this.vil_;
      var victimsArray = [];
      var executionsArray = [];
      var followersArray = [];

      var ps = vil.getEntriedPlayers();
      shuffleArray(ps);

      var cnt = opt_stackCnt || 0;

      // 参加者のイテレート
      for (var i=0, len=ps.length; i<len; i++) {
        var p = ps[i];
        if (!p) continue;
        // 生きている
        if (p.dead === 0) {
          jobMethods.exec('alive', vil, p, handleError); // 複数回呼ばれる可能性に留意
          continue;
        }
        // 死んでいる
        if (p.dead === 1) {
          jobMethods.exec('dead', vil, p, handleError); // 複数回呼ばれる可能性に留意
          continue;
        }
        // 死にそう
        switch (p.dead) {
          case 2:
            this.resolveDeath(2, p, 'victim', victimsArray);
            break;
          case 3:
            this.resolveDeath(3, p, 'execution', executionsArray);
            break;
          case 4:
            this.resolveDeath(4, p, 'follow', followersArray);
            break;
          default:
            p.dead = 1;
            /* undefined */
        }
      }

      // 表示する
      if (victimsArray.length) this.announceVictims(victimsArray);
      if (executionsArray.length) this.announceExecutions(executionsArray);
      if (followersArray.length) this.announceFollowers(followersArray);

      var updatablePlayers = vil.filterPlayers(function (p) { return p.dead > 1; });
      if (updatablePlayers.length) { 
        // 再帰
        if (cnt < MAX_STACK) this.updateDeadProperty(++cnt);
      }
    },
    
    announceVictims: function (victims) {
      var vil = this.vil_;
      for (var i=0, len=victims.length; i<len; i++) {
        var v = victims[i];
        vil.insertAnnounce('' + v.name.full + ' が無残な姿で発見されました。', 'victim');
      }
    },
    announceFollowers: function (followers) {
      var vil = this.vil_;
      for (var i=0, len=followers.length; i<len; i++) {
        var f = followers[i];
        vil.insertAnnounce('悲しみにくれた ' + f.name.full + ' は、自ら死を選びました。', 'follow');
      }
    },
    announceExecutions: function (executions) {
      var vil = this.vil_;
      for (var i=0, len=executions.length; i<len; i++) {
        var e = executions[i];
        vil.insertAnnounce('投票の結果 ' + e.name.full + ' は処刑されました。', 'execution');
      }
    },

    isComingOutable: function (player) {
      if (!player.status.comingOutable) return false;
      
      var vil = this.vil_;
      if (vil.currentPeriod === 'day') return true; 
      return false;
    },

    isSayablePeriod: function (periodName) {
      if (periodName === 'day') return true;
      if (periodName === 'gameReady') return true;
      if (periodName === 'gameOver') return true;
      return false;
    },  

    isAvailableType: function (classType, p) {
      var vil = this.vil_;
      if (vil.isMaster(p.user.name)) return true;

      // 独り言はいつでも可能
      if (classType === 'think') {
        return true;
      }
      // 通常発言が可能か
      else if (classType === 'say') {
        if (!this.isSayablePeriod(vil.currentPeriod)) return false;
        if (vil.state === 2) {
          if (p.isDead()) return false;
        }
        return true;
      }
      // 観戦発言が可能か
      else if (classType === 'spectator') {
        if (p.isSpectator()) return true;
        return false;
      }
      // 霊界会話が可能か
      else if (classType === 'groan') {
        if (p.isDead()) return true;
        return false;
      }
      // それ以外（特殊チャット全て）
      else {
        if (p.getDefaultNightClassType() === classType) return true;
        return false;
      }
    },

    createMessageOptions: function (player) {
      var vil = this.vil_;
      var options = [];
      var thinkOption = {name: 'think', jName: '独り言'};

      if (player.isDead()) {
        options.push({name: 'groan', jName: '死者のうめき'});
      }
      else if (player.isSpectator()) {
        options.push({name: 'spectator', jName: '観戦発言'});
      }
      else if (vil.isNight()) {
        var def_opt = player.getDefaultNightMessageOption();
        if (def_opt) {
          options.push(def_opt);
        }
        else {
          options.push(thinkOption);
          thinkOption = null;
        }
      }
      else {
        options.push({name: 'normal', jName: '通常'});
      }

      options.push({name: 'loud', jName: '大声'});
      options.push({name: 'pastel', jName: '色付き'});
      if (this.isComingOutable(player)) options.push({name:'co', jName: 'ＣＯ'});
      options.push({name: 'aa', jName: '小文字'});

      if (thinkOption) options.push(thinkOption);

      options.push({name: 'howl', jName: 'テスト'});

      return options;
    },

    sanitizeMessageOption: function (messageOption) {
      switch (messageOption) {
        case 'aa':
        case 'co':
        case 'pastel':
        case 'loud':
          return messageOption;
        default: 
          return 'normal';
      }
    },

    getDefaultClassType: function (p) {
      var vil = this.vil_;
      // いずれかの非生存状態なら
      if (p.isSpectator()) return 'spectator';
      if (p.isDead()) return 'groan';
      if (vil.isMaster(p)) return 'spectator';

      // 生存状態なら
      if (this.isSayablePeriod(vil.currentPeriod)) {
        return 'say'; // 昼間は通常発言
      }
      else if (vil.currentPeriod === 'midnight') {
        return p.getDefaultNightClassType(); // 深夜は対応するチャット
      }
      else {
        return 'think'; // それ以外の期間は独り言
      }
    },

    createGroupsByClassType: function (classType, p) {
      var groups = [];
      switch (classType) {
        case 'say':
          groups.push('everyone');
          break;
        case 'think':
          groups.push('gm');
          groups.push(p.getPidGroup());
          break;
        default:
          groups.push('gm');
          groups.push(classType);
      }
      return groups;
    },

    createTargetLists: function (p) {
      if (!p.status.isCommittee) return null;

      var selectors = p.status.targetSelectors;
      if (!selectors) return null;

      var vil = this.vil_;
      var lists = [];

      var ps = vil.getEntriedPlayers();
      var i = 1;
      var key = 'target' + i;
      while (key in selectors) {
        var selector = selectors[key];
        var targetList = [];
        if (typeof selector === 'string') {
          for (var pi=0, plen=ps.length; pi<plen; pi++) {
            var t = ps[pi];
            var isTarget = jobMethods.doCall(selector, vil, t);
            if (isTarget)
              targetList.push(t.pid);
          }
          if (targetList.length > 0) lists.push(targetList);
        }
        else if (isArray(selector)) {
          lists.push(selector);
        }
        key = 'target' + (++i);
      }
      return (lists.length > 0) ? lists : null;
    },

    assignJobs: function () {
      /*
      var vil = this._vil;
      var pit = PlayerIterator.create(vil.getEntriedPlayers());
      if (!pit) return null;

      pit.shuffle();
      while (pit.hasNext()) {
        var p = pit.next();
      }
      */
    },
  },

  updateMethods: {

    gameReady: function () {
      var vil = this.vil_;
      vil.currentPeriod = 'gameReady';

      // TODO: ここにログ用の初期化情報を
      vil.insertAnnounce(TEXT.FIRST_ANNOUNCE);

      var dumChara = vil.findUnusedCharacter(/* opt_chara */);
      if (dumChara && vil.entryPlayer(1, dumChara)) {
        var dum = vil.selectPlayer(1);
        vil.insertAnnounce('' + dum.name.full + ' が村を訪れました。');
        vil.insertMessage(1, vil.day, vil.currentPeriod, dumChara.serif);
      }
      else {
        vil.insertAnnounce('第一犠牲者を追加できませんでした。', 'error');
      }

      if (settings.DEBUG) {
        for (var i=2; i<12; i++) {
          var con = vil.createConnection('@dummy' + (i-1));
          var pid = con.pid;

          var dbgDumChara = vil.findUnusedCharacter();
          vil.entryPlayer(pid, dbgDumChara);
          var dbgDum = vil.selectPlayer(pid);
          vil.insertAnnounce('' + dbgDum.name.full + ' が村を訪れました。');
          vil.insertMessage(pid, vil.day, vil.currentPeriod, dbgDumChara.serif);
        }
      }

      vil.nextUpdateMethod = 'autoGameOver';
    },

    forceStart: function () {
      var vil = this.vil_;
      vil.currentPeriod = 'night';

      // 初期化
      vil.state = 2;
      vil.day = 1;

      this.assignJobs();

      // TODO: ここにゲームを記述
      vil.insertAnnounce('人狼、それは伝説の生物。', 'game');
      vil.insertAnnounce('頑張って退治しよう。', 'game');

      vil.nextUpdateMethod = 'toMorning';
    },

    toMorning: function () {
      var vil = this.vil_;
      vil.currentPeriod = 'morning';
      
      this.handleJobMethods(0, 3);
      this.callJobMethod('wolfAttack'); // 狼の噛み
      this.handleJobMethods(4, 4);

      this.updateDeadProperty();
      
      this.handleJobMethods(5, 5);

      vil.insertAnnounce('朝になりました。');
      vil.nextUpdateMethod = 'toDay';
    },

    toDay: function () {
      var vil = this.vil_;
      vil.currentPeriod = 'day';
      vil.insertAnnounce('昼になりました。');
      vil.nextUpdateMethod = 'toEvening';
    },

    toEvening: function () {
      var vil = this.vil_;
      vil.currentPeriod = 'evening';
    
      vil.insertAnnounce('夕方になりました。');
      vil.nextUpdateMethod = 'toNight';
    },

    toNight: function () {
      var vil = this.vil_;
      vil.currentPeriod = 'night';
    
      vil.insertAnnounce('夜になりました。');
      vil.nextUpdateMethod = 'toMidnight';
    },

    toMidnight: function () {
      var vil = this.vil_;
      vil.currentPeriod = 'midnight';
      vil.insertAnnounce('深夜になりました。');
      vil.nextUpdateMethod = 'toDawn';
    },

    toDawn: function () {
      var vil = this.vil_;
      vil.currentPeriod = 'dawn';
      
      vil.insertAnnounce('夜明け前になりました。');
      
      vil.nextUpdateMethod = 'toMorning';
    },
    gameOver: function () {
      var vil = this.vil_;
      vil.currentPeriod = 'gameOver';
      vil.insertAnnounce('ゲームオーバーです。'); 
      vil.nextUpdateMethod = 'finalize';
    },
    forceGameOver: function () {
      var vil = this.vil_;
      vil.currentPeriod = 'gameOver';
      vil.nextUpdateMethod = 'finalize';
    },
    autoGameOver: function () {
      var vil = this.vil_;
      vil.currentPeriod = 'gameOver';
      vil.insertAnnounce('自動終了処理が行われました。');
      vil.nextUpdateMethod = 'finalize';
    },

    finalize: function () {
      var vil = this.vil_;

      vil.currentPeriod = 'finalize';
      vil.insertAnnounce('この村は終了しました。');

      vil.finalize();

      vil.nextUpdateMethod = null;
    },
  },

  commandMethods: {
    entry: function (userName, data) {
      var vil = this.vil_;
      if (vil.state !== 1) throw 'ゲームがすでに開始しています。';
      
      var chara = data && data.chara;
      var p = vil.selectPlayer(userName);
      if (!chara || !p || p.condition.entry) throw 'あなたはすでに参加しています。';

      if (vil.isIconUsed(chara.icon.url)) throw 'そのアイコンは既に使用されています。';

      if (vil.entryPlayer(userName, chara)) {
        vil.modifyPlayersInfo(p); // playersの変更を知らせる
        vil.insertAnnounce(p.name.full+' が村を訪れました。');
        vil.insertMessage(p.user.name, vil.day, vil.currentPeriod, chara.serif);
      }
      else {
        throw '入村処理に失敗しました。';
      }

    },

    leave: function (userName) { 
      var vil = this.vil_;
      if (vil.state !== 1) throw 'ゲームがすでに開始しています。';

      var p = vil.selectPlayer(userName);
      if (!p || !p.condition.entry) throw 'あなたはまだ参加していません。';

      var tmpName = p.name.full;

      if (vil.leavePlayer(userName)) {
        vil.insertAnnounce(tmpName + ' が村を去りました。');
        vil.modifyPlayersInfo(p); // playersの変更を知らせる
      }
      else {
        throw '退村処理に失敗しました';
      }

    },

    vote: function (userName, data) {
      var vil = this.vil_;
      if (vil.isNight()) throw '現在は投票できません。';

      var p = vil.selectPlayer(userName);
      if (!p || !p.isAlive()) throw 'あなたには投票権がありません。';

      var voteId = data.voteId;
      if (typeof voteId === 'undefined') {
        throw '投票対象が見つかりませんでした。';
      }
      else if (voteId === 0 || voteId === null) {
        vil.updateVoteByUserName(0, userName);
      }
      else {
        var t = vil.selectPlayer(voteId);
        if (!t || !t.isAlive()) throw '投票対象が見つかりませんでした。';

        vil.updateVoteByUserName(voteId, userName);
      }
    },

    selectTargets: function (userName, data) {
      var vil = this.vil_;
      if (!vil.isNight()) throw '現在は対象選択できません。';

      var p = vil.selectPlayer(userName);
      if (!p || !p.isAlive() || !p.status.isCommittee) throw 'あなたには対象選択権がありません。';
      if (p.status.commit) throw 'あなたは既に対象選択をしています。';

      var targets = data.targets;
      if (typeof targets === 'undefined' || !isArray(targets) || targets.length === 0) {
        throw '選択対象が見つかりませんでした。';
      }
      else {
        var targetsError = p.checkTargets();
        if (targetsError) throw targetsError;

        var t = vil.selectPlayer(targets[0]);
        var tmp = utils.sprintf('{1} は {2} に役職設定しました。', p.name.full, t.name.full);
        vil.insertPrivateAnnounce(p, tmp, 'vote');
        p.status.commit = true;
      }
    },

    updatePlayerTime: function (userName) {
      var vil = this.vil_;
      vil.updatePlayerTimeByUserName(userName);
    },

    /*
      マスターコマンド
    */
    start: function (userName) {
      var vil = this.vil_;
      if (!vil.isAuthor(userName)) return null; // 仮GMも可
      vil.nextUpdateMethod = 'forceStart';
      vil.resetNextUpdate(50);  
    },

    expandTime: function (periodMs) {
      var vil = this.vil_;
      if (!vil.isAuthor(userName)) return null; // 仮GMも可
      vil.resetNextUpdate(periodMs);
    },

    gameOver: function () {
      var vil = this.vil_;
      if (!vil.isMaster(userName)) return null;
      vil.nextUpdateMethod = 'forceGameOver';
      vil.resetNextUpdate(50);
    },

  },

  substituteMethods: {

    isNight: function (opt_periodName) {
      var vil = this.vil_;
      var periodName = opt_periodName || vil.currentPeriod;
      switch (periodName) {
        case 'morning':
        case 'day':
        case 'evening':
          return false;
        case 'night':
        case 'midnight':
        case 'dawn':
          return true;
        default:
          return false;
      }
    },

    getSelfInfoByUserName: function (userName) {
      var vil = this.vil_;
      var p = vil.selectPlayer(userName);
      if (!p) return null;

      var new_info = {
        pid: p.pid,
        entry: p.condition.entry,
        name: p.name,
        lastUpdate: p.lastUpdate,
        userName: userName,
        isMaster: vil.isMaster(userName),
        isAuthor: vil.isAuthor(userName),
        messageOptions: this.createMessageOptions(p),
        targetLists: vil.isNight() ? this.createTargetLists(p) : null,
        isCommittee: p.status.isCommittee,
      };
      return new_info;
    },

    interruptMessage: function (message) {
      if (message.type !== 'message') return;

      var vil = this.vil_;
      var p = vil.selectPlayer(message.pid);
      if (!p) return;

      // classTypeを設定
      message.classType = this.getDefaultClassType(p);

      // thinkオプション適用時か、適用できないクラスか、日時がおかしいならthinkに
      // think以外のmsgopt.nameは、さして重要ではない。sanitizeで生き残れば子classになるし、そうでなければ表示用の糧にすぎない
      var dateNotSame = (message.day !== vil.day || message.periodName !== vil.currentPeriod);
      var thinkOption = (message.messageOption === 'think');
      if (!this.isAvailableType(message.classType, p) || dateNotSame || thinkOption) {
        _LOG(!this.isAvailableType(message.classType, p), dateNotSame, thinkOption);
        _LOG(message.day, vil.day, message.periodName, vil.currentPeriod);
        message.classType = 'think';
      }

      message.messageOption = this.sanitizeMessageOption(message.messageOption);
      message.groups = this.createGroupsByClassType(message.classType, p);
    },
  },

};

var Game = {
  "JinroGame": JinroGame,
};

module.exports = Game;