import Promise from 'bluebird'
import { describe, it, before, beforeEach, after } from 'mocha'
import { assert } from 'chai'
import sinon from 'sinon'
import rewire from 'rewire'

import RetryError from '../lib/RetryError'
import MaxRetryError from '../lib/MaxRetryError'
import IfFunctionError from '../lib/IfFunctionError'

var RetryLib = rewire('../lib')
var Retry = RetryLib.default

describe('Class', () => {
    it('Should exist', () => {
        assert.isFunction(Retry)
    })
    
    it('Can instantiate', () => {
        let retry = new Retry()
        
        assert.isObject(retry)  
    })
})

describe('An instance', () => {
    before(function() {
        this.retry = new Retry({
            initialDelay: 100,
            growthRate: 100,
            growth: 'linear'
        })
    })
    
    it('Has try method', function() {
        assert.isFunction(this.retry.try)
    })
    
    it('Has if method', function() {
        assert.isFunction(this.retry.if)
    })
    
    it('Has exec method', function() {
        assert.isFunction(this.retry.exec)
    })
    
    it('Should throw if no try function is provided', function(done) {
        this.retry.exec().then(() => {
            done(new Error('Should not be successful'))
        }).catch((err) => {
            assert.instanceOf(err, RetryError)
            assert.equal(err.message, 'No try function was provided')
        }).then(done).catch(done)
    })
    
    it('Should call try fn on exec', function(done) {
        let tryFn = sinon.stub()
        let rand = Math.random()
        tryFn.onCall(0).returns(rand)
        this.retry.try(tryFn)
        assert.isFalse(tryFn.called, 'called try fn before exec')
        this.retry.exec().then((val) => {
            assert.isTrue(tryFn.calledOnce, 'did not call try fn after exec')
            assert.equal(rand, val, 'did not propogate value')
        }).then(done).catch(done)
    })
    
    it('Should call try again if it throws', function(done) {
        let ifFn = sinon.spy(this.retry, 'ifFn')
        
        let tryFn = sinon.stub()
        let rand = Math.random()
        tryFn.onCall(0).throws('Error')
        tryFn.onCall(1).returns(rand)
        
        this.retry.try(tryFn)
        
        assert.isFalse(tryFn.called, 'called try fn before exec')
        assert.isFalse(ifFn.called, 'called fail fn before exec')
        this.retry.exec().then((val) => {
            assert.isTrue(ifFn.calledOnce, 'did not call fail fn')
            assert.isTrue(tryFn.calledTwice, 'did not retry after exec')
            assert.equal(rand, val, 'did not propogate success value')
        }).then(done).catch(done)
    })
    
    it('Should allow try fn to return a promise', function(done) {
        let ifFn = sinon.stub()
        ifFn.returns(true)
        
        let tryFn = sinon.stub()
        let rand = Math.random()
        tryFn.returns(new Promise((res, rej) => {
            setTimeout(() => {
                res(rand)
            }, 100)
        }))
        
        this.retry.if(ifFn)
        this.retry.try(tryFn)
        
        assert.isFalse(ifFn.called, 'called fail fn before exec')
        assert.isFalse(tryFn.called, 'called try fn before exec')
        this.retry.exec().then((val) => {
            assert.isTrue(tryFn.calledOnce, 'did not call try fn once')
            assert.isFalse(ifFn.called, 'called fail fn')
            assert.equal(val, rand, 'did not propogate success value')
        }).then(done).catch(done)
    })
    
    it('Should call try again if it rejects', function(done) {
        let ifFn = sinon.stub()
        ifFn.returns(true)
        
        let tryFn = sinon.stub()
        let rand = Math.random()
        tryFn.onCall(0).returns(new Promise((res, rej) => {
            setTimeout(() => {
                rej(new Error())
            }, 100)
        }))
        tryFn.onCall(1).returns(rand)
        
        this.retry.if(ifFn)
        this.retry.try(tryFn)
        
        assert.isFalse(ifFn.called, 'called fail fn before exec')
        assert.isFalse(tryFn.called, 'called try fn before exec')
        this.retry.exec().then((val) => {
            assert.isTrue(ifFn.calledOnce, 'did not call fail fn')
            assert.isTrue(tryFn.calledTwice, 'did not retry after twice')
            assert.equal(rand, val, 'did not propogate success value')
        }).then(done).catch(done)
    })
    
    it('Should stop retries if fail fn returns false', function(done) {
        let ifFn = sinon.stub()
        ifFn.onCall(0).returns(true)
        ifFn.onCall(1).returns(true)
        ifFn.onCall(2).returns(false)
        
        let tryFn = sinon.stub()
        let rand = Math.random()
        tryFn.throws(new Error(rand))
        
        this.retry.if(ifFn)
        this.retry.try(tryFn)
        
        assert.isFalse(ifFn.called, 'called fail fn before exec')
        assert.isFalse(tryFn.called, 'called try fn before exec')
        this.retry.exec().then(() => {
            done(new Error('Should not be successful'))
        }).catch((err) => {
            assert.isTrue(ifFn.calledThrice, 'did not call fail fn three times')
            assert.isTrue(tryFn.calledThrice, 'did not retry three times')
            assert.instanceOf(err, Error)
            assert.equal(rand, err.message, 'did not propogate error')
        }).then(done).catch(done)
    })
    
    it('Should allow fail fn to return a promise', function(done) {
        let ifFn = sinon.stub()
        ifFn.onCall(0).returns(new Promise((res, rej) => {
            setTimeout(() => {
                res(true)
            }, 100)
        }))
        ifFn.onCall(1).returns(new Promise((res, rej) => {
            setTimeout(() => {
                res(false)
            }, 100)
        }))
        
        let tryFn = sinon.stub()
        let rand = Math.random()
        tryFn.throws(new Error(rand))
        
        this.retry.if(ifFn)
        this.retry.try(tryFn)
        
        assert.isFalse(ifFn.called, 'called fail fn before exec')
        assert.isFalse(tryFn.called, 'called try fn before exec')
        this.retry.exec().then(() => {
            done(new Error('Should not be successful'))
        }).catch((err) => {
            assert.isTrue(ifFn.calledTwice, 'did not call fail fn three times')
            assert.isTrue(tryFn.calledTwice, 'did not retry three times')
            assert.instanceOf(err, Error)
            assert.equal(rand, err.message, 'did not propogate error')
        }).then(done).catch(done)
    })
    
    it('Should throw IfFunctionError if ifFn is rejected', function(done) {
        let ifFn = sinon.stub()
        let rand = Math.random()
        ifFn.onCall(0).returns(new Promise((res, rej) => {
            setTimeout(() => {
                rej(new Error(rand))
            }, 100)
        }))
        
        let tryFn = sinon.stub()
        let rand2 = Math.random()
        tryFn.throws(new Error(rand2))
        
        this.retry.if(ifFn)
        this.retry.try(tryFn)
        
        assert.isFalse(ifFn.called, 'called fail fn before exec')
        assert.isFalse(tryFn.called, 'called try fn before exec')
        
        this.retry.exec().then(() => {
            done(new Error('Should not be successful'))
        }).catch((err) => {
            assert.instanceOf(err, IfFunctionError, 'Error should be instance of IfFunctionError')
            assert.instanceOf(err.ifFunctionError, Error, 'did not propogate fail function error')
            assert.equal(err.ifFunctionError.message, rand, 'did not propogate fail function error')
            assert.instanceOf(err.innerError, Error, 'did not propogate inner error')
            assert.equal(err.innerError.message, rand2, 'did not propogate inner error')
        }).then(done).catch(done)
    })
    
    it('Should throw IfFunctionError if ifFn throws error', function(done) {
        let ifFn = sinon.stub()
        let rand = Math.random()
        ifFn.onCall(0).throws(new Error(rand))
        
        let tryFn = sinon.stub()
        let rand2 = Math.random()
        tryFn.throws(new Error(rand2))
        
        this.retry.if(ifFn)
        this.retry.try(tryFn)
        
        assert.isFalse(ifFn.called, 'called fail fn before exec')
        assert.isFalse(tryFn.called, 'called try fn before exec')
        
        this.retry.exec().then(() => {
            done(new Error('Should not be successful'))
        }).catch((err) => {
            assert.instanceOf(err, IfFunctionError, 'Error should be instance of IfFunctionError')
            assert.instanceOf(err.ifFunctionError, Error, 'did not propogate fail function error')
            assert.equal(err.ifFunctionError.message, rand, 'did not propogate fail function error')
            assert.instanceOf(err.innerError, Error, 'did not propogate inner error')
            assert.equal(err.innerError.message, rand2, 'did not propogate inner error')
        }).then(done).catch(done)
    })
    
    it('Should call ifFn with err from tryFn', function(done) {
        let ifFn = sinon.stub()
        ifFn.returns(true)
        
        let tryFn = sinon.stub()
        let rand = Math.random()
        let rand2 = Math.random()
        tryFn.onCall(0).throws(new Error(rand))
        tryFn.onCall(1).returns(rand2)
        
        this.retry.if(ifFn)
        this.retry.try(tryFn)
        
        assert.isFalse(ifFn.called, 'called fail fn before exec')
        assert.isFalse(tryFn.called, 'called try fn before exec')
        
        this.retry.exec().then((val) => {
            assert.isTrue(ifFn.calledOnce, 'Fail function not called')
            let err = ifFn.getCall(0).args[0]
            assert.instanceOf(err, Error, 'did not recieve error from tryFn')
            assert.equal(err.message, rand, 'did not recieve error from tryFn')
            assert.equal(val, rand2, 'did not recieve value from tryFn success')
        }).then(done).catch(done)
    })
})

