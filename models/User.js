
var settings = require('settings');
var crypt = require('crypt3');
var utils = require('utils');

var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
  
  uid: String,
  password: String,

  vid: Number, //参加中の村

  name: {type: String, default: ''}, // トリップが暗号化されたもの
  ban: {type: Number, default: 0}, // BANされているか

  lastAccess: Date,

});

UserSchema.statics.create = function(uid, password, confirm, callback) {

  if (!uid || !password || !confirm) {
    console.log(uid, password, confirm);
    return callback('未入力のフィールドがあります。');
  }

  if (uid.length > 25 || password.length > 25) {
    return callback('ユーザーIDまたはパスワードが長過ぎます。25文字以内で入力して下さい。');
  }

  if (uid.indexOf('@') !== -1) {
    return callback('ユーザーIDに「@」は使用出来ません。');
  }

  if (password !== confirm) {
    return callback('確認用パスワードが合致しません。');
  }

  if (password.length < 6) {
    return callback('パスワードは6文字以上で設定して下さい。');
  }

  // name(トリップ暗号化)の形成
  var name = uid.replace(/◆/, '◇')
                .replace(/#(.+)$/, function(match, m1) {
                  return '◆'+crypt(m1, settings.cryptSalt).substr(4,10);
                });

  // 新規ID作成
  User.findOne({uid:uid}).exec(function(err, user) {
    if (err) return callback('データベースのエラーが発生しました。');
    if (user) return callback('そのユーザーIDはすでに登録されています。');

    // トリップかぶり、割れの対策
    User.findOne({name:name}).exec(function (err, userByName) {
      if (err) return callback('データベースのエラーが発生しました。');
      if (userByName) return callback('そのユーザーIDはすでに登録されています。');

      // 新規ユーザーの生成・登録
      var u = new User( {uid:uid, name:name, password:password, ban:0, lastAccess: new Date()} );
      u.save(function (err, user) {
        if (err) return callback('データベース書き込みのエラーが発生しました。別のIDを試して下さい。');
        callback(null, user);
      });

    });

  });
};

  /*
  レコードDBに逃す
  重くなりそうなので
  records : [{
    villageId : Number,
    villageName : String,
    date : Date,
    userId : String,
    compositionName : String,
    numberOfPlayers : Number,
    result : Number,
    name : String,
    iconUrl : String,
    win : Number,
    hope : String, //○☓─ 
    skillName : String,
    Team : String,
  }],
  */

var User = module.exports = mongoose.model('User', UserSchema);