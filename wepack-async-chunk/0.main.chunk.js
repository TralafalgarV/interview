// window["webpackJsonp"] 实际上是一个数组，向中添加一个元素。这个元素也是一个数组，其中数组的第一个元素是chunkId，第二个对象，跟传入到 IIFE 中的参数一样
// 注意！！！此处的 push 在 main.chunk.js 中换成 webpackJsonpCallback 函数
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],{

  /***/ "./src/async.js":
  /*!************************!*\
    !*** ./src/async.js ***!
    \************************/
  /*! exports provided: async */
  /***/ (function(module, __webpack_exports__, __webpack_require__) {
  
  "use strict";
  __webpack_require__.r(__webpack_exports__);
  /* harmony export (binding) */ 
  __webpack_require__.d(__webpack_exports__, "async", function() { return say; });
  
  function say() {
    return 'Hi, I am async Module';
  }
  
  /***/ })
  
  }]);