const OTP_EXPIRES_IN_SECONDS = 300;
const OTP_EXPIRES_IN_LABEL = "5 minutos";
const OTP_LENGTH = 6;
const OTP_MAX_ATTEMPTS = 3;
// Sliding: each day of use pushes expiry 90 days out, so a restaurant tablet in daily use never signs out.
const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 90;

export { OTP_EXPIRES_IN_LABEL, OTP_EXPIRES_IN_SECONDS, OTP_LENGTH, OTP_MAX_ATTEMPTS, SESSION_EXPIRES_IN_SECONDS };
