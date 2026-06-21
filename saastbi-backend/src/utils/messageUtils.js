export const Messages = {
  // Server Issue Messages
  InternalServerError: "Something went wrong . Please try after some time.",
  CatchErrorMessage: "Access denied, Please contact administrator.",
  TokenNotGenerated: "Token not generated.",
  InvalidJwtToken: "Please provide valid token",
  TokenRequired: "Please provide auth token",
  SessionLogout:
    "Session expired. You have been logged out because your account was accessed from another device.",

  // Success Messages
  DataNotAvailable: "Data is not exist for given details", 
  FormValidationError: "Validation error.", 
  DataSaved: "Data saved successfully.",
  DataDeleted: "Data deleted successfully.",
  DataUpdated: "Data updated successfully.",
  DataFetched: "Data fetched successfully.",
  LoginSuccessful: "User login successful.",
  LogoutSuccessful: "User logout successful.",
  

  tenantAvailable:"This unique key is available",
  tenantNotAvailable:"This unique key is already taken",
  SendOtpSuccess: "Otp sent successfully.",
  OtpVerify: "OTP verified successfully.",
  UpdateProfile: "Profile updated successfully",
  // Error Messages
  InvalidCredentials: "Invalid email or password.",
  DataExists: "Access Denied: Please contact your administrator.",
  UnableToSaveData: "Unable to save data.",
  UnableToGetData: "Unable to fetch data.",
  UnableToUpdateData: "Unable to update data.",
  UnableToDeleteData: "Unable to delete data.",
  UnableToGetDataById: "Unable to get data by ID.",
  DataAlreadyExists: "Data already exists for given credentials.",
  BadResponse:
    "Provide valid values or you are not allowed to use the given values.",
  EmailExists: "Email already exists.",
  UserExists: "User already exists for the given credentials",
  UserNotExists: "User does not exist, please register first.",
  SendOtpFailed: "OTP not generated. Please try again.",
  ResendOtpFailed:
    "Resend OTP not allowed, please initiate the send OTP first.",
  VerifyOtpFailed: "Please initiate the send OTP first.",
  InvalidOtp: "Invalid Otp.",
  OtpAlreadyVerify: "OTP already verified.",
  Forbidden:"You are forbidden to access this resource",
  NotFound:"Requested URL not found",
  Unauthorized: "You are not allowed to access this module.",
  UrlNotExist: "The URL you entered is wrong. Please provide a valid URL.",
  InvalidId: "Please provide valid id",
  PasswordMismatch: "Password and confirmPassword do not match",
  OldPasswordMismatch: "Old Password do not match",
  WrongPassword: "Password not matching",
  OtpNotVerified: "Please verified otp first",

  OrganizationExists: "Organization already exist for the given name",
  ProjectNameAlreadyExist:
    "Project name already in used, try with anouther name",
  ProjectNotExist: "Project is not exist for given data",
  ProjectSetupDataNotExist: "Project setup data not exist for given data",
  PageNameExistForProject: "Page name is already exist for project",
  CategoryNameAlreadyExist: "Category already exist for the given name",
  ElementNameAlreadyExist: "Element already exist for the given name",
  ElementPropCategoryAlreadyExist: "Element already exist for the given name",
  PropAlreadyExist: "Prop already exist for the given type",
  ActionAlreadyExist: "Actions already exist for the given name",
  UnableToGenerateResponse: "Unable to generate response try after some time",
  InvalidQuery: "Unable to generate response please provide a valid query",
  QueriesNotAllowed: "This type of queries are not allowed",
  SummariesQueryError:
    "The question is not related to summary generation or query is not valid",
  ErrorOccured: "An error occured please try after some time.",
  AIResponseGenerated: "AI response generated successfully.",
  ToManyRequest:
    "Too many requests at the moment. We're processing a high volume of traffic—please try again shortly. Thank you for your patience!",
  ConfigFieldsMissing: "Please provide all configurations fields",
  InvalidDbOperation: "Please provide valid database operation type",

  IncompleteSmtpConfiguration: "Incomplete SMTP configuration.",
  EmailContentMissing:
    "Missing email content: to, subject, text or html required.",
  EmailIntentMissing: "Email intent not found in query",
  UnableToGenerateEmailContent:
    "Unable to generate an email content , please provide some more details",
  EmailSendingProcessStart: "We have initiated the email sending process.",
  DataBaseOperationSuccessfull: "Database operation completed successfully",
  RequiredFieldMissing:
    "The data you provided is missing some required fields. Please include all mandatory information and try again.",
  NotAllowedFieldsFound:
    "Some fields you included are not allowed. Please remove any disallowed fields and resend the data.",
  ProvideWhereCondition: "Condition is missing in question",
  ApiCallSuccessfull: "Api called successfully",
  InvitationSend: "Invite send successfully",
  UserRegisterSuccessfull: "User register successfully",
  InvitationNotExists: "Invitation not exists",
  InvitationAlreadyAccepted: "Invitation already accepted",
  InvitationCancled: "Invitation cancel due to multiple failed attempts",
  InvitationAlreadyUsed: "The invitation has already been used",
  InvalidInviteCode: "Invitation code is not matching",
  ChatInvalid: "This chat does not belong to user",
  ChatNotExistOrNotBelongsToUser: "Chat not exists or its not belongs to you",
  ChatNotExist: "Chat not exists",
  ProjectCreationInProgress:
    "Project creation in progress, It will be available when it completes",
  InvalidProjectType: "Please provide validd project type",
  InvalidDatabaseConfig: "Please provide valid database configuration",
  NoTablesInTheDb: "There are no tables present in the database",
  DashboardCreationInProgress:
    "Dashboard generation in progress, It will be available when it completes",
};

