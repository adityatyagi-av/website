import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { EarningsService } from "../../services/mentor/earnings.service.js";

export const EarningsController = {
  getSummary: asyncHandler(async (req, res) => {
    const summary = await EarningsService.getSummary(req.user.id);
    return apiResponse.sendSuccess(res, summary);
  }),

  getHistory: asyncHandler(async (req, res) => {
    const result = await EarningsService.getHistory(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getPending: asyncHandler(async (req, res) => {
    const pending = await EarningsService.getPending(req.user.id);
    return apiResponse.sendSuccess(res, pending);
  }),

  withdraw: asyncHandler(async (req, res) => {
    const { amount, payoutAccountId } = req.body;
    const withdrawal = await EarningsService.withdraw(req.user.id, amount, payoutAccountId);
    return apiResponse.sendSuccess(res, withdrawal, "Withdrawal request submitted", 201);
  }),

  getWithdrawals: asyncHandler(async (req, res) => {
    const result = await EarningsService.getWithdrawals(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  addPayoutAccount: asyncHandler(async (req, res) => {
    const account = await EarningsService.addPayoutAccount(req.user.id, req.body);
    return apiResponse.sendSuccess(res, account, "Payout account added", 201);
  }),

  getPayoutAccounts: asyncHandler(async (req, res) => {
    const accounts = await EarningsService.getPayoutAccounts(req.user.id);
    return apiResponse.sendSuccess(res, accounts);
  }),

  deletePayoutAccount: asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    await EarningsService.deletePayoutAccount(req.user.id, accountId);
    return apiResponse.sendSuccess(res, null, "Payout account removed");
  }),

  getEarningsAnalytics: asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const analytics = await EarningsService.getEarningsAnalytics(req.user.id, startDate, endDate);
    return apiResponse.sendSuccess(res, analytics);
  }),
};
