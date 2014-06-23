var mongoose = require('mongoose');
/*
  Counter (mongoose schema model)
*/
 
var CounterSchema = new mongoose.Schema({
 _id: String,
 seq: Number
});
 
// Counterスキーマに新しいIDを発行させるメソッドを追加
// MongoDBのfindAndModifyを用いて参照とともにカウンターの値を＋１する。
// staticsに追加したメソッドは、クラスメソッドのような感覚で使える。
CounterSchema.statics.getNextSeq = function (name, callback) {
  return this.collection.findAndModify(
    { _id: name }, //Query
    [], //sort
    { $inc: { seq: 1 } }, //update document
    { new: true, upsert: true }, //options
    callback
  );
};
 
var Counter = module.exports = mongoose.model('Counter', CounterSchema);