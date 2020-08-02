var util = require('../utils/util.js');
var upng = require('../utils/UPNG.js');
import { fbxModelLoad } from "../utils/model.js";
import * as THREE from '../utils/three/three.weapp.min.js';

var store = [], isAnimationFirstLoad = true;
let ifonLoadReadied = false;
let globalData = {
  platformServerUrl: "https://weixin.wechatvr.org",
  activityId: null,
  recogFlagFront: null, 
  shareConfig: {},
  activityConfig: {},
  res: "",
  innerWidth: wx.getSystemInfoSync().windowWidth,
  innerHeight: wx.getSystemInfoSync().windowHeight
};
let { platformServerUrl } = globalData ;
let activityId ;
let frontId;
let music = wx.getBackgroundAudioManager();
let ifRecongnize = false;
var listener;
var setInner;
let openId = false;
Page({  
  data: {    
    canvasId: null,
    isShowRule: false,
    rulePicUrl: "",    
    isShowJumpAnimation: true,
    video: "",
    isShowVideo: false,
    isShowCamera: true,
    linkUrl: "https://www.wechatvr.org",
    isShowScan: true,
    isShowAnimation: false
  },
  onLoad: function(options){  
    let that = this;  
    console.log(options);
    globalData.activityId = options.activityId ;
    activityId = globalData.activityId ; 
    if (options.openId != "false") {
      console.log("需要统计");
      openId = options.openId;
    }
    that.requestActivityInformation() ; 
  },
  onShow: function() { 
    let context = null;
    console.log(`ifonLoadReadied:${ifonLoadReadied}`);
    if(ifonLoadReadied){    
    let that = this;  
    console.log(globalData.activityConfig.musicUrl); 
    if(globalData.activityConfig.musicUrl){   
        music.src = globalData.activityConfig.musicUrl;
        music.title = 'music';
        music.play();      
    }   
    if(that.data.isShowScan == false || that.data.isShowVideo == true){
      that.setData({
        isShowScan: true,
        isShowAnimation: false,
        isShowVideo: false,
        isShowCamera: true
      });
    }else{
      that.changeTitle(globalData.activityConfig.activityTitleMain);    //更换小程序页面标题    
      that.setData({
        rulePicUrl: globalData.activityConfig.rulePicUrl
      });
    } 
    (async function () {      
        if(globalData.recogFlagFront == true){     //前端识别                
          that.loading("请稍后");
          if(globalData.activityConfig.animationModelUrl != null){
            that.loadAnimation(globalData.activityConfig.animationModelUrl);
          } 
          var scanPic = globalData.activityConfig.scanPic;var imgtemp;var result;var flag = true;
          //var setInner;    
          context = wx.createCameraContext();      
          listener = context.onCameraFrame((frame) => {      
            if(frame && flag){
              store.push(frame);        
              flag = false;
            }         
          }) ;   
        var startLis=function(listenTime) {         
          listener.start({
            success: function (res) {          
              console.log("开始监听"); 
              wx.hideLoading();
              //that.alert("开始监听", 2000);
              setInner = setInterval(function () {           
                var timeStart = Date.now();     
                imgtemp = new Uint8ClampedArray(that.handleCameraData(store[0]));
                result = util.patten(imgtemp, store[0].width, store[0].height*0.5);
                console.log(result) ;
                if(result != -1) {       
                  ifRecongnize = true;                                            
                  that.stopListen(listener, setInner);      //识别成功后停止监听以及停止处理图像数据，为了方便识别多个图片，测试的时候识别成功后不停止，30s之后再停止；        
                  that.showAnimation();
                }
                console.log("图片匹配用了" + (Date.now()-timeStart)/1000 + "秒");
                store.shift();
                flag = true;
                }, 1000);           
            }
          });          
        } 
        util.setRecognitionImgs(scanPic,startLis.bind(that), 30000);  
      } else if(globalData.recogFlagFront == false) {   //后端识别    
        isAnimationFirstLoad = true;  //防止返回扫描页加载不了动画
        var imgOriginBuffer;var result;var flag = true; var message = {}; var timeStart; 
        //var setInner;
        context = wx.createCameraContext();   
        listener = context.onCameraFrame((frame) => {      
          if(frame && flag){
            store.push(frame);        
            flag = false;
          }         
        }) ; 
        postToEnd();
        function postToEnd() {
          var queryParam;          
          listener.start({
            success: function (res) {                    
              console.log("开始监听"); 
              //that.alert("开始监听", 2000);
              setInner = setInterval(function () {
                timeStart = Date.now();     
                imgOriginBuffer = that.handleCameraData(store[0]);                                
                  (async function(){
                    const dataBase = wx.arrayBufferToBase64(upng.encode([imgOriginBuffer], store[0].width, store[0].height*0.5));  //arraybuffer转换为base64编码(176K大小)  
                    console.log("1:获取base64用了" + (Date.now()-timeStart)/1000 + "秒");  
                    console.log(frontId);          
                    queryParam = {
                      "activityId": activityId,
                      "userPic": dataBase,
                      "scanId" : frontId
                    };
                    let url = platformServerUrl + '/services/frontend/rs/scan/multiple/match',
                        type = "POST",
                        dataType = "json";                  
                    await new Promise((resolve, reject) => {
                      that.callbackApi(url, queryParam, type, dataType, (data) => {
                        if (data.matched == true) {
                          ifRecongnize = true;
                          console.log("识别成功！！！" + data.subActivityId);
                          that.stopListen(listener, setInner);      //识别成功后停止监听以及停止处理图像数据，为了方便识别多个图片，测试的时候识别成功后不停止，30s之后再停止；
                          openId != false ? that.recordScanBehaviorMore(frontId, data.subActivityId) : "";
                          that.showAnimationMore(data.subActivityId);
                          flag = true;                          
                        } else {
                          console.log("2:识别失败");    
                        }
                        console.log("3:图片匹配用了" + (Date.now()-timeStart)/1000 + "秒");
                        store.shift();
                        flag = true;
                        resolve();
                      });
                    });  
                  }())
                //});
                }, 1000);           
            }
          });          
        }
      }
      }())   
  }
},
  onUnload: function () {      
    let that = this;  
    try {
      music.stop();    
      ifonLoadReadied = false;        
      if(ifRecongnize == false){   //退出页面还没有识别出来，停止监听摄像头数据 
        that.stopListen(listener, setInner);
      }
      if(that.data.canvasId != null)
      THREE.global.unregisterCanvas(that.data.canvasId)
    }catch(e){
      console.log(e);
    }  
},
  onHide: function() {
    //this.alert("onHide");
    // ifonLoadReadied = false;
  let that = this;  
  try {
    music.stop();    
    if(that.data.canvasId != null)
    THREE.global.unregisterCanvas(that.data.canvasId)
  }catch(e){
    console.log(e);
  }  
}, 
callbackApi: function(url, queryParam, type, dataType = "json", func) {    //ajax请求服务器
  wx.request({
    url: url, 
    data: JSON.stringify(queryParam),
    method: type,
    dataType: dataType,        
    header: {
      'content-type': 'application/json ; charset=UTF-8;'
    },
    success(res) {
      func(res.data);       
    },
    fail(res) { 
      console.log("请求失败...");         
      console.log(res.data);        
    },
    complete(res) {             
    }
  }) 
},
alert: function(str, time=500) {
  wx.showToast({
    title: str,
    icon: "none",
    duration: time
  }) 
},
showAndHideRule: function() {
  this.setData({
    isShowRule: !this.data.isShowRule
  });    
},  
toNextUrl: function() { 
  music.stop();
  var that = this;   
  let link =  globalData.activityConfig.link;
  if( !globalData.activityConfig.video || globalData.activityConfig.video == null) {     //如果没有视频 
    console.log("no video");
    if(link){
      wx.navigateTo({
        url: `/pages/myLink/myLink?link=${link}`        
      })
    }   
  }else {       //如果有视频
    console.log("has video");  
    that.setData({
      video: globalData.activityConfig.video,
      isShowVideo: true,
      isShowScan: false,
      isShowRule: false,
      isShowAnimation: false,
      isShowCamera: false
    });
  }    
},
stopPlay: function() {
  console.log("视频播放结束！");
  var _this = this;
  if(globalData.activityConfig.link != null) {
    wx.navigateTo({
      url: `/pages/myLink/myLink?link=${globalData.activityConfig.link}`         
    })
  }   
},
loadAnimation: function(modelUrl) { 
  let that = this;
  const query = wx.createSelectorQuery().in(this);  
  query.select('#myCanvas').node().exec(function (res) {
    that.setData({ canvasId: res[0].node._canvasId });
    const canvas = new THREE.global.registerCanvas(res[0].node);
    fbxModelLoad(canvas, modelUrl, THREE, globalData.innerWidth, globalData.innerHeight); 
  });   
},
handleCameraData: function (cameraData) {
  let rawData = cameraData.data;
  let startArray = cameraData.width * cameraData.height;
  let endArray = cameraData.width * cameraData.height * 3;    
  return rawData.slice(startArray, endArray);
},
stopListen: function(listen, set) {
  let _this = this;
  setTimeout(function () {                      
    listen.stop({
      success: function (res) {    
        //_this.alert("停止监听"); 
        console.log("停止监听");         
      }
    });
  }, 10);            
  clearInterval(set);
},
// stopListenEnd: function(worker, setInner, listener) {
//   let _this = this;
//   setTimeout(function () {                      
//     listener.stop({
//       success: function (res) {     
//         console.log("停止监听");     
//         //_this.alert("停止监听", 2000);          
//       }
//     });
//   }, 10);                
//   clearInterval(setInner);    
// },
showAnimationMore: function(subActivityId) {
  var _this = this;
  if(isAnimationFirstLoad) {   //防止停止监听不及时导致的识别成功两次，这样导致两次的加载动画
    let url = platformServerUrl + "/services/frontend/rs/activity/scan/config/sub/info?activityId=" + activityId+"&subActivityId=" + subActivityId,
      type = "GET",
      dataType = "json";  
    const p = new Promise((resolve, reject) => {
      _this.callbackApi(url, null, type, dataType, (data) => {        
        resolve(data);
      });
    });
    p.then((res) => {    
      globalData.activityConfig.video = res.videoLink;   //多对多的视频链接
      globalData.activityConfig.link = res.partnerLink;   //商家链接
      globalData.activityConfig.subTitle = res.title;    //子活动名称
      globalData.activityConfig.animationModelUrl = res.animationModelUrl;    //多对多的动画模型
      if(res.animationModelUrl == null) {    //如果没有动画          
        _this.toNextUrl(globalData.activityConfig.link);     
      }else{                     //有动画(更换标题，加载动画)
        _this.setData({
          isShowScan: false,
          isShowAnimation: true
        },function(){ _this.loading("模型加载中...");
        _this.loadAnimation(res.animationModelUrl);});                 
        wx.setNavigationBarTitle({
          title: res.title
        })        
      }   
    });
    isAnimationFirstLoad = false;
  }
},
showAnimation: function() {
  var _this = this;
  if(globalData.activityConfig.animationModelUrl == null) {    //如果没有动画
    _this.toNextUrl(globalData.activityConfig.link);     
  }else{                     //有动画(更换标题，加载动画)
    if(globalData.activityConfig.link == null) {
      _this.setData({
        isShowScan: false,
        isShowAnimation: true,
        isShowJumpAnimation: false
      });
    }else {
      _this.setData({
        isShowScan: false,
        isShowAnimation: true
      });
    }   
  } 
},
changeTitle: function(str) {
  wx.setNavigationBarTitle({                //更换小程序页面标题
    title: str
  })
},
loading: function(str) {
  wx.showLoading({
    title: str
  });
},
touchStart(e) {  
  THREE.global.touchEventHandlerFactory('canvas', 'touchstart')(e)
},
touchMove(e) {  
  THREE.global.touchEventHandlerFactory('canvas', 'touchmove')(e)
},
touchEnd(e) { 
  THREE.global.touchEventHandlerFactory('canvas', 'touchend')(e)
},
requestActivityInformation(){
  let _this = this;
  let activityConfig = {};
  let shareConfig;
  let url = platformServerUrl + "/services/frontend/rs/activity/scan/config/info?activityId=" + activityId ,
  queryParam = null,
  type = "GET";
    this.callbackApi(url, queryParam, type, "json", function(data){        
      if(data.haveSub == 1){     //多对多活动
        console.log("此活动为多对多活动...");
        globalData.recogFlagFront = false;       
      }else{                     //一对一活动
        activityConfig = {             //动画模型的url、模板图、动画结束后的跳转链接
          animationModelUrl: data.animationModelUrl,      //动画模型 
          scanPic: data.recognitionSamplePictures.map((value) => {return value.recognitionSamplePictureUrls}), //模板图url    
          link: data.animationNextPageUrl || data.scanNextPageUrl,  //一对一商家链接
        };
        globalData.recogFlagFront = true;           //一对一和多对多活动类型区分
      }
      shareConfig = {
        title:  data.sharedTitle,     //分享标题
        desc:  data.sharedDescription, //分享描述
        img:  data.sharedPicUrl  //分享图片
      };                         
      activityConfig = Object.assign({}, activityConfig, {
        activityTitleMain: data.activityTitle,   //活动名称
        musicUrl: data.musicUrl,       //活动音乐
        rulePicUrl: data.introducePicUrl  //活动说明图片
      }); 
      globalData.activityConfig = activityConfig ;
      globalData.shareConfig = shareConfig ;        
      ifonLoadReadied = true;  
      if(openId != false){
        _this.recordScanBehavior(activityId);
      } else {
        _this.onShow(); 
      }            
    }); 
},
userDate() {
  let date = new Date;
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  month = (month < 10 ? "0" + month : month);
  let day = date.getDate();
  day = (day < 10 ? "0" + day : day);
  let hour = date.getHours() ;
  hour = (hour < 10 ? "0" + hour : hour);
  let minute = date.getMinutes() ;
  minute = (minute < 10 ? "0" + minute : minute);
  let second = date.getSeconds() ;
  second = (second < 10 ? "0" + second : second);
  let mydate = (year.toString() + '-' + month.toString() + '-' + day.toString() + ' '
      + hour.toString() + ':' + minute.toString() + ':' + second.toString() );
  return mydate;
},
recordScanBehavior(activityId){  
  let _this = this;
  let url = platformServerUrl + '/services/frontend/rs/user/scanbehavior/add';//接收扫描行为的接口
  let mUrl = "miniprogram";
  let systemInfo = wx.getSystemInfoSync();  
  let browser = "miniprogram";//浏览器类型
  let terminal = systemInfo.platform;//终端类型
  let os = systemInfo.system;//操作系统类型
  let time = _this.userDate(); 
  let queryType = 'POST',      
      queryParam = {
          "url": mUrl,
          "browser": browser,
          "os": os,
          "terminal": terminal,
          "visitTime":time,
          "activityId": activityId,
          "openId": openId
      };      
  _this.callbackApi(url, queryParam, queryType, "json", function (data) {
    frontId = data.id;  
    _this.onShow(); 
  });  
},
recordScanBehaviorMore(frontId, subActivityId) {  
  let url = platformServerUrl + '/services/frontend/rs/user/scanbehavior/update';//接收扫描行为的接口
  let queryType = 'POST',
      queryParam = {
          "id": frontId,
          "subActivityId": subActivityId,
      };
  this.callbackApi(url, queryParam, queryType, "json", function (data) {
      console.log(`发送${url}成功`);
  });
},
loginSuccess: function(e) {
  console.log(e);
  if (e.detail.code) {    
    wx.request({
      url: platformServerUrl + '/services/frontend/rs/user/scanbehavior/update',   //后台获取openid的接口
      data: {
        code: e.detail.code
      },
      success (res) {
        console.log(res);    //返回自定义登陆态
        if(res != "ndefined"){
          wx.setStorageSync(userName, 'hello world')
        }        
      },
      fail (res) {
        console.log(res);    //返回自定义登陆态
        //wx.setStorageSync('openid', res)
      }
    })
  } else {
    console.log('登录失败！' + res.errMsg)
  }
  this.setData({
    ifShowLogin: false   
  });
  this.requestActivityInformation() ; 
  // console.log(e.detail.code) // wx.login 的 code  
},
loginFail: function (res) {
  this.alert(res);
  console.log(res);
},
/*
用户点击右上角分享
*/
onShareAppMessage: function() {    //分享标题、分享描述、分享路径（可带参数）  
    return {     
      title: globalData.shareConfig.title,     
      desc: globalData.shareConfig.desc,
      path: '/pages/index/index?id=' + activityId,
      imageUrl: globalData.shareConfig.img     
    }     
  }
})

