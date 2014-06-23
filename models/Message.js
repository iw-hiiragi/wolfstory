/*
  Message (mongoose model)
*/

var utils = require('utils');

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var Mixed = Schema.Types.Mixed;

var MessageSchema = new Schema({

  vid: Number,    // Village ID (リレーショナル)
  pid: Number,    // Player ID (index of vil.players)
                  // 値として0は取らない
                  // 特別な値 : -1 = spectator / -2 gm / -3 __system__ 

  type: String,   // "message" "announce" "info"

  name: {
    first: {type: String},
    last: {type: String},
    full: {type: String},
  },              // Player Name
                  // システム発行ならば専用のオブジェクトを
                  // あるいは表示名 'GM' '観戦者 [13]'
  
  iconUrl: String,   // アイコンのURL
  date: Date,     // 追加日時（アウトプットではJSONのDATE文(STRING)にパースされる）

  step: Number,     // ステップ
  day: Number,      // 追加時の村日付
  scene: String,    // 現在の期間(period)名 ゲームシーン
  isNight: Boolean, // 追加時のゲームシーンが(わかめて・るる形式の)夜に相当するかどうか

  classType: String,  // 所属する唯一のクラス "say" "think" "announce-wolf" "info" 等
  classCount: Number, // カウント: type === "announce" は 総じて announce として数えられる
                      // 主に表示のために保存されるもので、実際のビジネスロジックでは全てstepで参照される
                      // アンカーには対象stepのデータが含まれている
  
  messageOption: String, // 表示に関するオプション "loud" "comingout"
  
  groups: [String],  // アクセスを許可するグループ "everyone" "gm" "wolf" "pid=4"
  
  content: String,   // 内容
                      // type: "message"であれば発言内容、"announce"はアナウンス内容、"info"では命令が格納されている

  quotes: [Number], // このオブジェクトが参照しているオブジェクトのstepを含む
                    // これ自体を参照するわけではないが、後でViewで集計する用途等がありそう

  likes: [Number],   // いいね！ (pidで管理)

  info: Mixed,      // 追加情報
                    // この追加情報を参照するかどうかはview次第です   
                    // messageが整形される際には追加情報を付加するか否かのバリデート関数を通過させます
                    // アクセス権はthis.groupsを継承します
                    // この情報を処理するかどうかはViewによります
                    // 例: id公開、あるいは終了後ならば info: {"user": {"name": "hogehoge"}} が付加されるかもしれません。
});

// サニタイズ
MessageSchema.pre('validate', function (next) {
  
  /* ユーザー名は最も重要 */
  if (!this.user || !this.user.name) this.user = {name: "@@undefined"};

  /* 深刻なエラーを防ぐためのもの */
  if (!this.day) this.day = 0;
  if (!this.step) this.step = 0;

  // 配列の初期化
  if (!this.viewOptions) this.viewOptions = [];
  if (!this.groups) this.groups = [];
  if (!this.quotes) this.quotes = [];

  // 初期値が存在するもの
  if (!this.name) this.name = '__system__';
  if (!this.date) this.date = new Date();
  if (!this.like) this.like = 0;
  if (!this.info || typeof this.info !== 'object') this.info = {}; 

  next();
  
});

/*

*/
MessageSchema.statics = {

  createMessage: function(vil, userName, day, periodName, content, opt) {
    var p = vil.selectPlayer(userName);
    if (!p) return null;
    var game = vil.getGame();

    // 内容を無力化
    if (!content || content.length === 0) return null;
    content = utils.escape(content);
    content = content.replace(/(\r\n|\n\r|\n|\r)/g, '<br>');

    var name = (p.toObject()).name; // name.fullはvirtualのため
    delete name.nicknames;

    if (!opt) opt = {};
    var messageOption = opt.messageOption || 'normal';

    var newMsg = {
      vid: vil.vid,
      pid: p.pid,
      type: 'message',
      name: name,
      iconUrl: p.icon && p.icon.url,
      date: new Date(),
      step: 0,
      day: day,
      periodName: periodName,
      isNight: vil.isNight(periodName),
      classType: 'say',
      classCount: 0,
      messageOption: messageOption,
      groups: ['everyone'],
      content: content,
      quotes: [],
      likes: [],
      info: {},
    };

    // インタラプト処理
    vil.interruptMessage(newMsg); // ゲーム固有の処理
    this.formatMessage(newMsg); // 共通の処理

    return newMsg;
  },

  createAnnounce: function (vil, content, opt_classType, opt_groups) {
    var classType = opt_classType || 'normal';
    var groups = opt_groups || ['everyone'];

    var for_everyone = (groups.indexOf('everyone') !== -1);
    if (!for_everyone) {
      groups.push('gm');
    }

    var newAnnounce = {
      vid: vil.vid,
      pid: -3,
      type: 'announce',
      date: new Date(),
      step: 0,
      day: vil.day,
      periodName: vil.currentPeriod,
      isNight: vil.isNight(),
      classType: classType,
      classCount: 0,
      groups: groups,
      content: content,
      info: {},
    };

    return newAnnounce;
  },

  createInfo: function(vil, content, opt) {
    var newInfo = {
      vid: vil.vid,
      pid: -3,
      type: 'info',
      date: new Date(),
      step: 0,
      day: vil.day,
      periodName: vil.currentPeriod,
      isNight: vil.isNight(),
      classType: 'info',
      classCount: 0,
      groups: [],
      content: content,
      info: opt || {},
    };
    return newInfo;
  },

  formatMessage: function (msg) {

    return msg;
  },
};

module.exports = mongoose.model('Message', MessageSchema);