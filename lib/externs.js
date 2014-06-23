
var externs = {};
var utils = require('utils');
var _LOG = utils._LOG;
/*
 *  Passport Modules
 */
var User = require('../models/User');

externs.passportSerializeUser = function (user, done) {
  if (typeof done !== 'function') {
    done = null;
    _LOG('serializeUser: unexpectedly, arguments[1] is not a function.');
    for(var i=0, len=arguments.length; i<len; i++) {
      if (typeof arguments[i] === 'function') {
        done = arguments[i];
        break;
      }
    }
    if (!done) return null;
  }

  done(null, user._id);
};

externs.passportDeserializeUser = function (/* _id, done?, done? */) {
  /* bugfix: unexpectedly arguments[1] is not a function (but something) */
  var _id = arguments[0];
  var done = (typeof arguments[1] === 'function') ? arguments[1] : arguments[2];
  if (typeof done !== 'function') {
    done = null;
    _LOG('DeserializeUser: unexpectedly, both arguments[1] and arguments[2] is not a function.');
    for(var i=0, len=arguments.length; i<len; i++) {
      if (typeof arguments[i] === 'function') {
        done = arguments[i];
        break;
      }
    }
    if (!done) return null;
  }

  User.findByIdAndUpdate(_id, {$set: {lastAccess: new Date()}}, {new: true}).exec(function(err, user) {
    done(err, user);
  });
};

externs.passportLocalStrategy = function (userid, password, done) {
  User.findOneAndUpdate({ uid: utils.escape(userid), password: password }, {$set: {lastAccess: new Date()}}, {new: true}).exec(function(err, user) {
    if (err) return done(err);
    if (!user) return done(null, false, {message:'ユーザーIDまたはパスワードが間違っています。'});
    if (user.ban) return done(null, false, {message:'問題が発生したため、そのユーザーIDは使用できません。'});
    return done(null, user);
  });
};

module.exports = externs;