export const calculateRefundPercentage = (hoursUntilSession) => {
  if (hoursUntilSession >= 24) return 100;
  if (hoursUntilSession >= 12) return 75;
  if (hoursUntilSession >= 4) return 50;
  return 0;
};

export const calculateRefundAmount = (originalAmount, hoursUntilSession) => {
  const percentage = calculateRefundPercentage(hoursUntilSession);
  return Math.round((originalAmount * percentage) / 100);
};

export const calculatePlatformFee = (amount, source = "DIRECT") => {
  const feePercent = source === "INCUBATOR" ? 8 : 10;
  return {
    feePercent,
    feeAmount: Math.round((amount * feePercent) / 100),
    netAmount: Math.round(amount - (amount * feePercent) / 100),
  };
};

export const calculateSessionPrice = ({
  basePrice,
  paymentModel,
  incubatorSharePercent = 0,
  isPackageSession = false,
}) => {
  if (isPackageSession) {
    return { menteePayment: 0, incubatorPayment: 0, source: "PACKAGE" };
  }

  switch (paymentModel) {
    case "INCUBATOR_PAYS":
      return { menteePayment: 0, incubatorPayment: basePrice, source: "INCUBATOR" };
    case "STARTUP_PAYS":
      return { menteePayment: basePrice, incubatorPayment: 0, source: "DIRECT" };
    case "SUBSIDIZED":
      const incubatorShare = Math.round((basePrice * incubatorSharePercent) / 100);
      return {
        menteePayment: basePrice - incubatorShare,
        incubatorPayment: incubatorShare,
        source: "SUBSIDIZED",
      };
    case "RETAINER":
      return { menteePayment: 0, incubatorPayment: 0, source: "RETAINER" };
    case "FREE":
      return { menteePayment: 0, incubatorPayment: 0, source: "FREE" };
    default:
      return { menteePayment: basePrice, incubatorPayment: 0, source: "DIRECT" };
  }
};

export const calculateExtensionPrice = (sessionPrice, extensionMinutes, sessionDuration) => {
  const pricePerMinute = sessionPrice / sessionDuration;
  return Math.round(pricePerMinute * extensionMinutes);
};

export const getHoursUntilSession = (sessionStartTime) => {
  const now = new Date();
  const sessionTime = new Date(sessionStartTime);
  const diffMs = sessionTime - now;
  return diffMs / (1000 * 60 * 60);
};
