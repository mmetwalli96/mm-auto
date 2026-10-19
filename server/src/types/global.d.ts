import 'http';

declare module 'http' {
  interface IncomingMessage {
    rawBody?: Buffer;
  }
  interface IncomingHttpHeaders {
    'mailtrap-signature': string;
  }
}