describe('Max retries', function() {
    before(function() {
        this.retry = new Retry({
            initialDelay: 50,
            growthRate: 50,
            maxRetry: 2
        })
    })
    it('Should throw MaxRetryError when max retries is reached', function(done) {
        let ifFn = sinon.stub()
        ifFn.returns(true)
        
        let tryFn = sinon.stub()
        let rand = Math.random()
        tryFn.throws(new Error(rand))
        
        this.retry.if(ifFn)
        this.retry.try(tryFn)
        
        assert.isFalse(ifFn.called, 'called fail fn before exec')
        assert.isFalse(tryFn.called, 'called try fn before exec')
        
        this.retry.exec().then(() => {
            done(new Error('Should not be successful'))
        }).catch((err) => {
            assert.instanceOf(err, MaxRetryError, 'Error should be instance of MaxRetryError')
            assert.equal(err.retries, 2, 'did not retry the correct number of times')
            assert.instanceOf(err.innerError, Error, 'did not propogate inner error')
            assert.equal(err.innerError.message, rand, 'did not propogate inner error')
        }).then(done).catch(done)
    })
})

describe('Growth', function() {
    before(function() {
        this.retry = new Retry({
            initialDelay: 100,
            growthRate: 100,
            growth: 'super'
        })
    })
    it('Should throw error if unknown growth value is used', function(done) {
        let ifFn = sinon.stub()
        ifFn.returns(true)
        
        let tryFn = sinon.stub()
        let rand = Math.random()
        tryFn.throws(new Error(rand))
        
        this.retry.if(ifFn)
        this.retry.try(tryFn)
        
        assert.isFalse(ifFn.called, 'called fail fn before exec')
        assert.isFalse(tryFn.called, 'called try fn before exec')
        
        this.retry.exec().then(() => {
            done(new Error('Should not be successful'))
        }).catch((err) => {
            assert.instanceOf(err, RetryError, 'Error should be instance of RetryError')
            assert.include(err.message, 'Unknown growth algorithm', 'does not contain correct error message')
            assert.instanceOf(err.innerError, Error, 'did not propogate inner error')
            assert.equal(err.innerError.message, rand, 'did not propogate inner error')
        }).then(done).catch(done)
    })
})

