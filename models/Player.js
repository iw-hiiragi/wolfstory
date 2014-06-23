
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;

var utils = require('utils');
var settings = require('settings');
var PlayerStatus = require('./Job').PlayerStatus;

// Utilities
var arrayMatch = utils.arrayMatch;
var isArray = utils.isArray;
var rand = utils.rand;
var _LOG = utils._LOG;

var PlayerSchema = new Schema({
  pid: Number,
  index: {type: Number},
  user: {
    name: String,
    socketId: String,
  },
  name: {
    first: String,
    last: String,
    nicknames: [String],
  },
  icon: {
    url: {type: String, default: null},
    suffix: {type: String, default: ".png"},
    options: [String],
    gender: {type: String, default: "unknown"},
  },
  condition: {
    entry: {type: Boolean},
    ready: {type: Boolean},
    voted: {type: Boolean, default: false},
    type: {type: String},

    day: {type: Number}, 
  },
  status: Schema.Types.Mixed,
  lastUpdate: Date,

}, settings.schemaOptions);

var createDefaultPlayer = function(userName, opt_socketId) {

  var defaultName = userName;

  var defaultPlayer = {
    user: {
      name: userName,
      socketId: opt_socketId || null,
    },
    name: {
      first: "",
      last: defaultName,
      nicknames: [],
    },
    icon: {
      url: null,
      suffix: ".png",
      options: [],
      gender: "unknown",
    },
    condition: {
      entry: false,
      vote: 0,
      ready: false,
      type: "spectator",
      day: 0, 
    },
    status: new PlayerStatus(),
    lastUpdate: new Date(),
  };

  return defaultPlayer;
};

PlayerSchema.virtual('name.full').get(function(){
  return (this.name.first) ? this.name.first + ' ' + this.name.last : this.name.last;
});

PlayerSchema.virtual('name.full').set(function(v){
  v = utils.escape(v);
  if (v.match(/^(.+)\s(.+)$/)) {
    this.name.first = RegExp.$1;
    this.name.last = RegExp.$2;
  }
  else {
    this.name.first = '';
    this.name.last = v;
  }
});

PlayerSchema.methods = {

  canJobAction: function () {
    if (!this.status || !this.status.mp) return false;
    if (!this.status.isCommittee) return false;
    return true;
  },

  canSelectTarget: function () {
    if (!this.canJobAction()) return false;
    if (this.status.commit) return false;
    return true;
  },

  isDead: function () {
    if (!this.condition.entry) return false;
    if (this.status.dead === 1) return true;   
    return false;
  },

  isSpectator: function () {
    if (!this.condition.entry) return true;
    return false;
  },

  isAlive: function () {
    return !(this.isDead() || this.isSpectator());
  },

  checkTargets: function () {
    var targets = this.status.targets;
    var exceptedNum = this.status.numTargets;
    if (targets.length !== exceptedNum) return false;

    if (!this.status.targetsCanOverlap) {
      var overlapping = (targets.length !== utils.uniqueArray(targets).length);
      if (overlapping) return false;
    }

    return true;
  },

  // status.groups関連
  getPidGroup: function () { return 'pid_' + this.pid; },
  getSidGroup: function () { return (this.status && this.status.sid) ? 'sid_' + this.status.sid : undefined; },
  getGroups: function () {
    var gArray = [this.getPidGroup()];
    if (this.getSidGroup()) gArray.push(this.getSidGroup());
    if (!this.status || !this.status.groups) return gArray;

    for (var i=0, len=this.status.groups.length; i<len; i++)
      gArray.push(this.status.groups[i]);

    return gArray;
  },

  getStatusProperty: function (targetKey, myGroups) {
    var status = this.status;
    if (!status || !targetKey) return null;
    if (!isArray(myGroups)) return null;
    
    var targetGroups = status.permitMap[targetKey];
    if (!isArray(targetGroups)) return null;

    var targetObj = status[targetKey];
    if (targetObj === undefined || targetObj === null) return null;

    var has_permission = targetGroups.indexOf('everyone') !== -1 || arrayMatch(targetGroups, myGroups);
    if (has_permission) {
      return targetObj;
    }
    return null;
  },

  getDefaultAnnounceClassType: function () {
    switch (this.status.team) {
      case 'folk':
        return 'folk';
      case 'wolf':
        return 'wolf';
      default:
        return 'normal'; 
    }
  },

  getDefaultNightClassType: function () {
    var nmo = this.getDefaultNightMessageOption();
    return (nmo) ? nmo.name : 'think';
  },

  getDefaultNightMessageOption: function () {
    var opt = this.status.nightMessageOption;
    if (opt) {
      return opt;
    }
    else {
      return null;
    }
  },

};

exports.Schema = PlayerSchema;
exports.createDefaultPlayer = createDefaultPlayer;