
var VillageState = require('../VillageState.js');

var DayState = function() {
  // super
  VillageState.apply(this, arguments);
};

// extends VillageState
DayState.prototype = Object.create(VillageState.prototype);
DayState.prototype.constructor = DayState;

// @Override
DayState.prototype.onEnter = function(vil) {
  vil.announce('昼になりました。');
};

// @Override
DayState.prototype.onLeave = function(vil) {
  vil.announce('夜がやってきます。');
};

// @Override
DayState.prototype.onSkip = function(vil) {
  vil.announce('スキップが選択されました。');
  this.setNext(EveningState);
};

// @Override
DayState.prototype.isSkipReady = function(vil) {
  return false;
};

module.exports = DayState;