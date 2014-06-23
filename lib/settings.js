
var settings = {};

settings.DEBUG = (process.env.NODE_ENV === 'development');

settings.logFileDir = 'log/vil/';

settings.host = (process.env.NODE_ENV === 'production') ? 'some.where.iam' : '192.168.111.3';
settings.port = (process.env.NODE_ENV === 'production') ? '3000' : '3000';
settings.dbName = 'beta03';
settings.redisNo = 2;
settings.sessionDbName = 'beta01s';

settings.iconDir = 'http://assets.localhost.com/icons';

settings.sessionSecret = 'johnny';
settings.sessionKey = 'yutoryzm.sid';
settings.sessionMaxAge = 60*60*3*1000; //３時間
settings.coockieSecret = 'snob=bons';
settings.cryptSalt = 'ai';

settings.schemaOptions = {
  toObject: {
    virtuals: true
  },
  toJSON: {
    virtuals: true
  }
};

settings.setSessionStore = function (store) {
  if (store) {
    this.sessionStore_ = store;
  }
};

settings.getSessionStore = function () {
  if (!this.sessionStore_) {
    console.log('Error: settings.sessionStore_ is not defined.');
    return null;
  }
  return this.sessionStore_;
};

// export
module.exports = settings;