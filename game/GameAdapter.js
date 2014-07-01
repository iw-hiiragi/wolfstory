/*
 *  GameAdapter
 *    他クラスに対しJinroServerの機能・情報を一部提供します（Facade）
 */

var GameAdapter = function(jinroServer) {
  this._server = jinroServer;
};

GameAdapter.prototype.getVillageDetails = function() {
  new VillageDetails(this._server.village);
};

module.exports = GameAdapter;