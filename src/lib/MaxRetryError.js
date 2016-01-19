import RetryError from './RetryError'

export default class MaxRetryError extends RetryError {
	constructor(message, innerError, retries) {
		super(message, innerError)
        this.retries = retries
	}
}