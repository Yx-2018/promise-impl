# 简单实现promiseA+规范

项目中`PromiseImpl.js`为实现promise代码，代码通过promiseA+规范测试  
`test.js`为测试文件，做代码调试  

## 项目运行

> npm i  
> node test.js

## 测试promiseA+规范

采用`promises-aplus-tests`插件进行promise用例测试

> npm run test

## 备注

本例最终实现后，与浏览器promise仍存在差别。例如：

```js
Promise.resolve().then(() => {
    console.log(0);
    return Promise.resolve(4);
}).then((res) => {
    console.log(res)
})

Promise.resolve().then(() => {
    console.log(1);
}).then(() => {
    console.log(2);
}).then(() => {
    console.log(3);
}).then(() => {
    console.log(5);
}).then(() =>{
    console.log(6);
})
```

通过浏览器执行结果为：1，2，3，4，5，6  
而通过本项目执行结果为：1，2，4，3，5，6

这是因为浏览器promise规范与标准promiseA+有差异，浏览器在then方法中判断返回值为promise时，额外添加了一层微任务  
可将PromiseImpl.js中`249-260`行内代码替换为

```js
queueMicrotask(() => {
    // 向结果promise的任务队列中追加一个任务，当结果promise执行结束，改变新创建的promise2的结果，使得promise2可以继续走下去
    then.call(x, y => {
        if(called) return
        called = true
        resolvePromise(promise2, y, resolve, reject)
    },r => {
        if(called) return
        called = true
        reject(r)
    })
})
```

即可输出浏览器同样结果

## 参考文献

>感谢掘金博客：https://juejin.cn/post/6945319439772434469

## 本项目仅做学习使用
