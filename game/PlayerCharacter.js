/*
 *  PlayerCharacter (has Name, Icon)
 *    Playerが使用するキャラクタを表します。Nameのみ参照を変えることができます。
 */

var Utils = require('utils');

var Name = require('./Name');
var Icon = require('./Icon');

var PlayerCharacter = function(prop) {
  this._name = new Name('NO', 'NAME');
  this._serif = '人狼なんて、本当にいるのかい？';

  // Public Properties
  this.icon = new Icon();

  // Initializing Properties
  Utils.bindPrivateProperties(this, prop);
};

// Nameを委譲
PlayerCharacter.prototype.getFullName = function() {
  return this._name.getFullName();
};
PlayerCharacter.prototype.getFirstName = function() {
  return this._name.getFirstName();
};
PlayerCharacter.prototype.getLastName = function() {
  return this._name.getLastName();
};
PlayerCharacter.prototype.setName = function(name) {
  this._name = name;
};

module.exports = PlayerCharacter;