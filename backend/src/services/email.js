
const nodemailer = require("nodemailer");
const path = require("path");
const dotenv = require("dotenv");

const envPath = path.resolve(__dirname, "../../.env");
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.error("Failed to load .env:", envResult.error.message);
}

const mailUser = process.env.MAIL_USER || process.env.EMAIL_USER;
const clientId = process.env.CLIENT_ID?.trim();
const clientSecret = process.env.CLIENT_SECRET?.trim();
const refreshToken = process.env.REFRESH_TOKEN?.trim();

if (!mailUser || !clientId || !clientSecret || !refreshToken) {
  throw new Error("Missing Gmail OAuth environment variables.");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: mailUser,
    clientId,
    clientSecret,
    refreshToken,
  },
});

async function verifyTransporter() {
  try {
    await transporter.verify();
    console.log("Gmail transporter verified successfully.");
  } catch (error) {
    console.error("Gmail transporter verification failed:", error.message);
  }
}

verifyTransporter();

async function sendEmail(to, subject, text) {
  const info = await transporter.sendMail({
    from: mailUser,
    to,
    subject,
    text,
  });

  console.log("Email sent:", info.messageId);
  return info;
}

module.exports = sendEmail;
