class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class LoginError extends CustomError { }
export class ScrapingError extends CustomError { }
export class ProcessingError extends CustomError { }
export class PdfError extends CustomError { }
