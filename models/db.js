
// mongoose object
var mongoose = require('mongoose');

// settings
var settings = require('../lib/settings');
var DB_URI = 'mongodb://' + settings.host  + '/' + settings.dbName;

// using mangoose default connection (connections[0])
mongoose.connect(DB_URI);

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', function () {

  console.log('Mongoose default connection open to ' + DB_URI);

});

// If the connection throws an error
mongoose.connection.on('error', function (err) {

  console.log('Mongoose default connection error: ' + err);

});

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {

  console.log('Mongoose default connection disconnected from ' + DB_URI);

});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function() {
  mongoose.connection.close(function () {
    console.log('Mongoose default connection disconnected through app termination!');
    process.exit(0);
  });
});

var User = require('./User');
var Village = require('./Village');
var Counter = require('./Counter');
var Message = require('./Message');