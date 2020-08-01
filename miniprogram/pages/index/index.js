
Page({
  data: {
    items: [],
    currentItem: 0,
    openid: false
    // link: "https://www.baidu.com"
  },
  onLoad: function(){
    let that = this;
    wx.login({
      success (res) {
        if (res) {
          console.log(res.code)
        wx.request({
          url: `https://weixin.wechatvr.org/services/frontend/rs/user/wxappuser/openid?code=${res.code}`,
          success (res) {
            console.log(res.data)
            that.setData({
              openid: res.data.openid
            });
            }
        })
        } else {
        console.log('登录失败！' + res.errMsg)
        }
        }
    });
  },
  addItem: function () {
    this.data.items.push(this.data.currentItem++);
    this.setData({
      items: this.data.items,
      currentItem: this.data.currentItem
    });
  }
});