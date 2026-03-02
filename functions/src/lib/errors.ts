import { HttpsError } from 'firebase-functions/v2/https';

export const invalidArgument = (message: string): never => {
  throw new HttpsError('invalid-argument', message);
};

export const permissionDenied = (message: string): never => {
  throw new HttpsError('permission-denied', message);
};

export const notFound = (message: string): never => {
  throw new HttpsError('not-found', message);
};

export const failedPrecondition = (message: string): never => {
  throw new HttpsError('failed-precondition', message);
};

export const internalError = (message: string): never => {
  throw new HttpsError('internal', message);
};

export const mapError = (error: unknown): never => {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw new HttpsError('internal', error.message);
  }
  throw new HttpsError('internal', 'Unexpected error');
};
