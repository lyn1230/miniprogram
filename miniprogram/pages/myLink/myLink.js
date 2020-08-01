Page({
  data:{
    link: null
  },
  onLoad: function(options){
    console.log(options.link);
    this.setData({
      link:options.link
    })
  },
  error: function(e){
    console.log(e);
  },
  res:function(data){
    console.log(data);
  }
})