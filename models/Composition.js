
var Composition = function (cstr, jbs) {

  this.jobMap_ = {};
  this.jobs_ = jbs;
  this.numPlayers_ = 0;

  this.set(cstr);

};

Composition.prototype = {

  searchRequiredJobs: function (ch) {
    for (var job in this.jobs_) {
      if (job.sName === ch) return job;
    }
    return null;
  },

  set: function (str) {
    this.jobMap_ = {};
    this.numPlayers_ = 0;
    for (var i=0; i<str.length; i++) {
      var ch = str.charAt(i);
      var job = this.searchRequiredJobs(ch);
      if (!job || job.name === '@undefined') continue;

      if (job.name in this.jobMap_) {
        this.jobMap_[job.name].count++;
      }
      else {
        this.jobMap_[job.name] = {
          count: 1,
          job: job,
        };
      }
      this.numPlayers_++;
    }
  },

  toString: function () {
    var str = '';
    for (var job in this.jobs_) {
      if (!this.jobMap_[job.name]) continue;
      
      for (var i=0; i<this.jobMap_[job.name].count; i++) {
        str += this.jobMap_[job.name].job.sName;
      }
    }
    return str;
  },

  getLength: function () { return this.numPlayers_; },

};

var CompositionList = function (strList) {
  this.comps_ = [];

  this.set(strList);

  return;
};

CompositionList.prototype = {
  set: function (list) {
    this.comps_ = [];
    for (var i=0; i<list.length; i++) {
      var line = list[i];
      var comp = new Composition(line);
      var len = comp.getLength();
      if (len < 4 || len > 30) continue;
      
      this.comps_[len] = comp;
    }
  },

  at: function (index) {
    if (index < 4) return null;
    return this.comps_[index] || null;
  },

  toStringArray: function () {
    var ar = [];
    for (var i=0; i<this.comps_.length; i++) {
      if (!this.comps_[i]) {
        ar[i] = '';
      }
      else {
        ar[i] = this.comps_[i].toString();
      }
    }
    return ar;
  },
};

compLists = {};

compLists.standard = new CompositionList([
  "村村村村狼狼",
  "村村村村村狼狼",
  "村村村村村村狼狼",
  "村村村村村村村狼狼",
  "村村村村村村村占狼狼",
  "村村村村占占占占占狼狼",
  "村村村村占占占占占狼狼狼",
]);

exports.Composition = Composition;
exports.CompositionList = CompositionList;
exports.compLists = compLists;