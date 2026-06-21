import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { ApiError } from "../utils/ApiError.js";

// Create transporter once and reuse it
let transporter = null;

export const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.email_user,
        pass: process.env.email_password,
      },
      pool: true, // Use connection pooling
      maxConnections: 5, // Limit concurrent connections
      maxMessages: 100, // Messages per connection
      rateDelta: 1000, // Minimum time between messages
      rateLimit: 5, // Max messages per rateDelta
    });

    // Verify once when transporter is created
    transporter.verify((error) => {
      if (error) {
        console.error("Email transporter verification failed:", error);
      } else {
        console.log("✅ Email transporter ready");
      }
    });
  }
  return transporter;
};

// Single email function (for individual use cases)
const sendMail = async (email, subject, templatePath, templateData) => {
  try {
    const html = await ejs.renderFile(path.resolve(templatePath), templateData);

    const mailOptions = {
      from: {
        name: templateData.tenantName || "Incubation Portal",
        address: process.env.email_user,
      },
      to: email,
      subject: subject,
      html: html,
    };

    return getTransporter().sendMail(mailOptions);
  } catch (error) {
    throw new ApiError(406, `Error sending mail to ${email}`, error);
  }
};

export default sendMail;