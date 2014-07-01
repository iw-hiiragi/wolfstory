/*
 *  JinroServer
 *    各クライアントとのI/O、接続、ゲーム時間の管理を行います。
 *    クライアントはJinroServerの公開APIのみを知っています。
 *
 *    < Public APIs > 
 *    PublicMessage[] getMessages(String username, int stepfrom, int stepto)
 *    void            putMessage(String username, String content, Object options)
 *
 *    bool            createConnection(String username, Socket socket = null)
 *    bool            hasConnection(String username)        
 *    
 *    
 */

var Client = require('./Client');
var ClientList = require('./ClientList');

var Player = require('./Player');
var PlayerList = require('./PlayerList');

var MessageFactory = require('./MessageFactory');
var MessagePublisher = require('./MessagePublisher');
var MessageDatabaseAccessor = require('./MessageDatabaseAccessor');

var GameAdapter = require('./GameAdapter');

var JinroServer = function () {
  // Private Properties
  this._id = 1;
  this._step = 0;
  this._nextUpdateDate = new Date();

  // Public Properties
  this.clients = new ClientList();
  this.players = new PlayerList();

  // Initializing Object
  this._adapter = new GameAdapter(this);
  this._mda = new MessageDatabaseAccessor(this._id);
  this._mp = new MessagePublisher(this._adapter);
};

// Public APIs

// @return Message[]
CWolf.prototype.getMessages = function(userName, stepFrom, stepTo) {
  var message = 'hoge';
  var publishedMessage = MessagePublisher.publish(message, orderer);
};

// @return void
CWolf.prototype.putMessage = function(userName, content, options) {
  var client = this.clients.get(userName);
  if (!client) return;

  var message = MessageFactory.create(content, options);
  (new MessageBuilder(this.adapter(), client)).build(message);

  var mda = this.getMessageDatabaseAccessor();
  mda.insert(message);
};

// @return GameAdapter
CWolf.prototype.getAdapter = function() {
  return this._adapter;
};


// Private Methods
CWolf.prototype.getMessageDatabaseAccessor = function() { return this._mda; };
CWolf.prototype.getMessagePublisher = function() { return this._mp; };
