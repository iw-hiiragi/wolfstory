
var VillageState = require('../VillageState.js');

var StartingState = function() {
  // super
  VillageState.apply(this, arguments);
};

// extends VillageState
StartingState.prototype = Object.create(VillageState.prototype);
StartingState.prototype.constructor = StartingState;

// @Override
StartingState.prototype.onEnter = function(vil) {
  vil.announce('ゲームの準備を開始します。');
};

// @Override
StartingState.prototype.onLeave = function(vil) {
  vil.announce('ゲームが開始されます');
};

// @Override
StartingState.prototype.onSkip = function(vil) {
  vil.announce('スキップが選択されました。');
  this.setNext(EveningState);
};

// @Override
StartingState.prototype.isSkipReady = function(vil) {
  return false;
};

module.exports = StartingState;