
var ArrayIterator = function(list, opt_sortfunc) {
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

ArrayIterator.prototype.hasNext = function () {
  return (this.index_ < this.list_.length);
};

ArrayIterator.prototype.next = function () {
  if (this.index_ < this.list_.length) {
    return this.list_[this.index_++];
  }
  else {
    return null;
  }
};

module.exports = ArrayIterator;