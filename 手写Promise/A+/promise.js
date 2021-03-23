/*
  要点：
    1. Promise其实是一个发布订阅模式
    2. then方法对于还在pending的任务，其实是将回调函数onFilfilled和onRejected塞入了两个数组
    3. Promise构造函数里面的resolve方法会将数组onFilfilledCallbacks里面的方法全部拿出来执行，这里面是之前then方法塞进去的成功回调
    4. 同理，Promise构造函数里面的reject方法会将数组onRejectedCallbacks里面的方法全部拿出来执行，这里面是之前then方法塞进去的失败回调
    5. then方法会返回一个新的Promise以便执行链式调用
    6. catch和finally这些实例方法都必须返回一个新的Promise实例以便实现链式调用
    
  订阅发布模式：
    我们往回调数组里面push回调函数，其实就相当于往事件中心注册事件了，
    resolve就相当于发布了一个成功事件，所有注册了的事件，即onFulfilledCallbacks里面的所有方法都会拿出来执行，
    同理reject就相当于发布了一个失败事件。    
*/


// 先定义三个常量表示状态
var PENDING = 'pending';
var FULFILLED = 'fulfilled';
var REJECTED = 'rejected';

function vPromise(fn) {
  debugger
  this.state = PENDING; // 初始状态为pending
  this.value = null; // 初始化value
  this.reason = null; // 初始化reason

  // 构造函数里面添加两个数组存储成功和失败的回调
  this.onFulfilledCallbacks = [];
  this.onRejectedCallbacks = [];

  // 存一下this,以便resolve和reject里面访问
  var self = this;

  // resolve方法参数是value
  function resolve(value) {
    if (self.state === PENDING) {
      self.state = FULFILLED;
      self.value = value;

      // resolve里面将所有成功的回调拿出来执行
      self.onFulfilledCallbacks.forEach(callback => {callback(self.value)});
    }
  }

  // reject方法参数是reason
  function reject(reason) {
    if (self.state === PENDING) {
      self.state = REJECTED;
      self.reason = reason;

      // resolve里面将所有失败的回调拿出来执行
      self.onRejectedCallbacks.forEach(callback => {callback(self.reason)});
    }
  }

  // 最后将resolve和reject作为参数调用传进来的参数，记得加上try，如果捕获到错误就reject
  try {
    fn(resolve, reject);
  } catch (error) {
    reject(error);
  }
}

vPromise.prototype.then = function(onFulfilled, onRejected) {
  debugger
  // 如果onFulfilled不是函数，给一个默认函数，返回value
  var realOnFulfilled = onFulfilled;
  if (typeof realOnFulfilled !== 'function') {
    realOnFulfilled = function(value) {
      return value;
    }
  }

  // 如果onRejected不是函数，给一个默认函数，返回reason的Error
  var realOnRejected = onRejected;
  if (typeof realOnRejected !== 'function') {
    realOnRejected = function(reason) {
      throw reason;
    }
  }

  var self = this;   // 保存一下this

  // 1. 如果 onFulfilled 或者 onRejected 抛出一个异常 e ，则 promise2 必须拒绝执行，并返回拒因 e
  // 2. 如果 onFulfilled 不是函数且 promise1 成功执行， promise2 必须成功执行并返回相同的值
  if (this.state === FULFILLED) {
    var promise2 = new vPromise(function(resolve, reject) {
      setTimeout(function () {
        try {
          if (typeof realOnFulfilled !== 'function') {
            resolve(self.value)
          } else {
            var x = realOnFulfilled(self.value);
            resolvePromise(promise2, x, resolve, reject);   // 调用Promise 解决过程
          }
        } catch (error) {
          reject(error);
        }
      }, 0);
    });
    return promise2;
  }

  // 3. 如果 onRejected 不是函数且 promise1 拒绝执行， promise2 必须拒绝执行并返回相同的据因
  // 4. 如果 promise1 的 onRejected 执行成功了，promise2 应该被 resolve
  if (this.state === REJECTED) {
    var promise2 = new vPromise(function(resolve, reject) {
      setTimeout(function () {
        try {
          if (typeof realOnRejected !== 'function') {
            reject(self.reason)
          } else {
            var x = realOnRejected(self.reason);
            resolvePromise(promise2, x, resolve, reject);   // 调用Promise 解决过程
          }
        } catch (error) {
          reject(error);
        }
      }, 0);
    });
    return promise2;
  }

  // 如果还是PENDING状态，将回调保存下来
  if(this.state === PENDING) {
    var promise2 = new vPromise(function (resolve, reject) {

      self.onFulfilledCallbacks.push(function() {
        try {
          if (typeof realOnFulfilled !== 'function') {
            resolve(self.value);
          } else {
            var x = realOnFulfilled(self.value);
            resolvePromise(promise2, x, resolve, reject);
          }
        } catch (error) {
          reject(error);
        }
      });

      self.onRejectedCallbacks.push(function() {
        try {
          if (typeof realOnRejected !== 'function') {
            reject(self.reason);
          } else {
            var x = realOnRejected(self.reason);
            resolvePromise(promise2, x, resolve, reject);
          }
        } catch (error) {
          reject(error);
        }
      });
    })

    return promise2;
  }
}

