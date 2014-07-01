/*
 *  Village
 *    村を表します。村民が登録されます。集会所があります。
 *    DBとのI/Oや
 */

var PlayerList = require('./PlayerList');
var VillageStateList = require('./VillageStateList');
var VillageStateManager = require('./VillageStateManager');

var Village = function(id, name, username, props) {

  // Primary Properties
  this._id = id;
  this._name = name;
  this._author = username;

  // Private Properties
  this._description = '';
  this._periods = new Periods();
  this._state   = VillageStateList.createInstance('InitialState');

  // Public Properties
  this.players = new PlayerList();

};
module.exports = Village;