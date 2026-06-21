import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { ApiError } from "../utils/ApiError.js";

const sendMail = async (email, subject, templatePath, templateData) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.email_user,
        pass: process.env.email_password,
      },
    });

    transporter.verify((error, success) => {
      if (error) {
        throw error;
      }
    });

    const html = await ejs.renderFile(path.resolve(templatePath), templateData);

    const mailOptions = {
      from: process.env.email_user,
      to: email,
      subject: subject,
      html: html,
    };

    return transporter.sendMail(mailOptions);
  } catch (error) {
    throw new ApiError(406, "Error sending mail", error);
  }
};

export default sendMail;
