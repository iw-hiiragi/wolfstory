
var Utils = require('utils');

var Periods = function(props) {
  
  // Public Properties
  this.morning  = 15 * 1000;
  this.day      = 3 * 60 * 1000;
  this.evening  = 80 * 60 * 1000;
  this.night    = 2 * 60 * 1000;
  this.dawn     = 1 * 60 * 1000;

  Utils.bindPublicProperties(this, props);

};

module.exports = Periods;