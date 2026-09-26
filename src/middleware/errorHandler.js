import multer from 'multer';

export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  if (error.name === 'ValidationError') {
    const errors = Object.fromEntries(Object.entries(error.errors).map(([field, issue]) => {
      const message = issue.kind === 'required' ? 'This field is required.'
        : issue.kind === 'maxlength' ? 'This answer is too long.'
        : issue.kind === 'enum' ? 'Choose a valid option.'
        : issue.kind === 'regexp' ? 'Enter a valid email address.'
        : issue.name === 'CastError' ? 'Enter a valid value.'
        : 'Please check this field.';
      return [field, message];
    }));
    console.warn('Membership validation failed:', Object.keys(errors));
    return res.status(400).json({ success: false, message: 'Please correct the highlighted fields.', errors });
  }

  if (error instanceof multer.MulterError) {
    if (error.field === 'manuscript') {
      const message = error.code === 'LIMIT_FILE_SIZE' ? 'The manuscript PDF must be 50 MB or smaller.' : 'Upload one PDF manuscript only.';
      return res.status(400).json({ success: false, message, errors: { manuscript: message } });
    }
    const field = ['profilePicture', 'cv'].includes(error.field) ? error.field : undefined;
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'An uploaded file is too large. Use an image under 5 MB and a PDF under 10 MB.'
      : error.code === 'LIMIT_UNEXPECTED_FILE'
        ? 'Use a JPG, PNG, or WebP profile picture and a PDF CV.'
        : 'Please check your uploaded files and try again.';
    return res.status(400).json({ success: false, message, ...(field ? { errors: { [field]: message } } : {}) });
  }

  console.error(error);
  const status = error.status || 500;
  res.status(status).json({
    success: false,
    message: status >= 500 ? 'We could not save your application right now. Please try again later.'
      : status === 403 ? 'This request is not allowed.'
        : (process.env.NODE_ENV === 'production' ? 'Please check your request and try again.' : error.message),
  });
}
