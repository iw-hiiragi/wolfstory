

var User = require('../models/User.js');
var utils = require('utils');

// ログインページ
exports.login = function(req, res) {

  if (req.isAuthenticated()) {
    res.redirect('/');
  }
  else {
    res.redirect('/#!/login');
  }

};

// ログアウト
exports.logout = function(req, res) {
  req.logout();
  res.redirect('/#!/login');
};

// 新規登録
exports.postNew = function(req, res) {
  // すでにログイン済
  if (req.isAuthenticated()) {
    res.redirect('/user/'+req.user.name);
    return;
  }

  var uid = req.body.userid && utils.escape(req.body.userid);
  var password = req.body.password;
  var confirm = req.body.confirm;

  User.create(uid, password, confirm, function (errorMsg, user) {
    if (errorMsg) {
      req.flash('error', errorMsg);
      res.redirect('/#!/login');
      return;
    } 
    req.login(user, function (err) {
      if (err) return res.end(err);
      res.redirect('/');
    });
  });
};