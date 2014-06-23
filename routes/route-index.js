
/*
 * GET home page.
 */

var Village = require('../models/Village');

exports.index = function(req, res){

  /* ログイン用　セッション開始にはHTTPが良いので */
  var errorMsg = req.flash('error');
  if (errorMsg && errorMsg.toString().indexOf('Missing credentials') !== -1) {
    errorMsg = "ユーザーIDまたはパスワードが未入力です";
  }

  var logged_in = (req.user) ? true : false;
  var username = (req.user) ? req.user.name : '';

  res.render('index', {
    error: errorMsg,
    logged_in: logged_in,
    username: username,
  });
  
};