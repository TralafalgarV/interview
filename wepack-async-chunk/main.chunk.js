/*
前提：
将window["webpackJsonp"]的 push 方法替换为 webpackJsonpCallback 进行强化；

webpack异步加载、执行主要流程如下：
1. 通过调用__webpack_require__.e(chunkId):
		1. 读取installedChunks是否有缓存? 有，直接将chunk的 promise 添加到 promises 中
		2. 没有，创建[resolve, reject, promise]数组，存到installedChunks[chunkId]中，用于记录chunk加载状态;
		3. 通过 JSONP 加载异步chunk -- 添加script标签，加载{publicPath + chunkId + ".bundle.js"}文件
		4. 返回Promise.all(promises) 
2. chunk文件中触发 window["webpackJsonp"] 的 push(webpackJsonpCallback) 方法；
	1. 根据 chunkId 从 installedChunks 数组中找到状态为 执行中 的标记数组；
	2. 并将数组中的 resolve 方法添加到 resolves 数组中；
	3. 并将 installedChunks[chunkId] 对应值置为0，表示加载完成；
	4. 挨个将异步 chunk 中的 module 加入主 chunk 的 modules 数组中；
	5. 循环执行 resolves 数组中的 resolve（ 使__webpack_require__.e 的返回值 Promise.all(promises) 得到 resolve ）
3. then 方法中使用 __webpack_require__(见下方)方法加载并执行添加的模块函数


__webpack_require__主要流程：
1. 通过判断 installedModules[moduleId]，查看模块是否已经缓存；有，直接返回模块的exports
2. 没有，则创建 module = installedModules[moduleId] = {i: moduleId, l: false, exports: {}}
3. 通过call方法执行模块函数。并传入 module, module.exports, __webpack_require__等参数
4. 模块函数中：
		1. 调用 __webpack_require__.r 方法，将 exports 的 __esModule 属性置为 true。表明是 esmodule
		2. 实现 export { Hello }; 需要调用 __webpack_require__.d 方法将 Hello 属性与 function Hello(){} 进行绑定。
		3. 实现 export default Hello; 使用 __webpack_exports__["default"] = (sayHello);
		4. *如果使用 CommonJS 导出函数 module.export = Hello，打包后的代码，会调用 __webpack_require__.n(_Hello__WEBPACK_IMPORTED_MODULE_0__)
			 判断已加载的模块 _Hello__WEBPACK_IMPORTED_MODULE_0__ 是不是 esmodule，从而使用不同的方式导出模块：module['default'] 或者 module
*/



