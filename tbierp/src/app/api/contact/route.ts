import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const TEAM_EMAILS = [
  "chauhanvansh279@gmail.com",
  "support@opernova.com",
  "team@opernova.com",
];

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: Request) {
  try {
    const { name, email, phone, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 },
      );
    }

    // Email to EcoSync team
    await transporter.sendMail({
      from: `"EcoSync by Opernova" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: TEAM_EMAILS.join(", "),
      subject: `New Contact Inquiry from ${name}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background: linear-gradient(135deg, #0a0a4a 0%, #1a1a6e 50%, #0e0e5c 100%); padding: 36px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px;">ECOSYNC — NEW INQUIRY</h1>
          </div>
          <div style="padding: 36px 28px;">
            <p style="color: #1D1D1D; font-size: 16px; margin: 0 0 6px;">Hi Team,</p>
            <p style="color: #1D1D1D; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
              A new contact form submission has been received via the <strong>EcoSync</strong> website.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 14px 12px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px; width: 110px;">Name</td>
                <td style="padding: 14px 12px; border-bottom: 1px solid #f3f4f6; color: #1D1D1D; font-size: 15px; font-weight: 600;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 14px 12px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px;">Email</td>
                <td style="padding: 14px 12px; border-bottom: 1px solid #f3f4f6; color: #1D1D1D; font-size: 15px; font-weight: 600;">
                  <a href="mailto:${email}" style="color: #076EFF; text-decoration: none;">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 14px 12px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px;">Phone</td>
                <td style="padding: 14px 12px; border-bottom: 1px solid #f3f4f6; color: #1D1D1D; font-size: 15px; font-weight: 600;">${phone || "Not provided"}</td>
              </tr>
            </table>
            <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px;">Message</p>
            <div style="background: #f0f4ff; border-radius: 12px; padding: 20px; color: #1D1D1D; font-size: 15px; line-height: 1.7; border-left: 4px solid #076EFF;">
              ${message.replace(/\n/g, "<br>")}
            </div>
            <div style="margin-top: 28px;">
              <a href="mailto:${email}" style="display: inline-block; background: linear-gradient(90deg, #076EFF, #20BDFF); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 15px; font-weight: 600;">Reply to ${name}</a>
            </div>
            <p style="color: #9ca3af; font-size: 13px; margin: 28px 0 0;">
              Warm regards,<br>
              <strong style="color: #1D1D1D;">Team ECOSYNC</strong>
            </p>
          </div>
          <div style="background: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #f3f4f6;">
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 6px;">
              Need help? Contact us at <a href="mailto:support@ecosync.io" style="color: #076EFF; text-decoration: none;">support@ecosync.io</a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} OPERNOVA TECHNOLOGIES LLP. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });

    // Thank you email to sender
    await transporter.sendMail({
      from: `"EcoSync by Opernova" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: `Thank you for contacting EcoSync, ${name}!`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background: linear-gradient(135deg, #0a0a4a 0%, #1a1a6e 50%, #0e0e5c 100%); padding: 36px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px;">ECOSYNC</h1>
            <p style="color: rgba(255,255,255,0.6); margin: 6px 0 0; font-size: 13px; letter-spacing: 0.5px;">by Opernova</p>
          </div>
          <div style="padding: 36px 28px;">
            <p style="color: #1D1D1D; font-size: 16px; margin: 0 0 6px;">
              Hi <strong>${name}</strong>,
            </p>
            <p style="color: #1D1D1D; font-size: 15px; line-height: 1.7; margin: 0 0 8px;">
              Thank you for reaching out to <strong>EcoSync</strong>!
            </p>
            <p style="color: #4a4a4a; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
              We've received your message and our team is reviewing it. You can expect a response within <strong>24–48 hours</strong>.
            </p>
            <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px;">Here's a copy of your message:</p>
            <div style="background: linear-gradient(135deg, #4a00e0, #076EFF, #20BDFF, #72e5c2); border-radius: 12px; padding: 3px;">
              <div style="background: #f8faff; border-radius: 10px; padding: 20px;">
                <p style="color: #1D1D1D; font-size: 15px; line-height: 1.7; margin: 0;">
                  ${message.replace(/\n/g, "<br>")}
                </p>
              </div>
            </div>
            <p style="color: #6b7280; font-size: 13px; margin: 20px 0 0;">This inquiry will be reviewed shortly.</p>
            <p style="color: #1D1D1D; font-size: 14px; line-height: 1.7; margin: 8px 0 0;">
              If you didn't submit this form, please ignore this email.
            </p>
            <div style="text-align: left; margin-top: 28px;">
              <a href="https://ecosync.io" style="display: inline-block; background: linear-gradient(90deg, #076EFF, #20BDFF); color: white; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-size: 15px; font-weight: 600;">Go to Portal</a>
            </div>
            <p style="color: #9ca3af; font-size: 14px; margin: 32px 0 0; line-height: 1.6;">
              Warm regards,<br>
              <strong style="color: #1D1D1D;">Team ECOSYNC</strong>
            </p>
          </div>
          <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #f3f4f6;">
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px;">
              Need help? Contact us at <a href="mailto:support@ecosync.io" style="color: #076EFF; text-decoration: none;">support@ecosync.io</a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} OPERNOVA TECHNOLOGIES LLP. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 },
    );
  }
}
