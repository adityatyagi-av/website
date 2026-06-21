import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import { EcosystemProfileController } from "../../../controllers/ecosystem/profile/profile.controller.js";

const EcosystemProfileRouter = Router();

EcosystemProfileRouter.get(
  "/profile/get-profile",
  authenticate,
  EcosystemProfileController.getProfile
);

EcosystemProfileRouter.patch(
  "/profile/update-basic-details",
  authenticate,
  EcosystemProfileController.updateBasicDetails
);

//skill routers

EcosystemProfileRouter.get(
  "/profile/skills/search",
  authenticate,
  EcosystemProfileController.searchSkills
);

EcosystemProfileRouter.get(
  "/profile/skills/categories",
  authenticate,
  EcosystemProfileController.getSkillCategories
);

EcosystemProfileRouter.post(
  "/profile/skills",
  authenticate,
  EcosystemProfileController.addSkill
);

EcosystemProfileRouter.patch(
  "/profile/skills/:id",
  authenticate,
  EcosystemProfileController.updateSkill
);

EcosystemProfileRouter.delete(
  "/profile/skills/:id",
  authenticate,
  EcosystemProfileController.deleteSkill
);

//education routers

EcosystemProfileRouter.get(
  "/profile/search-institutions",
  authenticate,
  EcosystemProfileController.searchInstitutionPages
);

EcosystemProfileRouter.post(
  "/profile/educations",
  authenticate,
  EcosystemProfileController.addEducation
);

EcosystemProfileRouter.patch(
  "/profile/educations/:id",
  authenticate,
  EcosystemProfileController.updateEducation
);

EcosystemProfileRouter.delete(
  "/profile/educations/:id",
  authenticate,
  EcosystemProfileController.deleteEducation
);

// experience api's
EcosystemProfileRouter.get(
  "/profile/search-companies",
  authenticate,
  EcosystemProfileController.searchCompanyPages
);

EcosystemProfileRouter.post(
  "/profile/experiences",
  authenticate,
  EcosystemProfileController.addExperience
);

EcosystemProfileRouter.patch(
  "/profile/experiences/:id",
  authenticate,
  EcosystemProfileController.updateExperience
);

EcosystemProfileRouter.delete(
  "/profile/experiences/:id",
  authenticate,
  EcosystemProfileController.deleteExperience
);

//certificate api's

EcosystemProfileRouter.get(
  "/profile/search-certification-orgs",
  authenticate,
  EcosystemProfileController.searchCertificationPages
);

EcosystemProfileRouter.post(
  "/profile/certifications",
  authenticate,
  EcosystemProfileController.addCertification
);

EcosystemProfileRouter.patch(
  "/profile/certifications/:id",
  authenticate,
  EcosystemProfileController.updateCertification
);

EcosystemProfileRouter.delete(
  "/profile/certifications/:id",
  authenticate,
  EcosystemProfileController.deleteCertification
);

// project api's
EcosystemProfileRouter.post(
  "/profile/projects",
  authenticate,
  EcosystemProfileController.addProject
);

EcosystemProfileRouter.patch(
  "/profile/projects/:id",
  authenticate,
  EcosystemProfileController.updateProject
);

EcosystemProfileRouter.delete(
  "/profile/projects/:id",
  authenticate,
  EcosystemProfileController.deleteProject
);

//role based api's

EcosystemProfileRouter.patch(
  "/profile/student",
  authenticate,
  EcosystemProfileController.updateStudentProfile
);

EcosystemProfileRouter.patch(
  "/profile/professional",
  authenticate,
  EcosystemProfileController.updateProfessionalProfile
);

EcosystemProfileRouter.get(
  "/profile/visitors",
  authenticate,
  EcosystemProfileController.getMyProfileVisitors
);

EcosystemProfileRouter.get(
  "/profile/insights",
  authenticate,
  EcosystemProfileController.profileInsights
);

EcosystemProfileRouter.patch(
  "/profile/role-visibility",
  authenticate,
  EcosystemProfileController.updateRoleVisibility
);

export default EcosystemProfileRouter;
