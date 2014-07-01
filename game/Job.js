/*
 *  Job (has JobStatus)
 *    役職のプロトタイプです。このプロトタイプのメソッドを適宜オーバーライドして各役職を定義します。
 *  
 */

var Utils = require('utils');

var Job = function(occupation, keyword, status) {

  // Private Properties
  this._occupation = occupation;
  this._keyword = keyword;
  
  // Public Properties
  this.status = status;

};

/*
 * API Method (オーバーライドされない)
 */

Job.prototype.attack = function(target) {
  target.status.hp -= this.status.atk;
  if (target.status.hp < 0) target.status.hp = 0;
};
Job.prototype.fortune = function(target) {
  return (target.status.fortune);
};
Job.prototype.spirit = function(target) {
  return (target.status.spirit);
};
Job.prototype.guard = function(target) {
  target.status.guardian = this;
};


/*
 * Template Method (オーバーライドされる)
 */

// 特別な会話を許可しないデフォルトメソッド

Job.prototype.buildMessage = function(message) {

};

// 初期化用のメソッド
// 戻り値を返しません

// 昼時間が始まる直前に呼び出されます。
Job.prototype.dayInitializer = function() {
  this.guardian = null;
};
// 深夜時間が始まる直前に呼び出されます。
Job.prototype.midnightInitializer = function() { };

// 役職実行するメソッド
// function execMethod(GameAdapter adapter, Player me)
Job.prototype.execMorning = function() { return []; };
Job.prototype.execAttack = function() { return []; };
Job.prototype.execBeforeExecution = function() { return []; };
Job.prototype.execAfterExecution = function() { return []; };
