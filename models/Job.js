
var utils = require('utils');
var arrayMatch = utils.arrayMatch;
var isArray = utils.isArray;

var PlayerStatus = function (initObj, jobName, jobNameJ) {

  initObj = initObj || {};

  this.jobName = jobName || '@undefined';
  this.jobNameJ = jobNameJ || '＠未設定';
  this.sid = 0; // ユニークなIDを振って下さい

  this.dead = initObj.dead || 0;
  this.win = initObj.win || 0;

  this.hp = initObj.hp || 0;
  this.cp = initObj.cp || 0;
  this.str = initObj.str || 0;
  this.def = initObj.def || 0;

  this.fortuneResult = initObj.fortuneResult || 'human';
  this.spiritResult = initObj.spiritResult || 'human';

  this.successRate = initObj.successRate || 100;
  this.ballots = initObj.ballots || 1;

  this.groups = initObj.groups || [];
  this.methods = initObj.methods || {};

  this.targets = initObj.targets || [];
  this.vote = initObj.vote || 0;

  this.targetSelectors = initObj.targetSelectors || null;
  this.targetsCanOverlap = initObj.targetsCanOverlap || false;

  this.numTargets = (function(s){ 
    var i = 0; for (var k in s) ++i; return i;
  })(this.targetSelectors);

  // note: isCommitteeは深夜になる度にリセットされるべし
  this.isCommittee = initObj.isCommittee || (this.targetSelectors) ? true : false;
  this.commit = initObj.commit || false;

  this.nightMessageOption = initObj.nightMessageOption || null;
  this.team = initObj.team || 'single';

  this.comingOutable = initObj.comingOutable || true; //注！default to true

  this.permitMap = {
    jobNameJ: ['gm'],
    win: ['gm'],
    spiritResult: [],
    fortuneResult: [],
  };

  if (initObj.permitMap) {
    for (var key in initObj.permitMap) {
      if (initObj.permitMap[key] instanceof Array) this.permitMap[key] = initObj.permitMap[key];
    }
  }

};

var addStatusPermission = function (status, permitKey, permitGroup) {
  if (!status || !status.permitMap) return;
  if (status.permitMap[permitKey]) {
    status.permitMap[permitKey].push(permitGroup);
  }
  else {
    status.permitMap[permitKey] = [permitGroup];
  }
};

var deleteStatusPermission = function (status, permitKey, opt_permitGroup) {
  if (!status || !status.permitMap || !status.permitMap[permitKey]) return;
  var key;
  if (opt_permitGroup) {
    for (var i=0, len=status.permitMap[permitKey].length; i<len; i++)
      if (status.permitMap[permitKey][i] === opt_permitGroup)
        status.permitMap[permitKey].splice(i, 1);
  }
  else {
    delete status.permitMap[permitKey];
  }
};

var Job = function (initObj) {

  this.name = initObj.name || '@undefined';
  this.jName = initObj.jName || '＠未設定';
  this.sName = initObj.sName || '＠';

  this.defaultStatus = new PlayerStatus(initObj.defaultStatus || {}, this.name, this.jName);

};

var jobMethods = {

  /*
    selectors:
  */
  selectSurvivor: function (vil, t) {
    if (!t.isAlive()) return false;
    return true;
  },
  exceptWolfAfter2ndDay: function (vil, t) {
    if (vil.day < 2) return false; // 夜はまだ１日目
    if (!t.isAlive()) return false;
    if (t.isWolf()) return false;
    return true;
  },
  selectAfter2ndDay: function (vil, t) {
    if (vil.day < 2) return false; // 夜はまだ１日目
    if (!t.isAlive()) return false;
    return true; 
  },

  /*
    actions:
  */
  wolfAttack: function (vil) {
    if (vil.day === 2) {
      vil.insertAnnounce('人狼たちは初日にダミーを襲撃しました。', 'wolf', ['wolf']);
    }
    else {
      vil.insertAnnounce('人狼たちは襲撃しました', 'wolf', ['wolf']);
    }
  },

  fortuneTellerMorning: function (vil, p) {
    vil.insertPrivateAnnounce(p, '' + p.name.full + 'は占いました。');
  },

  hunterMorning: function (vil, p) {
    vil.insertPrivateAnnounce(p, '' + p.name.full + 'は頑張りました。');
  },
};


/*
  jobMethodsの定義
  
  morning0: 占い師（登録が必要）
  morning1 ~ 3: 朝になると実行
  morning3.5: 狼の噛み（固定）
  morning4: 狼の噛みよりも後
  morning4.5: 死亡確定
  morning5: 死亡確定後


  day0 ~ 5: 昼になると実行
  
  evening0 ~ 5: 投票時間になると実行
  
  night0 ~ 2: 投票の集計前に実行
  night3 ~ 5: 投票の集計後に実行

  midnight0 ~ 5: 深夜になると実行

  dawn0 ~ 5: 夜明け前になると実行
*/

var Standard = [

  {
    name: 'folk', jName: '村人', sName: '村',
    defaultStatus: {
      team: 'folk',
      hp: 100, cp: 0, str: 0, def: 0,
      groups: [],
      fortuneResult: 'human', spiritResult: 'human',
      comingOutable: false,
    },
  },

  {
    name: 'wolf', jName: '人狼', sName: '狼',
    defaultStatus: {
      team: 'wolf', nightMessageOption: {name: 'wolf', jName: '遠吠え'},
      hp: 100, cp: 10000, str: 100, def: 0,
      groups: ['wolf'],
      fortuneResult: 'wolf', spiritResult: 'wolf',
      methods: {
        // morning3.5: 'wolfAttack',
      },
      targetSelectors: {
        target1: 'exceptWolfAfter2ndDay',
      }
    },
  },

  {
    name: 'fortuneTeller', jName: '占い師', sName: '占',
    defaultStatus: {
      team: 'folk',
      hp: 100, cp: 10000, str: 0, def: 0,
      groups: [],
      fortuneResult: 'human', spiritResult: 'human',
      methods: {
        morning0: ['fortuneTellerMorning'],
      },
      targetSelectors: {
        target1: 'selectSurvivor',
      }
    },
  },

  {
    name: 'hunter', jName: '狩人', sName: '狩',
    defaultStatus: {
      team: 'folk',
      hp: 100, cp: 10000, str: 0, def: 0,
      groups: [],
      fortuneResult: 'human', spiritResult: 'human',
      methods: {
        morning3: ['hunterMorning'],
      },
      targetSelectors: {
        target1: 'selectAfter2ndDay',
      }
    },
  },

];



jobMethods.exec = function (layerName, vil, p, errorHandleFunc) {
  var s = p && p.status;
  if (!s || !s.methods) return;

  var methodNames = s.methods[layerName];
  if (!(methodNames instanceof Array)) return;

  for (var i=0, len=methodNames.length; i<len; i++) {
    var methodName = methodNames[i];
    try {
      this.doCall(methodName, vil, p);
    }
    catch (e) {
      if (typeof errorHandleFunc === 'function') {
        errorHandleFunc(e);
      }
      else {
        throw e;
      }
    }
  }
};

jobMethods.doCall = function (/* methodName, arg1, arg2, ... */) {
  var args = [];
  var methodName = arguments[0];
  for (var i=1, len=arguments.length; i<len; i++) {
    args.push(arguments[i]);
  }
  
  return this[methodName].apply(this, args);
};

exports.PlayerStatus = PlayerStatus;
exports.Job = Job;

exports.addStatusPermission = addStatusPermission;
exports.deleteStatusPermission = deleteStatusPermission;
exports.standardJobs = Standard;

exports.jobMethods = jobMethods;