
var VillageState = require('../VillageState.js');

var NightState = function() {
  // super
  VillageState.apply(this, arguments);
};

// extends VillageState
NightState.prototype = Object.create(VillageState.prototype);
NightState.prototype.constructor = NightState;

// @Override
NightState.prototype.onEnter = function(vil) {
  vil.announce('夜になりました。');
};

// @Override
NightState.prototype.onLeave = function(vil) {
  vil.announce('夜があけます。');
};

// @Override
NightState.prototype.onSkip = function(vil) {
  vil.announce('スキップが選択されました。');
  this.setNext(MorningState);
};

// @Override
NightState.prototype.isSkipReady = function(vil) {
  return false;
};

module.exports = NightState;