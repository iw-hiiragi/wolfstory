/*
 *  VillageStateLoader (Singleton)
 *    statesディレクトリ以下すべてのVillageStateサブクラスへの参照を保持しています。
 */

var fs = require("fs");

var VillageStateLoader = function() {

  var dict = {};

  // statesディレクトリ以下の ***State.js を動的にロード
  fs.readdirSync("./states").forEach(function(filename) {
    if (filename.indexOf('State.js') < 0) return;
    var key = filename.replace('State.js', '').toLowerCase();
    dict[key] = require("./states/" + filename);
  });

  this._dict = dict;

};

VillageStateLoader.prototype.get = function(key) {
  return this._dict[key];
};

VillageStateLoader.prototype.createInstance = function(key, arg) {
  var F = this.get(key);
  if (typeof F !== 'function') throw new Error();
  return new F(arg); 
};

// Singleton Class
var singleton = new VillageStateLoader();
module.exports = singleton; //インスタンスを返します