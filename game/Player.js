/*
 *  Player implements Speakable (has PlayerCharacter, PlayerList, Job)
 *    プレイヤーを表します。プレイヤーの状態にまつわる基本的な機能を提供します。
 *    Jobクラスのインスタンスを公開プロパティとして持っており、役職の機能はすべて委譲されます。
 */

var Utils = require("utils");
var PlayerCharacter = require('./PlayerCharacter');
var PlayerList = require('./PlayerList');
var Job = require('./Job');

var Player = function (userName, character, opt_job) {
  
  // Private Properties
  this._userName = userName;
  this._lastUpdate = new Date();

  this._targets = new PlayerList();
  this._voting = null;
  this._isReady = false;
  this._commit = false;

  // Public Properties
  this.job = opt_job || new Job();
  this.character = character;

};

// について
Player.prototype.updateTime = function() {
  this._lastUpdate = new Date();
};
Player.prototype.getLastUpdate = function() {
  return this._lastUpdate;
};

// 準備完了について
Player.prototype.ready = function() {
  this._isReady = true;
};
Player.prototype.unready = function() {
  this._isReady = false;
};
Player.prototype.isReady = function() {
  return this._isReady;
};

// 投票について
Player.prototype.vote = function(player) {
  this._voting = player;
};
Player.prototype.resetVoting = function() {
  this._voting = null;
};
Player.prototype.getVoting = function() {
  return this._voting;
};

// 対象選択について
Player.prototype.setTarget = function(players) {
  this.resetTarget();
  
  var ps = (players instanceof Array) ? players : [players];
  for (var i=0, len=ps.length; i<len; i++) {
    this._targets.add(ps[i]);
  }
};
Player.prototype.resetTarget = function() {
  this._targets.clear();
};
Player.prototype.getTarget = function(opt_index) {
  var index = opt_index || 0;
  return this._targets.get(index);
};

// 待機完了について
Player.prototype.commit = function() {
  this._commit = true;
};
Player.prototype.resetCommit = function() {
  this._commit = false; //TODO: reset by isCommitee()
};
Player.prototype.hasCommitted = function() {
  return this._commit;
};


Player.prototype.buildMessage = function(message) {
  // 名前・アイコンの設定
  message.name = {};
  message.name.first = this.character.getFirstName();
  message.name.last = this.character.getLastName();
  message.name.full = this.character.getFullName();
  message.icon = {};
  message.icon.url = this.character.icon.getUrl();

  // Jobクラスに責任連鎖
  this.job.buildMessage(message);
};

module.exports = Player;