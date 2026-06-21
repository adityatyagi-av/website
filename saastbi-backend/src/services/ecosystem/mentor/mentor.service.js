import { BrowseService } from "./browse.service.js";
import { SessionService } from "./session.service.js";
import { PackageService } from "./package.service.js";

export const EcosystemMentorService = {
  ...BrowseService,
  ...SessionService,
  ...PackageService,
};
