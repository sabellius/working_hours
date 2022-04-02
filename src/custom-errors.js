class CustomError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class LoginError extends CustomError { }
class ScrapingError extends CustomError { }
class ProcessingError extends CustomError { }
class PdfError extends CustomError { }

module.exports = {
  LoginError,
  ScrapingError,
  ProcessingError,
  PdfError,
}
