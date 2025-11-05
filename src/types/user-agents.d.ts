// Type declarations for user-agents package
declare module 'user-agents' {
  export default class UserAgent {
    constructor();
    toString(): string;
    data: {
      userAgent: string;
      deviceCategory: string;
      appName: string;
    };
  }
}