function resolvePromise(promise, x, resolve, reject) {
  debugger
  // 如果 promise 和 x 指向同一对象，以 TypeError 为据因拒绝执行 promise
  // 这是为了防止死循环
  if (promise === x) {
    return reject(new TypeError('The promise and the return value are the same'));
  }

  if (x instanceof vPromise) {
    // 如果 x 为 Promise ，则使 promise 接受 x 的状态
    // 也就是继续执行 x，如果执行的时候拿到一个 y，还要继续解析 y
    // 这个 if 跟下面判断 then 然后拿到执行其实重复了，可有可无
    x.then(function (y) {
      resolvePromise(promise, y, resolve, reject);
    }, reject);
  }
  // 如果 x 为对象或者函数
  else if (typeof x === 'object' || typeof x === 'function') {
    // 这个坑是跑测试的时候发现的，如果 x 是null，应该直接 resolve
    if (x === null) {
      return resolve(x);
    }

    try {
      // 把 x.then 赋值给 then 
      var then = x.then;
    } catch (error) {
      // 如果取 x.then 的值时抛出错误 e ，则以 e 为据因拒绝 promise
      return reject(error);
    }

    // 如果 then 是函数
    if (typeof then === 'function') {
      var called = false;
      // 将 x 作为函数的作用域 this 调用之
      // 传递两个回调函数作为参数，第一个参数叫做 resolvePromise ，第二个参数叫做 rejectPromise
      // 名字重名了，我直接用匿名函数了
      try {
        then.call(
          x,
          // 如果 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)
          function (y) {
            // 如果 resolvePromise 和 rejectPromise 均被调用，
            // 或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
            // 实现这条需要前面加一个变量called
            if (called) return;
            called = true;
            resolvePromise(promise, y, resolve, reject);
          },
          // 如果 rejectPromise 以据因 r 为参数被调用，则以据因 r 拒绝 promise
          function (r) {
            if (called) return;
            called = true;
            reject(r);
          });
      } catch (error) {
        // 如果调用 then 方法抛出了异常 e：
        // 如果 resolvePromise 或 rejectPromise 已经被调用，则忽略之
        if (called) return;

        // 否则以 e 为据因拒绝 promise
        reject(error);
      }
    } else {
      // 如果 then 不是函数，以 x 为参数执行 promise
      resolve(x); 
    }
  } else {
    // 如果 x 不为对象或者函数，以 x 为参数执行 promise
    resolve(x);
  }
}

new vPromise((resolve, reject) => {
  setTimeout(() => {
    debugger
    resolve(123)
  }, 0);
}).then((res) => {
  console.log(1, res);
  return {res};
}).then((res) => {
  console.log(2, res); 
  return {res};
})


console.log(1)

new Promise((resolve) => {
  console.log(2)

  resolve(3)
}).then(res => {
  // 加入当前 EventLoop 的微任务
  new Promise(resolve => resolve(4)).then(a => console.log(a)) 
  console.log(res)
})

setTimeout(() => {
  // 加入下一个 EventLoop 的微任务
  new Promise(resolve => resolve(5)).then(res => console.log(res))
  console.log(6)
}, 0);

setTimeout(() => {
  // 一次 EventLoop 执行一个宏任务，在下一次被执行，所以 7 在 5 之后输出
  console.log(7)
}, 0);


var a = 1
function aFunc(p_a) {
  debugger
  const c = p_a;
  function bFunc(p_b) {
    return c + p_b
  }
  return bFunc(2)
}
