import RetryError from './RetryError'

export default class RetryDeadlineError extends RetryError {
    constructor(message, deadline) {
        super(message)
        this.deadline = deadline
    }
}
