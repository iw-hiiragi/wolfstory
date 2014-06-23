
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes/route-index');
var user = require('./routes/route-user');
var http = require('http');
var path = require('path');

// 共通設定ファイル
var settings = require('settings');

// 共通オブジェクト
var utils = require('utils');

// 共通DB接続
var db = require('./models/db');

// JSONリクエストの処理
var jsonRequest = require('./json').request;

// Express オブジェクト
var app = express();

// flash オブジェクト
var flash = require('connect-flash');

// 外部ファイルで定義するapp.js用の関数
var externs = require('externs');

// Passport オブジェクト
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy; // ローカル認証戦略
passport.serializeUser = externs.passportSerializeUser;
passport.deserializeUser = externs.passportDeserializeUser;
passport.use(new LocalStrategy( {usernameField:"userid"}, externs.passportLocalStrategy ));

// セッション管理DB
var RedisStore = require('connect-redis')(express);
var SessionMongoose = require('session-mongoose')(express);
var sessionStore = new RedisStore({ db: settings.redisNo });
// var sessionStore = new SessionMongoose({
//     url: "mongodb://"+settings.host+"/"+settings.sessionDbName,
//     interval: 2 * 60 * 1000 //2分に一回のチェック
// });
settings.setSessionStore(sessionStore);

// Expressの設定
app.configure(function() {
  app.set('port', settings.port || 3000);
  app.set('host', settings.host || '192.168.3.3');
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded());
  app.use(express.methodOverride());
  // セッション管理設定
  app.use(express.cookieParser(settings.cookieSecret));
  app.use(express.session({
    secret: settings.sessionSecret,
    store: settings.getSessionStore(),
    key: settings.sessionKey || "connect.sid",
    maxAge: new Date(Date.now() + settings.sessionMaxAge), // Express側、セッションmaxAge（データ形式統一しろよ 憤怒）
    cookie: {
      httpOnly: false,
      maxAge: Date.now() + settings.sessionMaxAge // クライアント側、クッキー消滅（ミリ秒）
    }
  }));
  app.use(flash());
  // Passportのセッション設定 (must be after express settings)
  app.use(passport.initialize());
  app.use(passport.session());
});

app.use(app.router);
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
  app.locals.pretty = true; // JADEデバッグ用
}

// ログインチェック
var auth = function(req, res, next){
  if (req.isAuthenticated()) 
    next();
  else 
    res.redirect('/user/login');
};

//test
app.get('/test', function(req,res){
  res.render('game/normal');
});

app.get('/', routes.index);
app.get(/\/user\/logout$/, user.logout);
app.post('/user/login',
  passport.authenticate('local', {
    successRedirect: "/",
    failureRedirect: "/#!/login",
    failureFlash: true,
  })
);
app.post('/user/new', user.postNew);

app.get('/json/:type/:option?/:page([0-9]+)?', function (req, res){
  jsonRequest(req, res, req.params.type, req.params.option || '', req.params.page || 0);
});
app.post('/json/:type/:option?/:page([0-9]+)?', function (req, res){
  jsonRequest(req, res, req.params.type, req.params.option || '', req.params.page || 0);
});

app.get('/:indexroot(login|logout|list|new)/:option?', function (req,res) {
  var url = req.params.indexroot + ((req.params.option) ? '/' + req.params.option : '');
  res.redirect('/#!/' + url);
});




var httpServer = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

// socket.ioルーチンの呼び出し
var socketio = require('./socket.js')(httpServer, express.cookieParser);
