/*
 *  Name
 *    PlayerCharacterの名前を表すクラスです。インスタンスはimmutableです。
 */

var Name = function(firstName, lastName, opt_delimiter) {
  var delimiter = opt_delimiter || ' ';

  this._firstName = firstName || '';
  this._lastName = lastName || '';

  if (firstName && lastName) {
    this._fullName = firstName + delimiter + lastName;
  }
  else {
    this._fullName = firstName || lastName || '*****';
  }

};

Name.prototype.getName = 
Name.prototype.getFullName = function() {
  return this._fullName;
};
Name.prototype.getFirstName = function() {
  return this._firstName;
};
Name.prototype.getLastName = function() {
  return this._lastName;
};

module.exports = Name;