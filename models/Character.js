
var settings = require('settings');

var Character = function (init) {
  /* initialize */
  init = init || {};
  init.name = init.name || {};
  init.icon = init.icon || {};
  
  this.name = {
    first: init.name.first || "",
    last: init.name.last || "名無し",
    nicknames: init.name.nicknames || [],
  };
  this.icon = {
    url: init.icon.url || "",
    suffix: init.icon.suffix || "",
    options: init.icon.options || [],
    looks: init.icon.looks || [],
  };
  this.gender = init.gender || "unknown";
  this.serif = init.serif || "人狼なんて、本当にいるんでしょうか？";

};

var Europe = [

  {
    name: {
      first: "大工",
      last: "ダグラス",
      nicknames: ["ダグカス"],
    },
    icon: {
      url: settings.iconDir + "/euro/male95.png",
      suffix: ".png",
    },
    gender: "male", 
    serif: "人狼なんて、本当にいるのかい？",
  },

  {
    name: {
      first: "花売り", last: "ヘレナ",
      nicknames: ["ヘレちん"],
    },
    icon: {
      url: settings.iconDir + "/euro/female01.png",
      suffix: ".png",
    },
    gender: "female",
    serif: "人狼なんて、本当にいるのかな！？",
  },

  {
    name: {
      first: "能力者", last: "アリス",
    },
    icon: {
      url: settings.iconDir + "/euro/female02.png",
      suffix: ".png",
    },
    gender: "female",
    serif: "人狼…人狼…てれぱ！",
  },

  {
    name: {
      first: "委員長", last: "ナディア",
      nicknames: ["ナディ"],
    },
    icon: {
      url: settings.iconDir + "/euro/female05.png",
      suffix: ".png",
    },
    gender: "female",
    serif: "人狼なんてそんな…動悸がとまりません。",
  },

  {
    name: {
      first: "おでこ", last: "パティ",
      nicknames: ["でこ"],
    },
    icon: {
      url: settings.iconDir + "/euro/female06.png",
      suffix: ".png",
    },
    gender: "female",
    serif: "人狼は生かしておけない。",
  },

  {
    name: {
      first: "おばさん", last: "サンディ",
      nicknames: ["BBA"],
    },
    icon: {
      url: settings.iconDir + "/euro/female11.png",
      suffix: ".png",
    },
    gender: "female",
    serif: "人狼なんかいるわけあるかい、ダボが！",
  },

  {
    name: {
      first: "踊り子", last: "フローレンス",
      nicknames: ["フロレ"],
    },
    icon: {
      url: settings.iconDir + "/euro/female17.png",
      suffix: ".png",
    },
    gender: "female",
    serif: "この村の人狼退治といえば私さ！",
  },

  {
    name: {
      first: "研究員", last: "レイ",
      nicknames: ["カス"],
    },
    icon: {
      url: settings.iconDir + "/euro/female24.png",
      suffix: ".png",
    },
    gender: "female",
    serif: "人狼？研究中に笑わせないでくれ。",
  },

  {
    name: {
      first: "三等兵", last: "リルム",
    },
    icon: {
      url: settings.iconDir + "/euro/female33.png",
      suffix: ".png",
    },
    gender: "female",
    serif: "人狼…？本当にいるんでしょうか…？",
  },

  {
    name: {
      first: "司書見習い", last: "アン",
    },
    icon: {
      url: settings.iconDir + "/euro/female36.png",
      suffix: ".png",
    },
    gender: "female",
    serif: "あ？人狼なんているわけねぇから。",
  },

  {
    name: {
      first: "保母", last: "ミズリ",
      nicknames: ["みずり"],
    },
    icon: {
      url: settings.iconDir + "/euro/female37.png",
      suffix: ".png",
    },
    gender: "female",
    serif: "人狼なんていないよ！ぷんぷん",
  },

  {
    name: {
      first: "教師", last: "マリア",
      nicknames: ["まりあ"],
    },
    icon: {
      url: settings.iconDir + "/euro/female41.png",
      suffix: ".png", 
    },
    gender: "female",
    serif: "人狼はおとぎ話です。怖がる必要はありませんよ。",
  },

  {
    name: {
      first: "女優", last: "ナオミ",
      nicknames: ["なおみ"],
    },
    icon: {
      url: settings.iconDir + "/euro/female45.png",
      suffix: ".png",
    },
    gender: "female",
    serif: "人狼ねー。あんがい実在するんじゃない？",
  },

  {
    name: {
      first: "メイド", last: "シンデレラ",
      nicknames: ["シンディ", "シンデ"],
    },
    icon: {
      url: settings.iconDir + "/euro/female50.png",
      suffix: ".png",
    },
    gender: "female",
    serif: "これ人狼かな？怖いから里帰りしていい？",
  },

  {
    name: {
      first: "おてんば", last: "カトリーヌ",
      nicknames: ["カトリ", "カトリーン"],
    },
    icon: {
      url: settings.iconDir + "/euro/female56.png",
      suffix: ".png",
    },
    gender: "female",
    serif: "てか人狼とかいなくていいよそうおもった",
  },

  {
    name: {
      first: "画家", last: "ミユ",
      nicknames: ["みゅ", "ミユ", "みゆ"],
    },
    icon: {
      url: settings.iconDir + "/euro/female73.png",
      suffix: ".png",
    },
    gender: "female",
    serif: "アアアアタシは人狼とかししし信じてないからさ！！",
  },

  {
    name: {
      first: "放浪者", last: "ナバール",
      nicknames: ["ナバ"],
    },
    icon: {
      url: settings.iconDir + "/euro/male03.png",
      suffix: ".png",
    },
    gender: "male",
    serif: "人狼なんてものが本当にいるとでも？",
  },

  {
    name: {
      first: "勉強家", last: "ザックス",
      nicknames: ["ザッカス"],
    },
    icon: {
      url: settings.iconDir + "/euro/male04.png",
      suffix: ".png",
    },
    gender: "male",
    serif: "いぁ、人狼とかいないっしょ。",
  },

];


exports.Character = Character;
exports.europeSet = Europe;
