/*
 *  ClientListクラス
 *    Clientの集合を表します。データはuserNameをKeyにとる辞書配列です。
 *    重複は許可されません。
 *
 *    ClientList()
 *    void add(Client client)
 *    void remove(Client client)
 *    void remove(String userName)
 *    Client get(String userName)
 *    Iterator iterator()
 */

var DictionaryIterator = require('DictionaryIterator');

var ClientList = function () {
  
  this._clientsDict = {};

};

ClientList.prototype.add = function(client) {
  // すでに含まれているか  
  for (var c in this._clientsDict) {
    if (this._clientsDict.hasOwnProperty(c)) {
      if (c === client) return;
      if (c.getUserName() === client.getUserName()) return;
    }
  }

  this._clientsDict[c.getUserName()] = c;
};

ClientList.prototype.remove = function(client_or_username) {
  var userName;
  if (typeof client_or_username === 'string') {
    userName = client_or_username; 
    if (this._clientsDict.hasOwnProperty(userName)) {
      delete this._clientsDict[userName];
    }
  }
  else {
    var client = client_or_username;
    userName = client.getUserName();
    if (this._clientsDict.hasOwnProperty(userName)) {
      delete this._clientsDict[userName];
    }  
  }
};

ClientList.prototype.get = function(userName) {
  return this._clientsDict[userName];
};

ClientList.prototype.iterator = function() {
  return new DictionaryIterator(this._clientsDict);
};

module.exports = ClientList;