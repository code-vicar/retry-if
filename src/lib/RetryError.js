import ExtendableError from 'es6-error'

export default class RetryError extends ExtendableError {
	constructor(message, innerError) {
		super(message)
        this.innerError = innerError
	}
}