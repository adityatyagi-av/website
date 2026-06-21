export const allowedRoles = ["STUDENT","PROFESSIONAL","FREELANCER","FOUNDER","MENTOR","INVESTOR","VC_PARTNER","INCUBATION_PERSON"];

export const PAGE_TYPE_ALLOWED_FIELDS = {
  STARTUP: [
    "stage",
    "mission",
    "vision",
    "elevatorPitch",
    "targetMarket",
  ],

  COMPANY: [
    "revenueRange",
    "keyServices",
  ],

  VC_FIRM: [
    "checkSizeMin",
    "checkSizeMax",
    "investmentStages",
    "focusSectors",
    "fundVintage",
    "portfolioCount",
    "notableInvestments",
    "investmentThesis",
    "aum",
  ],

  INSTITUTION: [
    "institutionType",
    "studentCount",
    "facultyCount",
    "accreditations",
    "researchAreas",
  ],

  ORGANIZATION: [
    "membershipSize",
    "keyInitiatives",
  ],

  INCUBATION: [
    "mission",
    "vision",
    "elevatorPitch",
    "targetMarket",
  ],

  COMMUNITY: [
    "mission",
    "vision",
    "membershipSize",
    "keyInitiatives",
  ],

  UNIVERSITY: [
    "institutionType",
    "studentCount",
    "facultyCount",
    "accreditations",
    "researchAreas",
  ],

  COLLEGE: [
    "institutionType",
    "studentCount",
    "facultyCount",
    "accreditations",
    "researchAreas",
  ],

  SCHOOL: [
    "institutionType",
    "studentCount",
    "facultyCount",
    "accreditations",
    "researchAreas",
  ],

  OTHERS: [
    "othersCategory",
    "membershipSize",
    "keyInitiatives",
    "mission",
    "vision",
  ],
};
