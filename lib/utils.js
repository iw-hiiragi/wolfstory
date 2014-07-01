
var utils = {};
var validator = require('validator');

utils.escape = function (str) {
  if (typeof str !== 'string') str = String(str);
  var a = validator.escape(str);
  a = a.replace(/'/g, '&apos;');
  return a;
};

utils.arrayMatch = function (a, b) {
  if (!a || !b) return null;
  var alen = a.length, blen = b.length;
  var i, j;
  for (i=0; i<alen; i++) {
    if (a[i])
      for (j=0; j<blen; j++)
        if (a[i] === b[j]) return a[i];
  }
  return null;
};

utils.isArray = function (a) {
  return (a instanceof Array);
};

utils.shuffleArray = function (array) {
  var m = array.length, t, i;
  while (m) {
    i = Math.floor(Math.random() * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
};

utils.uniqueArray = function (array) {
  var storage = {};
  var uniqueArray = [];
  var i, value;
  for (i=0, len=array.length; i<len; i++) {
    value = array[i];
    if (!(value in storage)) {
      storage[value] = true;
      uniqueArray.push(value);
    }
  }
  return uniqueArray;
};

utils.rand = function (max, opt_min) {
  var min = opt_min || 0;
  /* rand(length)が使えるrubyタイプの実装 */
  return Math.floor( Math.random() * (max - min/* + 1*/) ) + min;
};

utils._LOG = function () {
  console.log.apply(null, arguments);
};

utils.sprintf = function (/* content, arg1, arg2, ... */) {
  var content = arguments[0];
  var isContentString = (typeof content === 'string' || content instanceof Array);
  if (!isContentString) return null;

  for (var i=1, len=arguments.length; i<len; i++) {
    // {1}, {2}, {3} ...
    content = content.replace('{'+i+'}', arguments[i]);
  }

  return content;
};

utils.bindPrivateProperties = function(myself, prop) {
  // Initializing Properties
  for (var key in prop) {
    var privateKey = key + '_';
    if (myself.hasOwnProperty(privateKey) && prop.hasOwnProperty(key)) {
      myself[privateKey] = prop[key];
    }
  }
};

utils.bindPublicProperties = function(myself, prop) {
  // Initializing Properties
  for (var key in prop) {
    if (myself.hasOwnProperty(key) && prop.hasOwnProperty(key)) {
      myself[key] = prop[key];
    }
  }
};

utils.createCounterFunction = function() {
  var cnt = 0;
  return function() {
    return cnt++;
  };
};


module.exports = utils;