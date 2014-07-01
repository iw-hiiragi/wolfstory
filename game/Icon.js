/*
 *  Iconクラス
 *    アイコン画像を表すクラス
 */

var Utils = require('utils');

var Icon = function(prop) {
  this._directory = 'hogehoge/hoge/';
  this._filename = 'hoge';
  this._suffix = '.png';

  // Initializing Properties
  Utils.bindPrivateProperties(this, prop);
};

Icon.prototype.getUrl = function(opt) {
  return this.getDirectory() + this.getFile(opt);
};
Icon.prototype.getDirectory = function() {
  return this._directory;
};
Icon.prototype.getFile = function(opt) {
  var file = (opt) ? this._filename + '_' + opt : this._filename;
  file += this._suffix;
  return file;
};