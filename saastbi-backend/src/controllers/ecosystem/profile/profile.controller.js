import { EcosystemProfileService } from "../../../services/ecosystem/profile/profile.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

export const EcosystemProfileController = {
  getProfile: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await EcosystemProfileService.getProfile(userId);
    return apiResponse.sendSuccess(
      res,
      result,
      "Profile fetched successfully."
    );
  }),
  updateBasicDetails: asyncHandler(async (req, res) => {
    const {
      headline,
      bio,
      dateOfBirth,
      gender,
      profilePhoto,
      coverImage,
      location,
      socialLinks,
    } = req.body;
    const userId = req.user.id;

    const result = await EcosystemProfileService.updateBasicDetails({
      userId,
      headline,
      bio,
      dateOfBirth,
      gender,
      profilePhoto,
      coverImage,
      location,
      socialLinks,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Profile Details updated successfully."
    );
  }),

  searchSkills: asyncHandler(async (req, res) => {
    const { search, page, limit } = req.query;

    const result = await EcosystemProfileService.searchSkills({
      search,
      page,
      limit,
    });

    return apiResponse.sendSuccess(res, result, "Skills fetched successfully.");
  }),

  getSkillCategories: asyncHandler(async (req, res) => {
    const result = await EcosystemProfileService.getSkillCategories();
    return apiResponse.sendSuccess(
      res,
      result,
      "Skill categories fetched successfully."
    );
  }),
  addSkill: asyncHandler(async (req, res) => {
    console.log("REQ IS ",req.body)
    const result = await EcosystemProfileService.addSkill({
      userId: req.user.id,
      ...req.body,
    });
    return apiResponse.sendSuccess(res, result, "Skill added successfully");
  }),

  updateSkill: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await EcosystemProfileService.updateSkill({
      userId: req.user.id,
      skillId: id,
      ...req.body,
    });
    return apiResponse.sendSuccess(res, result, "Skill updated successfully");
  }),

  deleteSkill: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await EcosystemProfileService.deleteSkill({
      userId: req.user.id,
      skillId: id,
    });
    return apiResponse.sendSuccess(res, result, "Skill deleted successfully");
  }),

  //controller for education

  searchInstitutionPages: asyncHandler(async (req, res) => {
    const { search = "", page = 1, limit = 10 } = req.query;

    const result = await EcosystemProfileService.searchInstitutionPages({
      search,
      page: Number(page),
      limit: Number(limit),
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Institution pages fetched successfully"
    );
  }),

  addEducation: asyncHandler(async (req, res) => {
    const result = await EcosystemProfileService.addEducation({
      userId: req.user.id,
      ...req.body,
    });

    return apiResponse.sendSuccess(res, result, "Education added successfully");
  }),

  updateEducation: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await EcosystemProfileService.updateEducation({
      userId: req.user.id,
      educationId: id,
      ...req.body,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Education updated successfully"
    );
  }),

  deleteEducation: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await EcosystemProfileService.deleteEducation({
      userId: req.user.id,
      educationId: id,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Education deleted successfully"
    );
  }),

  //company's api
  searchCompanyPages: asyncHandler(async (req, res) => {
    const { search = "", page = 1, limit = 10 } = req.query;
    const result = await EcosystemProfileService.searchCompanyPages({
      search,
      page: Number(page),
      limit: Number(limit),
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Companies fetched successfully"
    );
  }),

  addExperience: asyncHandler(async (req, res) => {
    const result = await EcosystemProfileService.addExperience({
      userId: req.user.id,
      ...req.body,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Experience added successfully"
    );
  }),

  updateExperience: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await EcosystemProfileService.updateExperience({
      userId: req.user.id,
      experienceId: id,
      ...req.body,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Experience updated successfully"
    );
  }),

  deleteExperience: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await EcosystemProfileService.deleteExperience({
      userId: req.user.id,
      experienceId: id,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Experience deleted successfully"
    );
  }),

  //certificate controller
  searchCertificationPages: asyncHandler(async (req, res) => {
    const { search = "", page = 1, limit = 10 } = req.query;

    const result = await EcosystemProfileService.searchCertificationPages({
      search,
      page: Number(page),
      limit: Number(limit),
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Issuing organizations fetched successfully"
    );
  }),

  addCertification: asyncHandler(async (req, res) => {
    const result = await EcosystemProfileService.addCertification({
      userId: req.user.id,
      ...req.body,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Certification added successfully"
    );
  }),

  updateCertification: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await EcosystemProfileService.updateCertification({
      userId: req.user.id,
      certificationId: id,
      ...req.body,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Certification updated successfully"
    );
  }),

  deleteCertification: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await EcosystemProfileService.deleteCertification({
      userId: req.user.id,
      certificationId: id,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Certification deleted successfully"
    );
  }),

  //project controllers
  addProject: asyncHandler(async (req, res) => {
    const result = await EcosystemProfileService.addProject({
      userId: req.user.id,
      ...req.body,
    });
    return apiResponse.sendSuccess(res, result, "Project added successfully");
  }),

  updateProject: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await EcosystemProfileService.updateProject({
      userId: req.user.id,
      projectId: id,
      ...req.body,
    });
    return apiResponse.sendSuccess(res, result, "Project updated successfully");
  }),

  deleteProject: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await EcosystemProfileService.deleteProject({
      userId: req.user.id,
      projectId: id,
    });
    return apiResponse.sendSuccess(res, result, "Project deleted successfully");
  }),
  updateStudentProfile: asyncHandler(async (req, res) => {
    const result = await EcosystemProfileService.upsertStudentProfile({
      userId: req.user.id,
      ...req.body,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Student profile updated successfully."
    );
  }),

  updateProfessionalProfile: asyncHandler(async (req, res) => {
    const result = await EcosystemProfileService.upsertProfessionalProfile({
      userId: req.user.id,
      ...req.body,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Professional profile updated successfully."
    );
  }),
  getMyProfileVisitors: asyncHandler(async (req, res) => {
    const result =
      await EcosystemProfileService.getMyProfileVisitors({
        userId: req.user.id,
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 10),
      });

    return apiResponse.sendSuccess(
      res,
      result,
      "Profile visitors fetched successfully"
    );
  }),
  profileInsights: asyncHandler(async (req, res) => {
    const result =
      await EcosystemProfileService.profileInsights({
        userId: req.user.id,
      });

    return apiResponse.sendSuccess(
      res,
      result,
      "Profile insights fetched successfully"
    );
  }),

  updateRoleVisibility: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { roleType, isPublic } = req.body;
  
    const result =
      await EcosystemProfileService.updateRoleVisibility({
        userId,
        roleType,
        isPublic,
      });
  
    return apiResponse.sendSuccess(
      res,
      result,
      "Role visibility updated successfully"
    );
  }),
};
