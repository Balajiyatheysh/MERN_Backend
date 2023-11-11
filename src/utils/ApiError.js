class ApiError extends Error{
  constructor (
    statusCode, 
    message="something went wrong",
    errors=[],
    stack=""
  ){
    super(message);
    this.statusCode = statusCode;
    this.data = null; //know about this.data from nodejs assignment
    this.message = message;
    this.success = false; //bcz we are handeling Apierror and not response
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export {ApiError}

//here we are oerriding the Error class so we are customizing the how ApiErrors are been handeled