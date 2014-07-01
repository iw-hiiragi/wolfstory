/*
 *  Client implements Speakable
 *    ゲームと接続を確立させたクライアントを表します
 *    エントリー完了状態では、Playerへの参照を保持しています
 */

var MessageFactory = require('./MessageFactory');

var Client = function (userName, opt_socket) {
  this._userName = userName;
  this._socket = opt_socket || null;
  this._player = null;
};

Client.prototype.getUserName = function () {
  return this._userName;
};

Client.prototype.isEntried = 
Client.prototype.hasPlayer = function () {
  return (this._player) ? true : false;
};

Client.prototype.getPlayer = function () {
  return this._player;
};
Client.prototype.setPlayer = function (player) {
  this._player = player;
};
Client.prototype.resetPlayer = function() {
  this._player = null;
};


// Speakable
// Speakable.speak(String content, String classtype, Dict options)
// Client.speakが責任連鎖の始まりです。playerに委譲できなければ、観戦者としての発言が返ります。
Client.prototype.speak = function() {

};

module.exports = Client;