import RetryError from './RetryError'

export default class IfFunctionError extends RetryError {
	constructor(message, innerError, ifFunctionError) {
		super(message, innerError)
        this.ifFunctionError = ifFunctionError
	}
}