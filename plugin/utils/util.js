var FeatTrainer = require('./FeatTrainer.js');
var upng = require('./UPNG.js');
//const app = getApp();
const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

/*获取当前页url*/
function getCurrentPageUrl() {
  var pages = getCurrentPages()    //获取加载的页面
  var currentPage = pages[pages.length - 1]    //获取当前页面的对象
  var url = currentPage.route    //当前页面url
  return url
}

/*获取当前页带参数的url*/
function getCurrentPageUrlWithArgs() {
  var pages = getCurrentPages()    //获取加载的页面
  var currentPage = pages[pages.length - 1]    //获取当前页面的对象
  var url = currentPage.route    //当前页面url
  var options = currentPage.options    //如果要获取url中所带的参数可以查看options

  //拼接url的参数
  var urlWithArgs = url + '?'
  for (var key in options) {
    var value = options[key]
    urlWithArgs += key + '=' + value + '&'
  }
  urlWithArgs = urlWithArgs.substring(0, urlWithArgs.length - 1)

  return urlWithArgs
}







//前端识别的算法
let trainer = new FeatTrainer.FeatTrainer();
let pattern = [];
let imgCounts;

function initPatten(wh, arrayBuf) {
  let timeStart = Date.now();
  imgCounts = wh.length;        //imgCounts=2   即循环2次
  getPattern(wh, arrayBuf);
  function getPattern(wh, af) {
    let start = Date.now();
    let grayImg = [];
    for (let i = 0; i < imgCounts; i++) {
      grayImg[i] = trainer.getGrayScaleMatRecog(wh[i][0], wh[i][1], af[i]); //w, h, arraybuffer
      //console.log(grayImg[i]);
      pattern[i] = trainer.trainPattern(grayImg[i]);
      //console.log(pattern[i]);
    }
    let duration = Date.now() - start;
  }  
  console.log("提取模板图特征用了" + (Date.now()-timeStart)/1000 + "秒");
  return 200;
}
function setRecognitionImgs(scanPics, func, time){  
  var timeStart = Date.now();
  let imgswh = [];let imgsaf = [];let whImage = [];let afImage = [];let len = scanPics.length;
  async function getImg() {     
    for(let i=0;i<len;i++) {     
      await new Promise((resolve, reject) => {
        wx.request({             
          url: scanPics[i],
          responseType: "arraybuffer",
          success (res) {           
            afImage[0] = upng.toRGBA8(upng.decode(res.data));
            imgsaf.push(afImage); afImage = [];            
            resolve() ;                        
          },
          fail (res) {
            console.log(res);
          }
        });
      })
    }  
    for(let i = 0; i < len; i ++){
      await new Promise((resolve, reject) => {
        wx.getImageInfo({             //获取高度和宽度
          src: scanPics[i],
          success (res) {
            //console.log(i + "执行完毕");
            whImage[0] = res.width;
            whImage[1] = res.height;
            imgswh.push(whImage); whImage=[];  
            resolve();                       
          }
        });
      })
    }
  }
 
  getImg().then(function(){    
    //console.log(imgswh);
    //console.log(imgsaf);
    var re = initPatten(imgswh, imgsaf) ;   //同步
    console.log("模板图放置成功");
    console.log("放置模板图花费" + (Date.now()-timeStart)/1000 + "秒");
    func(time);                                 //将监听放置在此回调中，不然最开始模板图没有放置成功的情况下，就会开始监听，浪费资源
}) ;
}
function patten(img,w,h) { 
  let grayImage = trainer.getGrayScaleMatPatten(img,w,h);
  let features = trainer.describeFeatures(grayImage);
  for (let i = 0; i < imgCounts; i++) {    
    let matches = trainer.matchPattern(features.descriptors, pattern[i].descriptors);
    let result = trainer.findTransform(matches, features.keyPoints, pattern[i].keyPoints);
    if (result && result.goodMatch > 8) {
      result = null;
      return i + 1;
    }
  }
  return -1;
}
var Detector = {

	//canvas: !! window.CanvasRenderingContext2D,
	webgl: ( function () {

		try {

      var canvas = document.createElement( 'canvas' ); 
      return !! ( window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ) );

		} catch ( e ) {

			return false;

		}

	} )(),
	//workers: !! window.Worker,
	//fileapi: window.File && window.FileReader && window.FileList && window.Blob,
	getWebGLErrorMessage: function () {

		var element = document.createElement( 'div' );
		element.id = 'webgl-error-message';
		element.style.fontFamily = 'monospace';
		element.style.fontSize = '13px';
		element.style.fontWeight = 'normal';
		element.style.textAlign = 'center';
		element.style.background = '#fff';
		element.style.color = '#000';
		element.style.padding = '1.5em';
		element.style.width = '400px';
		element.style.margin = '5em auto 0';

		if ( ! this.webgl ) {

			element.innerHTML = window.WebGLRenderingContext ? [
				'Your graphics card does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br />',
				'Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.'
			].join( '\n' ) : [
				'Your browser does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br/>',
				'Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.'
			].join( '\n' );

		}

		return element;

	},

	addGetWebGLMessage: function ( parameters ) {

		var parent, id, element;

		parameters = parameters || {};

		parent = parameters.parent !== undefined ? parameters.parent : document.body;
		id = parameters.id !== undefined ? parameters.id : 'oldie';

		element = Detector.getWebGLErrorMessage();
		element.id = id;

		parent.appendChild( element );

	}

};

module.exports = {
  formatTime: formatTime,
  getCurrentPageUrl: getCurrentPageUrl,
  getCurrentPageUrlWithArgs: getCurrentPageUrlWithArgs,
  setRecognitionImgs: setRecognitionImgs,
  patten: patten,
  Detector:Detector
}