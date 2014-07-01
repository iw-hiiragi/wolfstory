/*
 *  VillageState (Abstract)
 *    Villageの状態を表す抽象クラスです。
 */

var VillageState = function() {
};

// @Override
VillageState.prototype.onEnter = function(vil) {
  vil.announce('Override me.');
};

// @Override
VillageState.prototype.onLeave = function(vil) {
  vil.announce('Override me!');
};

// @Override
VillageState.prototype.onEnter = function(vil) {

};

// @Override
VillageState.prototype.onSkip = function(vil) {

};

// @Override
// @return bool
VillageState.prototype.isSkipReady = function(vil) {
  vil.announce('Override me!');
  return false;  
};

VillageState.prototype.

module.exports = VillageState;