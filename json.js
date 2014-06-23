
var Village = require('./models/Village');
var User = require('./models/User');

var handleJsonError = function(e, res) {
  console.log('[json request error] ', e && (e.stack || e));
  res.json({error: (e && e.message) || e });
};

var execQuery = function(query, res, callback) {
  try {
    if (!query || !res || typeof callback !== 'function') throw 'query failed';
    query.exec(function (err, ret) {
      try {
        if (err) throw err;
        callback(ret);
      }
      catch (e) {
        handleJsonError(e, res);
      }
    });
  } catch (e) {
    handleJsonError(e, res);
  }
};

exports.request = function(req, res, type, option, page) {
  var post = req.body || null;
  var query;
  try {
    switch (type) {

      case 'list':
        
        switch (option) {
          // ユーザーリストの処理
          case 'users':
            query = User.find().select('name lastAccess vid').lean();
            execQuery(query, res, function (users) {
              res.json({list: users});
            });
            break;

          default:
            break;
        }
        break;

      case 'villist':
        if (option === 'active') {
          query = Village.find().lean();
          execQuery(query, res, function (villages) {
            res.json({villist: villages});
          });
        }
        else {
          res.end();
        }
        break;

      // 新規JSON処理 (POST)
      case 'new':
        if (!req.isAuthenticated() || !post) return res.json({error:"unauthorized"});
        switch (option) {

          // 村を作る
          case 'vil':
            var newVil = post;
            newVil.user = {
              name: req.user.name
            };
            Village.create(newVil, function (err, vil){
              try {
                if (err) throw err;
                res.json({success:true, vid:vil.vid});
              }
              catch (e) {
                handleJsonError(e, res);
              }
            });
            break;
          
          default:
            res.json({error: 'option undefined'});
            break;
        }
        break;

      // 入村処理 (POST)
      case 'join':
        if (!req.isAuthenticated() || !post) return res.json({error:"unauthorized"});
        query = User.findById(req.user._id);
        execQuery(query, res, function (user){
          /* TODO: ここに入村できるか否かのバリデート */
          user.vid = post.vid;
          user.save(function(err){
            res.json({success:true});
          });
        });
        break;

      default:
        throw "undefined type";

    }
  }
  catch (e) {
    handleJsonError(e, res);
  }
};