# Retry-if
[![Build Status](https://travis-ci.org/code-vicar/retry-if.svg?branch=master)](https://travis-ci.org/code-vicar/retry-if)
[![Coverage Status](https://coveralls.io/repos/github/code-vicar/retry-if/badge.svg?branch=master)](https://coveralls.io/github/code-vicar/retry-if?branch=master)
[![npm version](https://badge.fury.io/js/retry-if.svg)](https://badge.fury.io/js/retry-if)
## Conditional function retry with backoff

This library facilitates the process of re-executing
a function under certain error conditions.

A common use case is to retry an API request that returned
an error due to rate limiting.

The backoff delay is configurable and may be linear or exponential

## Flow

With default settings

on exec -> 0 seconds

first retry -> 1 second later

second retry -> 2 seconds later

...

fifth retry -> 5 seconds later

use the 'exec' function to start the retry chain, it returns a promise

if the 'try' function hasn't been successful by the fifth retry then the promise will reject
with an instance of MaxRetryError.

if the 'try' function succeeds at some point during the chain then the promise will resolve with
the return value of the 'try' function

The 'if' function is used to control the conditions under which a retry will happen.
It receives any error/rejection in the 'try' function and should return/resolve a boolean.
Returning true will indicate that a retry should occur, returning false will stop the retry
chain and propagate the error to the catch block of the exec promise chain

### Error handling

All retry-if library errors inherit from RetryError and have an 'innerError' property that holds
the original error thrown in the 'try' function.

When the 'if' function returns false the original error is propagated
to the exec catch block

When an unhandled error/rejection occurs in the 'if' function
it will propagate to the exec catch block as an instance of IfFunctionError

When a retry chain reaches the max number of retries an instance of MaxRetryError
is propagated to the exec catch block

If a deadline is given and the retry chain reaches the deadline an instance of RetryDeadlineError
is propagated to the exec catch block

If an unknown growth option is set, an instance of RetryError will
be propagated to the exec catch block

## Browser/node compatability

This module should work with the following targets:

  - node:
    - 8+
  - browsers:
    - last 2 versions
    - ie11

## Example usage

```
npm install retry-if
```

```javascript
import Retry from 'retry-if'

let MockApi = {
    limit: true
    get: function(path) {
        return new Promise((res, rej) => {
            if (path !== 'videos') {
                return rej(new Error('blew up'))
            }
            if (MockApi.limit) {
                MockApi.limit = false
                return rej(new Error('Limiting'))
            }
            return res([1,2,3,4])
        })
    }
}

let retry = new Retry()

retry.if((err) => {
    return (err instanceof Error && err.message === 'Limiting')
})

retry.try(function() { // fails and will not retry because error is not 'Limiting'
    return MockApi.get('something')
}).exec().then(() => {
    // not executed
}).catch((err) => {
    console.log(err) // will be the 'blew up' error from Mock API
})

retry.try(function() { // fails but will retry after delay because error is 'Limiting'
    return MockApi.get('videos')
}).exec().then((val) => {
    console.log(val) // [1,2,3,4]
}).catch((err) => {
    // not executed
})
```

For ES5 you'll need to use require
```javascript
var RetryError = require('retry-if').RetryError
var Retry = require('retry-if').default
```

## Options

```javascript
import Retry from 'retry-if'

let retry = new Retry(options)
```

### Where options is an object with the following properties

    baseRetryDelay : Number

    growthRate     : Number

    growth         : (linear|exponential)

    maxRetry       : Integer

    deadline       : Moment|ISO String|Number

    firstTryDelay  : Number

### The defaults are

    baseRetryDelay : 1000 // ms

    growthRate     : 1000 // ms

    growth         : linear

    maxRetry       : 5

    deadline       : no default

    firstTryDelay  : no default

When growth is linear, the value of growthRate is a number of milliseconds to linearly increase on each try

When growth is exponential, the value of growthRate is the multiplier to apply on each try

---------

### exponential example

    baseRetryDelay : 1000 // ms

    growthRate     : 2 // times

    growth         : exponential

    maxRetry       : 5

This example will re-try the function a maximum of 5 times (for a total of 6 invocations including the initial try)

First call will happen immediately, followed by a re-try after 1 second, then additional retries will occur after 2 seconds, 4 seconds, 8 seconds, etc...

---------

### deadline example

    baseRetryDelay : 1000 // ms

    growthRate     : 0 // ms

    growth         : linear

    maxRetry       : 100

    deadline       : moment().add(30, 's') // moment

or

    deadline       : '2016-05-03T17:00:00+08:00' // ISO string

or

    deadline       : 3000 // ms

This example will re-try the function a maximum of 100 times **or** until the deadline is reached

First call will happen immediately, followed by continuous retries after 1 second delays (no growth)

This will continue until 100 retries, or until the deadline is reached

---------

### first try delay example

    firstTryDelay  : 1000 // ms

This example uses the default options with an additional delay before the first try.

First call will happen after 1 second, followed by a retry after 1 second and subsequent retries inceasing by 1 second each time (2, 3, 4) until 5 retries have been reached
