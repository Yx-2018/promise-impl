/**
 * promise拥有三个状态变量，分别为：
 * pending: 等待中
 * fulfilled：已完成
 * rejected：已拒绝
 *
 * 等待中可变为已完成和已拒绝
 * 已完成和已拒绝不可再被修改
 */
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'


/**
 * 简易实现promiseA+规范
 */
class PromiseImpl {

    status = PENDING
    // 完成后的值
    value = undefined
    // 拒绝原因
    reason = undefined
    // 完成处理函数
    onFulfillCallbacks = []
    // 拒绝处理函数
    onRejectCallbacks = []

    constructor(executor) {
        try {
            executor(this.resolve, this.reject)
        }catch (e) {
            this.reject(e)
        }
    }

    resolve = (value) => {
        if(this.status !== PENDING) {
            return
        }
        this.status = FULFILLED
        this.value = value
        while(this.onFulfillCallbacks.length) {
            this.onFulfillCallbacks.shift()(value)
        }
    }

    reject = (reason) => {
        if(this.status !== PENDING) {
            return
        }
        this.status = REJECTED
        this.reason = reason
        while(this.onRejectCallbacks.length) {
            this.onRejectCallbacks.shift()(reason)
        }
    }

    then(onFulfilled, onRejected) {

        // 支持可变参数，不用两个必须传
        const realOnFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
        // 这里设置默认方法要当作异常抛出，否则不会当作reject处理
        const realOnRejected = typeof onRejected === 'function' ? onRejected : reason => {throw reason}

        // 链式调用核心，返回一个新的promise对象。不能返回当前this，否则链式调用之后的value都是第一次的，应该是上一次onFulfilled执行的返回结果
        const promise2 = new PromiseImpl((resolve, reject) => {

            const onFulfilledCallback = () => {
                // 如果不加微任务，当return为promise时，可能出现未初始化就使用的情况
                queueMicrotask(() => {
                    try{
                        const x = realOnFulfilled(this.value)
                        resolvePromise(promise2, x, resolve, reject)
                    }catch (e) {
                        reject(e)
                    }
                })
            }

            const onRejectedCallback = () => {
                queueMicrotask(() => {
                    try{
                        const x = realOnRejected(this.reason)
                        resolvePromise(promise2, x, resolve, reject)
                    }catch (e) {
                        reject(e)
                    }
                })
            }

            switch (this.status) {
                case FULFILLED:
                    onFulfilledCallback()
                    return
                case REJECTED:
                    onRejectedCallback()
                    return
                default:
                    this.onFulfillCallbacks.push(onFulfilledCallback)
                    this.onRejectCallbacks.push(onRejectedCallback)
            }
        })
        return promise2
    }

    catch(fn) {
        if(typeof fn !== 'function') {
            throw new TypeError('param is not the function')
        }
        // 向当前调用promise任务中追加一个处理异常的任务
        this.then(undefined, fn)
    }


    finally (fn) {
        return this.then((value) => {
            return PromiseImpl.resolve(fn()).then(() => {
                return value;
            });
        }, (error) => {
            return PromiseImpl.resolve(fn()).then(() => {
                throw error
            });
        });
    }

    static resolve(value) {
        if(value instanceof PromiseImpl) {
            return value
        }
        return new PromiseImpl(resolve => {
            resolve(value)
        })
    }

    static reject(reason) {
        return new PromiseImpl((resolve, reject) => {
            reject(reason)
        })
    }

    static all(promises) {

        return new PromiseImpl((resolve, reject) => {
            const result = []
            let count = 0
            const length = promises.length
            if(!length) {
                return resolve(result)
            }

            for (const promise of promises) {
                PromiseImpl.resolve(promise).then(value => {
                    count++
                    result.push(value)
                    // 回调函数中无法终止for循环，所以用下标相等判断是否执行结束
                    if(count === length) {
                        resolve(result)
                    }
                }, reason => {
                    reject(reason)
                })
            }
        })
    }

    static allSettled = (promiseList) => {
        return new PromiseImpl((resolve) => {
            const length = promiseList.length;
            const result = [];
            let count = 0;

            if (length === 0) {
                return resolve(result);
            } else {
                for (let i = 0; i < length; i++) {
                    const currentPromise = PromiseImpl.resolve(promiseList[i]);
                    currentPromise.then((value) => {
                        count++;
                        result[i] = {
                            status: 'fulfilled',
                            value: value
                        }
                        if (count === length) {
                            return resolve(result);
                        }
                    }, (reason) => {
                        count++;
                        result[i] = {
                            status: 'rejected',
                            reason: reason
                        }
                        if (count === length) {
                            return resolve(result);
                        }
                    });
                }
            }
        });
    }

    static race (promiseList) {
        return new PromiseImpl((resolve, reject) => {
            const length = promiseList.length;

            if (length === 0) {
                return resolve();
            } else {
                for (let i = 0; i < length; i++) {
                    PromiseImpl.resolve(promiseList[i]).then((value) => {
                        return resolve(value);
                    }, (reason) => {
                        return reject(reason);
                    });
                }
            }
        });
    }
}

function resolvePromise (promise2, x, resolve, reject) {
    // 如果返回结果是源promise，抛出类型错误
    if(promise2 === x) {
        return reject(new TypeError('return promise can not source promise'))
    }

    // 判断返回值是不是promise或者是thenable
    if(typeof x === 'object' || typeof x === 'function') {

        if(x === null) {
            return resolve(x)
        }

        // 判断有没有then方法
        let then
        try{
            then = x.then
        }catch (e) {
            return reject(e)
        }

        // 如果then有，同时也是一个方法，那么认为他是一个promise或者是thenable
        if(typeof then === 'function') {
            // 记录是不是已经调用过， 防止重复调用
            let called = false
            // 如果是thenable，调用的时候可能有异常，这里兼容一下
            try{
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
            }catch (e) {
                if(called) return
                reject(e)
            }

        }else {
            resolve(x)
        }

    }else {
        resolve(x)
    }
}

PromiseImpl.deferred = function () {
    var result = {};
    result.promise = new PromiseImpl(function (resolve, reject) {
        result.resolve = resolve;
        result.reject = reject;
    });

    return result;
}

module.exports = PromiseImpl
