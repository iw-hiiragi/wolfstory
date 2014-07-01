/*
 *  JobStatus (構造体)
 *    構造体です。この構造体について'知っている'のはJobクラスのみです。
 *    Jobクラスのサブクラス（実際の役職）を定義する際に使用されます。
 */

var Utils = require('utils');

var JobStatus = function (props) {

  // Public Properties
  this.hp = 100;
  this.atk = 0;

  this.ballots = 1;

  this.guardian = null;

  this.spirit = 'human';
  this.fortune = 'human';

  // Initializing property
  Utils.bindPublicProperties(this, props);

};

module.exports = JobStatus;