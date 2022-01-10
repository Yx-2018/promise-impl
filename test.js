const PromiseImpl = require('./PromiseImpl')

// const b = [
//     PromiseImpl.resolve(1),
//     PromiseImpl.reject(2),
//     PromiseImpl.resolve(3),
// ]
// PromiseImpl.all(b).then(val => {
//     console.log(val)
// }, err => {
//     console.log('e', err)
// })

PromiseImpl.resolve().then(() => {
    console.log(0);
    return PromiseImpl.resolve(4);
}).then((res) => {
    console.log(res)
})

PromiseImpl.resolve().then(() => {
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
