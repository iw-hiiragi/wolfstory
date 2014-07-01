/*
 *  VillageStateManager implements Iterator
 *    村の状態(State)の管理を行います。
 *    拡張する可能性はあるけど現在のところハードコーディング。
 */

var VillageStateLoader = require('./VillageStateLoader');

var VillageStateManager = function() {

  var strategy = {
    
    "init": {
      next: "starting"
    },
    
    "starting": {
      period: 70000,
      exPeriod: 40000,
      next: "day"
    },
    
    "day": {
      period: 60000,
      next: "night" 
    },

    "night": {
      period: 50000,
      next: "day"
    },

    "gameover": {
      period: 30000,
      exPeriod: 20000,
      next: null
    }

  };

  // Private Properties
  this._strategy = strategy;
  this._currentKey = null;
  this._nextKey = null;
  
  // init
  this.updateKey('init');

};

VillageStateManager.prototype.next = function() {
  // Stateを取得
  var nextState = VillageStateLoader.createInstance(this._nextKey);
  // keyを更新
  this.updateKey();

  return nextState;
};

VillageStateManager.prototype.hasNext = function() {
  return (this._nextKey) ? true : false;
};

VillageStateManager.prototype.getPeriod = function() {
  return this._strategy[this._currentKey].period;
};

VillageStateManager.prototype.getExPeriod = function() {
  return this._strategy[this._currentKey].exPeriod || this._strategy[this._currentKey].period;
};

VillageStateManager.prototype.updateKey = function(opt_nextKey) {
  if (opt_nextKey) {
    this._nextKey = opt_nextKey;
  }
  this._currentKey = this._nextKey;
  this._nextKey = this._strategy[this._currentKey].next;
};

VillageStateManager.prototype.setNextToGameOver = function() {
  this._nextKey = 'gameover';
};

VillageStateManager.prototype.getNextState = function() {
  return VillageStateLoader.createInstance(this._nextKey);
};

module.exports = VillageStateManager;