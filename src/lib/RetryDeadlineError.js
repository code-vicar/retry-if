import RetryError from './RetryError'

export default class RetryDeadlineError extends RetryError {
    constructor(message, innerError, deadline) {
        super(message, innerError)
        this.deadline = deadline
    }
}