(function(modules) { // webpackBootstrap
	// install a JSONP callback for chunk loading
	// 1. 根据 chunkId 从 installedChunks 数组中找到状态为 执行中 的标记数组；
	// 2. 并将数组中的 resolve 方法添加到 resolves 数组中；
	// 3. 并将 installedChunks[chunkId] 对应值置为0，表示加载完成；
	// 4. 挨个将异步 chunk 中的 module 加入主 chunk 的 modules 数组中；
	// 5. 循环执行 resolves 数组中的 resolve（ 使__webpack_require__.e 的返回值 Promise.all(promises) 得到 resolve ）
	function webpackJsonpCallback(data) {
		// window["webpackJsonp"] 中的第一个参数——即[0]
		var chunkIds = data[0];
		// 对应的模块详细信息，详见打包出来的 chunk 模块中的 push 进 window["webpackJsonp"] 中的第二个参数
		var moreModules = data[1];
  
		// add "moreModules" to the modules object,
		// then flag all "chunkIds" as loaded and fire callback
		var moduleId, chunkId, i = 0, resolves = [];
		for(;i < chunkIds.length; i++) {
			chunkId = chunkIds[i];
			// 所以此处是找到那些未加载完的chunk，他们的 value 还是[resolve, reject, promise]
			// 这个可以看 __webpack_require__.e 中设置的状态
			// 表示正在执行的chunk，加入到 resolves 数组中
			if(installedChunks[chunkId]) {
				// 将 installedChunks[chunkId] === [resolve, reject, promise] 的 chunk 对应的 resolve 方法添加到 resolves 中
				resolves.push(installedChunks[chunkId][0]);
			}
			// 标记成已经执行完
			installedChunks[chunkId] = 0;
		}
		// 挨个将异步 chunk 中的 module 加入主 chunk 的 modules 数组中
		for(moduleId in moreModules) {
			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
				modules[moduleId] = moreModules[moduleId];
			}
		}
		// parentJsonpFunction: 原始的数组 push 方法，将 data 加入 window["webpackJsonp"] 数组。
		// *此处本质是将 push 方法外面包了一层 webpackJsonpCallback 的处理
		if(parentJsonpFunction) parentJsonpFunction(data);
		// 等到 while 循环结束后，__webpack_require__.e 的返回值 Promise 得到 resolve
		// 执行 resolove		
		while(resolves.length) {
			resolves.shift()();
		}
  
	};
  

	// The module cache
	var installedModules = {};
  
	// object to store loaded and loading chunks
	var installedChunks = {
		"main": 0
	};

  
	// The require function
	function __webpack_require__(moduleId) {
  
		// Check if module is in cache
		if(installedModules[moduleId]) {
			return installedModules[moduleId].exports;
		}
		// Create a new module (and put it into the cache)
		var module = installedModules[moduleId] = {
			i: moduleId,
			l: false,
			exports: {}
		};
  
		// Execute the module function
		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
  
		// Flag the module as loaded
		module.l = true;
  
		// Return the exports of the module
		return module.exports;
	}
  
	// This file contains only the entry chunk.
	// The chunk loading function for additional chunks
	__webpack_require__.e = function requireEnsure(chunkId) {
		var promises = [];
  
  
		// JSONP chunk loading for javascript
    // installedChunks[chunkId] 有下面几种形式
    // 1. 0: 代表已经 installed
    // 2. [resolve, reject, promise]: 目标chunk正在加载，则将 promise push到 promises 数组
    // 3. undefined: 代表该 chunk 加载失败、加载超时、从未加载过
		var installedChunkData = installedChunks[chunkId];
		if(installedChunkData !== 0) { // 0 means "already installed".
  
			// a Promise means "currently loading".
			if(installedChunkData) {
				promises.push(installedChunkData[2]);
			} else {
				// setup Promise in chunk cache
				var promise = new Promise(function(resolve, reject) {
					installedChunkData = installedChunks[chunkId] = [resolve, reject];
				});
				promises.push(installedChunkData[2] = promise);
  
				// start chunk loading
				// 使用 JSONP
				var head = document.getElementsByTagName('head')[0];
				var script = document.createElement('script');
  
				script.charset = 'utf-8';
				script.timeout = 120;
  
				if (__webpack_require__.nc) {
					script.setAttribute("nonce", __webpack_require__.nc);
				}
				// 获取目标chunk的地址，__webpack_require__.p 表示设置的publicPath，默认为空串
				script.src = __webpack_require__.p + "" + chunkId + ".bundle.js";
				var timeout = setTimeout(function(){
					onScriptComplete({ type: 'timeout', target: script });
				}, 120000);
				script.onerror = script.onload = onScriptComplete;
				// 设置加载完成或者错误的回调
				function onScriptComplete(event) {
					// avoid mem leaks in IE.
					script.onerror = script.onload = null;
					clearTimeout(timeout);
					var chunk = installedChunks[chunkId];
					// 如果为 0 则表示已加载，主要逻辑看 webpackJsonpCallback 函数
					if(chunk !== 0) {
						if(chunk) {
							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
							var realSrc = event && event.target && event.target.src;
							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
							error.type = errorType;
							error.request = realSrc;
							chunk[1](error);
						}
						installedChunks[chunkId] = undefined;
					}
				};
				head.appendChild(script);
			}
		}
		return Promise.all(promises);
	};
  
	// expose the modules object (__webpack_modules__)
	__webpack_require__.m = modules;
  
	// expose the module cache
	__webpack_require__.c = installedModules;
  
	// define getter function for harmony exports
	__webpack_require__.d = function(exports, name, getter) {
		if(!__webpack_require__.o(exports, name)) {
			Object.defineProperty(exports, name, {
				configurable: false,
				enumerable: true,
				get: getter
			});
		}
	};
  
	// define __esModule on exports
	__webpack_require__.r = function(exports) {
		Object.defineProperty(exports, '__esModule', { value: true });
	};
  
	// getDefaultExport function for compatibility with non-harmony modules
	__webpack_require__.n = function(module) {
		var getter = module && module.__esModule ?
			function getDefault() { return module['default']; } :
			function getModuleExports() { return module; };
		__webpack_require__.d(getter, 'a', getter);
		return getter;
	};
  
	// Object.prototype.hasOwnProperty.call
	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
  
	// __webpack_public_path__
	__webpack_require__.p = "";
  
	// on error function for async loading
	__webpack_require__.oe = function(err) { console.error(err); throw err; };
  
	// 将 push 方法的实现修改为 webpackJsonpCallback
	// 这样我们在异步 chunk 中执行的 window['webpackJsonp'].push 其实是 webpackJsonpCallback 函数。
	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
	jsonpArray.push = webpackJsonpCallback;
	jsonpArray = jsonpArray.slice();
	// 对已在数组中的元素依次执行webpackJsonpCallback方法
	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
	var parentJsonpFunction = oldJsonpFunction;
  
  
	// Load entry module and return exports
	return __webpack_require__(__webpack_require__.s = "./src/index.js");
})
  /************************************************************************/
({
  
  "./src/index.js":
  /*!**********************!*\
    !*** ./src/index.js ***!
    \**********************/
  /*! no exports provided */
  (function(module, __webpack_exports__, __webpack_require__) {
  
		"use strict";
		__webpack_require__.r(__webpack_exports__);
		/* harmony import */ 
		var _sayHello__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./sayHello */ "./src/sayHello.js");
		
		
		console.log(_sayHello__WEBPACK_IMPORTED_MODULE_0__["default"], Object(_sayHello__WEBPACK_IMPORTED_MODULE_0__["default"])('Gopal'));
		
		// 单纯为了演示，就是有条件的时候才去动态加载
		if (true) {
			__webpack_require__.e(/*! import() */ 0).then(__webpack_require__.bind(null, /*! ./Another.js */ "./src/Another.js")).then(res => console.log(res))
		}
  
  }),
  
  "./src/sayHello.js":
  /*!*************************!*\
    !*** ./src/sayHello.js ***!
    \*************************/
  /*! exports provided: default */
  (function(module, __webpack_exports__, __webpack_require__) {
  
		"use strict";
		__webpack_require__.r(__webpack_exports__);
		function sayHello(name) {
			return `Hello ${name}`;
		}
		
		/* harmony default export */ 
		__webpack_exports__["default"] = (sayHello);
  
  })
  
});
