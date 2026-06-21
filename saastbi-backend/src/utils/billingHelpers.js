import db from "../db/db.js";

const RENEWAL_REMINDER_DAYS = {
  MONTHLY: 7,
  YEARLY: 20,
  WEEKLY: 2,
};

export async function computePaymentStatus({ tenantId, planPrice, planType, daysUntilNextBilling, razorpayDetails }) {
  const unpaidInvoice = await db.invoice.findFirst({
    where: { tenantId, status: { in: ["UNPAID", "OVERDUE"] } },
    orderBy: { issuedDate: "desc" },
  });

  if (unpaidInvoice) {
    return {
      isPaymentDue: true,
      pendingAmount: unpaidInvoice.amount,
      paymentDueReason: unpaidInvoice.status === "OVERDUE" ? "Overdue invoice" : "Unpaid invoice",
      isRenewalApproaching: false,
      renewalReminderText: null,
    };
  }

  const rzpStatus = razorpayDetails?.status;
  if (rzpStatus === "halted" || rzpStatus === "paused") {
    return {
      isPaymentDue: true,
      pendingAmount: planPrice,
      paymentDueReason: rzpStatus === "halted"
        ? "Subscription halted - manual payment required"
        : "Subscription paused - manual payment required",
      isRenewalApproaching: false,
      renewalReminderText: null,
    };
  }

  if (daysUntilNextBilling !== null && daysUntilNextBilling === 0) {
    return {
      isPaymentDue: true,
      pendingAmount: planPrice,
      paymentDueReason: "Billing cycle expired",
      isRenewalApproaching: false,
      renewalReminderText: null,
    };
  }

  const reminderThreshold = RENEWAL_REMINDER_DAYS[planType] ?? 7;
  const isRenewalApproaching = daysUntilNextBilling !== null && daysUntilNextBilling <= reminderThreshold && daysUntilNextBilling > 0;

  return {
    isPaymentDue: false,
    pendingAmount: null,
    paymentDueReason: null,
    isRenewalApproaching,
    renewalReminderText: isRenewalApproaching
      ? `Your plan renews in ${daysUntilNextBilling} day${daysUntilNextBilling === 1 ? "" : "s"}`
      : null,
  };
}