describe('Error while incrementing delay', function() {
    before(function() {
        this.retry = new Retry({
            initialDelay: 100,
            growthRate: 100,
            growth: 'linear'
        })
        
        let incDelayStub = sinon.stub()
        incDelayStub.throws(new Error())
        this.restore = RetryLib.__set__('incDelay', incDelayStub)
    })
    
    it('Should throw RetryError if incDelay throws an error', function(done) {
        let ifFn = sinon.stub()
        ifFn.returns(true)
        
        let tryFn = sinon.stub()
        let rand = Math.random()
        tryFn.throws(new Error(rand))
        
        this.retry.if(ifFn)
        this.retry.try(tryFn)
        
        assert.isFalse(ifFn.called, 'called fail fn before exec')
        assert.isFalse(tryFn.called, 'called try fn before exec')
        
        this.retry.exec().then(() => {
            done(new Error('Should not be successful'))
        }).catch((err) => {
            assert.instanceOf(err, RetryError, 'Error should be instance of RetryError')
            assert.include(err.message, 'Error while incrementing delay')
            assert.instanceOf(err.innerError, Error, 'did not propogate inner error')
            assert.equal(err.innerError.message, rand, 'did not propogate inner error')
        }).then(done).catch(done)
    })
    
    after(function() {
        // restore incDelay function
        this.restore()
    })
})

describe('Invalid delay value', function() {
    before(function() {
        this.retry = new Retry({
            initialDelay: 100,
            growthRate: 100,
            growth: 'linear'
        })
        
        let incDelayStub = sinon.stub()
        incDelayStub.returns(undefined)
        this.restore = RetryLib.__set__('incDelay', incDelayStub)
    })
    
    it('Should throw RetryError if incDelay returns a non number', function(done) {
        let ifFn = sinon.stub()
        ifFn.returns(true)
        
        let tryFn = sinon.stub()
        let rand = Math.random()
        tryFn.throws(new Error(rand))
        
        this.retry.if(ifFn)
        this.retry.try(tryFn)
        
        assert.isFalse(ifFn.called, 'called fail fn before exec')
        assert.isFalse(tryFn.called, 'called try fn before exec')
        
        this.retry.exec().then(() => {
            done(new Error('Should not be successful'))
        }).catch((err) => {
            assert.instanceOf(err, RetryError, 'Error should be instance of RetryError')
            assert.include(err.message, 'Error retrying, expected delay to be a number')
            assert.instanceOf(err.innerError, Error, 'did not propogate inner error')
            assert.equal(err.innerError.message, rand, 'did not propogate inner error')
        }).then(done).catch(done)
    })
    
    after(function() {
        // restore incDelay function
        this.restore()
    })
})

