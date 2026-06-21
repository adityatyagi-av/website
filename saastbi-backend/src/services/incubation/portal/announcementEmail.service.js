import ejs from "ejs";
import path from "path";
import { getTransporter } from "../../../config/sendAnnouncemntMail.js";
import { ApiError } from "../../../utils/ApiError.js";

export const announcementEmailService = {
  /**
   * Send announcement emails to multiple recipients
   * @param {Array} emails - Array of email addresses
   * @param {Object} announcementData - Announcement details
   * @returns {Promise<Object>} - Email sending results
   */
  async sendAnnouncementEmails(emails, announcementData) {
    try {
      if (!Array.isArray(emails) || emails.length === 0) {
        console.warn("No email recipients provided");
        return {
          total: 0,
          successful: 0,
          failed: 0,
          results: [],
        };
      }

      const {
        title,
        content,
        createdBy,
        programName,
        scope,
        tenantName,
        date,
      } = announcementData;

      // Validate required fields
      if (!title || !content) {
        throw new ApiError(400, "Title and content are required");
      }

      // Prepare template data
      const templateData = {
        title,
        content,
        createdBy: createdBy || "System Administrator",
        programName: programName || null,
        scope: scope || "GENERAL",
        tenantName: tenantName || "Incubation Portal",
        date:
          date ||
          new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
      };

      // Render email template once
      const templatePath = path.resolve(
        process.cwd(),
        "src/mails/announcement.ejs"
      );
      const html = await ejs.renderFile(templatePath, templateData);

      const emailSubject = `📢 New Announcement: ${title}`;
      const transporter = getTransporter();

      // Remove duplicate emails and filter invalid ones
      const uniqueEmails = [
        ...new Set(emails.filter((email) => this.isValidEmail(email))),
      ];

      if (uniqueEmails.length === 0) {
        console.warn("No valid email addresses found");
        return {
          total: 0,
          successful: 0,
          failed: 0,
          results: [],
        };
      }

      console.log(
        `Preparing to send announcement to ${uniqueEmails.length} recipients`
      );

      // Send emails in batches
      const results = await this.sendInBatches(
        transporter,
        uniqueEmails,
        emailSubject,
        html,
        tenantName,
        50 // batch size
      );

      const successful = results.filter((r) => r.status === "success").length;
      const failed = results.filter((r) => r.status === "failed").length;

      console.log(
        `Announcement emails: ${successful} sent, ${failed} failed out of ${uniqueEmails.length}`
      );

      return {
        total: uniqueEmails.length,
        successful,
        failed,
        results,
      };
    } catch (error) {
      console.error("Error in sendAnnouncementEmails:", error);
      throw new ApiError(500, "Failed to send announcement emails", error);
    }
  },

  /**
   * Send emails in batches to avoid rate limits
   */
  async sendInBatches(
    transporter,
    emails,
    subject,
    html,
    tenantName,
    batchSize = 50
  ) {
    const results = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      console.log(
        `Sending batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          emails.length / batchSize
        )}`
      );

      const batchPromises = batch.map(async (email) => {
        try {
          const mailOptions = {
            from: {
              name: tenantName || "Incubation Portal",
              address: process.env.email_user,
            },
            to: email,
            subject: subject,
            html: html,
          };

          await transporter.sendMail(mailOptions);
          return { email, status: "success" };
        } catch (error) {
          console.error(`Failed to send email to ${email}:`, error.message);
          return {
            email,
            status: "failed",
            error: error.message,
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(
        ...batchResults.map((r) =>
          r.status === "fulfilled" ? r.value : r.reason
        )
      );

      // Delay between batches to respect rate limits (1 second)
      if (i + batchSize < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  },

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email && typeof email === "string" && emailRegex.test(email.trim());
  },

  /**
   * Extract emails from different data structures
   */
  extractEmails(data, type) {
    const emails = [];

    switch (type) {
      case "STARTUPS":
        if (Array.isArray(data)) {
          data.forEach((item) => {
            const email = item.startup?.email || item.email;
            if (email) emails.push(email);
          });
        }
        break;

      case "MANAGERS":
        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (item.email) emails.push(item.email);
          });
        }
        break;

      case "PROGRAM":
        if (data?.programManagers) {
          data.programManagers.forEach((manager) => {
            if (manager.email) emails.push(manager.email);
          });
        }
        if (data?.startupAssociations) {
          data.startupAssociations.forEach((association) => {
            if (association.startup?.email) {
              emails.push(association.startup.email);
            }
          });
        }
        break;

      default:
        console.warn(`Unknown email extraction type: ${type}`);
    }

    return emails;
  },
};
