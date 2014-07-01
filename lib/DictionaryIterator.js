/*
 *  DictionaryIterator (implements Iterator)
 *    連想配列を受け取りその参照へのイテレータを返します。
 *    連想配列をどのように配列に落としこむかを指定することができます。
 *    @opt_sortfunc => compare(a,b) or 'random'
 */

var Utils = require('utils');

var DictionaryIterator = function (dict, opt_sortfunc) {

  var list;
  for (var key in dict) {
    if (dict.hasOwnProperty(key)) list.push(disc[key]);
  }

  // ソート
  if (typeof opt_sortfunc === 'function') {
    list.sort(opt_sortfunc);
  }
  // ランダムソート
  else if (opt_sortfunc === 'random') {
    Utils.shuffleArray(list);
  }
  
  this.list_ = list;
  this.index_ = 0;
};

DictionaryIterator.prototype.hasNext = function () {
  return (this.index_ < this.list_.length);
};

DictionaryIterator.prototype.next = function () {
  if (this.index_ < this.list_.length) {
    return this.list_[this.index_++];
  }
  else {
    return null;
  }
};

module.exports = DictionaryIterator;