describe('Linear growth function', function() {
    before(function() {
        this.linearGrowth = RetryLib.__get__('linearGrowth')
    })
    
    it('Should increase by 1000 on each increment', function() {
        let initialDelay = 1000
        let growthRate = 1000
        
        let delay = this.linearGrowth(initialDelay, growthRate)
        assert.equal(delay, 2000, 'did not grow linearly')
        
        delay = this.linearGrowth(delay, growthRate)
        assert.equal(delay, 3000, 'did not grow linearly')
        
        delay = this.linearGrowth(delay, growthRate)
        assert.equal(delay, 4000, 'did not grow linearly')
    })
})

describe('Exponential growth function', function() {
    before(function() {
        this.exponentialGrowth = RetryLib.__get__('exponentialGrowth')
    })
    
    it('Should double on each increment', function() {
        let initialDelay = 1000
        let growthRate = 2
        
        let delay = this.exponentialGrowth(initialDelay, growthRate)
        assert.equal(delay, 2000, 'did not grow exponentially')
        
        delay = this.exponentialGrowth(delay, growthRate)
        assert.equal(delay, 4000, 'did not grow exponentially')
        
        delay = this.exponentialGrowth(delay, growthRate)
        assert.equal(delay, 8000, 'did not grow exponentially')
    })
})

describe('Example use cases', function() {
    describe('Linear retry', function() {
        before(function() {
            this.retry = new Retry({
                initialDelay: 100,
                growthRate: 100
            })
        })
        
        it('Should have correct options', function() {
            assert.equal(this.retry.options.initialDelay, 100, '1 second initial delay')
            assert.equal(this.retry.options.growth, 'linear', 'linear growth')
            assert.equal(this.retry.options.growthRate, 100, '1 second growth rate')
            assert.equal(this.retry.options.maxRetry, 5, '5 retries, max')
        })
        
        sharedConditionalRetry()
    })
    
    describe('Exponential retry', function() {
        before(function() {
            this.retry = new Retry({
                growth: 'exponential',
                initialDelay: 100,
                growthRate: 2
            })
        })
        
        it('Should have correct option', function() {
            assert.equal(this.retry.options.initialDelay, 100, '1 second initial delay')
            assert.equal(this.retry.options.growth, 'exponential', 'exponential growth')
            assert.equal(this.retry.options.growthRate, 2, '2 times growth rate')
            assert.equal(this.retry.options.maxRetry, 5, '5 retries, max')
        })
        
        sharedConditionalRetry()
    })
})

function sharedConditionalRetry() {
    describe('Conditional retry', function() {
        before(function() {
            let ifFnImpl = function(err) {
                return (err instanceof Error && err.status === 403)
            }
            
            let ifFn = sinon.spy(ifFnImpl)
            this.retry.if(ifFn)
        })
        
        it('Retry on \'network error\'', function(done) {
            let tryFn = sinon.stub()
                        
            let authError = new Error()
            authError.status = 403
            let rand = Math.random()
            tryFn.onCall(0).throws(authError)
            tryFn.onCall(1).returns(rand)
            this.retry.try(tryFn)
            
            this.retry.exec().then((val) => {
                assert.equal(val, rand, 'incorrect resolve value')
            }).then(done).catch(done)
        })
        
        it('Don\'t retry on other error', function(done) {
            let tryFn = sinon.stub()
                        
            let otherError = new Error('some other error')
            let rand = Math.random()
            tryFn.onCall(0).throws(otherError)
            tryFn.onCall(1).returns(rand)
            this.retry.try(tryFn)
            
            this.retry.exec().then((val) => {
                done(new Error('Should not be successful'))
            }).catch((err) => {
                assert.instanceOf(err, Error, 'incorrect error type')
                assert.equal(err.message, 'some other error', 'incorrect error message')
            }).then(done).catch(done)
        })
    })
}

describe('Number.isInteger polyfill', function() {
    before(function() {
        this.isInt = Number.isInteger
        Number.isInteger = undefined
    })
    
    it('Should use the polyfill when Number.isInteger is undefined', function(done) {
        new Retry()
        new Retry({
            maxRetry: 1.2
        })
        new Retry({
            maxRetry: NaN
        })
        done()
    })
    
    after(function() {
        Number.isInteger = this.isInt
    })
})
