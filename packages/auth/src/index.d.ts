export type AuthDatabase = unknown;
export type AuthSchema = Record<string, unknown>;
export type AuthCookieMode = "same-site" | "cross-site";
export type EmailOtpType = "sign-in" | "email-verification" | "forget-password" | "change-email";

export interface EmailWorkerBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface SendEmailOtpPayload {
  email: string;
  otp: string;
  type: EmailOtpType;
}

export type EmailOtpSender = (payload: SendEmailOtpPayload) => Promise<void>;

export interface CreateEmailWorkerOtpSenderOptions {
  expiresInLabel?: string;
  worker: EmailWorkerBinding;
}

export interface CreateAuthOptions {
  db: AuthDatabase;
  schema?: AuthSchema;
  secret: string;
  baseURL?: string;
  trustedOrigins?: string[];
  emailOtpSender: EmailOtpSender;
  cookieMode?: AuthCookieMode;
}

export interface Auth {
  handler(request: Request): Response | Promise<Response>;
  api: {
    getSession(context: { headers: Headers }): Promise<Session | null>;
  };
}

export interface Session {
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

export declare function createEmailWorkerOtpSender(options: CreateEmailWorkerOtpSenderOptions): EmailOtpSender;

export declare function createAuth(options: CreateAuthOptions): Auth;

export declare const OTP_EXPIRES_IN_SECONDS: number;
export declare const OTP_EXPIRES_IN_LABEL: string;
export declare const OTP_LENGTH: number;
export declare const OTP_MAX_ATTEMPTS: number;
export declare const SESSION_EXPIRES_IN_SECONDS: number;
