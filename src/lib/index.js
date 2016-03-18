import Promise from 'bluebird'
import _ from 'lodash'

import RetryError from './RetryError'
import MaxRetryError from './MaxRetryError'
import IfFunctionError from './IfFunctionError'

export { RetryError, MaxRetryError, IfFunctionError }

// options
// baseRetryDelay = 1 second
// growthRate     = 1 second
// growth         = linear
// maxRetry       = 5
// deadline       = no default
// firstTryDelay  = no default
export default class Retry {
    constructor(options = {}) {
        this.options = options

        // alias initialDelay to baseRetryDelay to keep backwards compatibility
        if (typeof this.options.initialDelay === 'number' && !Number.isNaN(this.options.initialDelay)) {
            this.options.baseRetryDelay = this.options.initialDelay
        }

        if (typeof this.options.baseRetryDelay !== 'number' || Number.isNaN(this.options.baseRetryDelay)) {
            this.options.baseRetryDelay = 1000 // ms
        }

        if (typeof this.options.growthRate !== 'number' || Number.isNaN(this.options.growthRate)) {
            this.options.growthRate = 1000 // ms
        }

        if (!isInteger(this.options.maxRetry)) {
            this.options.maxRetry = 5
        }

        this.options.growth = this.options.growth || 'linear'

        this.makeAttempt = makeAttempt
        this.handleError = handleError

        this.ifFn = () => {
            return true
        }
    }

    try(fn) {
        this.tryFn = fn
        return this
    }

    if(fn) {
        this.ifFn = fn
        return this
    }

    exec() {
        if (typeof this.tryFn !== 'function') {
            return Promise.reject(new RetryError('No try function was provided'))
        }

        let context = {
            options: _.clone(this.options, true),
            state: {
                attempt: 0,
                delay: this.options.baseRetryDelay
            },
            tryFn: this.tryFn,
            ifFn: this.ifFn,
            makeAttempt: makeAttempt,
            handleError: handleError
        }

        return makeAttempt.call(context)
    }
}

function makeAttempt() {
    return Promise.try(() => {
        return Promise.resolve(this.tryFn())
    })
    .catch((err) => {
        return this.handleError(err)
    })
}

function handleError(error) {
    if (this.state.attempt >= this.options.maxRetry) {
        // max tries reached.  wrap tryFn error and bubble it up
        return Promise.reject(new MaxRetryError('Reached max number of retries', error, this.state.attempt))
    }

    this.state.attempt++

    return Promise.try(() => {
        return Promise.resolve(this.ifFn(error))
    })
    .catch((ifFnErrorInner) => {
        // exception/rejection in 'if' function execution
        // wrap up both errors (ifFn and tryFn) and bubble them up
        return Promise.reject(new IfFunctionError('', error, ifFnErrorInner))
    })
    .then((retry) => {
        if (!retry) {
            // re-reject the tryFn error
            return Promise.reject(error)
        }
        return new Promise((res, rej) => {
            if (typeof this.state.delay !== 'number' || Number.isNaN(this.state.delay)) {
                return rej(new RetryError(`Error retrying, expected delay to be a number, instead got ${this.state.delay}`, error))
            }
            setTimeout(() => {
                try {
                    this.state.delay = incDelay(this.state.delay, this.options.growth, this.options.growthRate)
                    res(this.makeAttempt())
                } catch (e) {
                    rej(new RetryError(`Error while incrementing delay, ${e}`, error))
                }
            }, this.state.delay)
        })
    })
}

function incDelay(delay, growth, growthRate) {
    if (growth === 'linear') {
        return linearGrowth(delay, growthRate)
    }

    if (growth === 'exponential') {
        return exponentialGrowth(delay, growthRate)
    }

    throw new Error(`Unknown growth algorithm, ${growth}`)
}

function linearGrowth(delay, growthRate) {
    return delay + growthRate
}

function exponentialGrowth(delay, growthRate) {
    return delay * growthRate
}

function isInteger(value) {
    if (Number.isInteger) {
        return Number.isInteger(value)
    }

    return (typeof value === "number" && isFinite(value) && Math.floor(value) === value)
}
