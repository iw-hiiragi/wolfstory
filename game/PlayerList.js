
var ArrayIterator = require('ArrayIterator');

var PlayerList = function() {
  this._list = [];
};

PlayerList.prototype.add = function(player) {
  this._list.push(player);
};

PlayerList.prototype.remove = function(player) {
  var removed = false;
  for (var i=0, len=this._list.length; i<len; i++) {
    var p = this._list[i];
    if (p === player) {
      this._list = this._list.splice(i, 1);  
      break;
    }
  }
};

PlayerList.prototype.get = function(index) {
  return this._list[index];
};

PlayerList.prototype.iterator = function(opt_sortfunc) {
  return ArrayIterator(this._list, opt_sortfunc);
};