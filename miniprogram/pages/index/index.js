
Page({
  data: {   
    openid: false
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
  }
});