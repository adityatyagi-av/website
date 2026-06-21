const ROLE_COMPLEMENTARITY = {
  FOUNDER: ["INVESTOR", "MENTOR", "PROFESSIONAL", "FREELANCER"],
  INVESTOR: ["FOUNDER", "VC_PARTNER"],
  MENTOR: ["FOUNDER", "STUDENT", "PROFESSIONAL"],
  VC_PARTNER: ["FOUNDER", "INVESTOR"],
  PROFESSIONAL: ["FOUNDER", "MENTOR"],
  FREELANCER: ["FOUNDER", "PROFESSIONAL"],
  STUDENT: ["MENTOR", "FOUNDER", "PROFESSIONAL"],
};

const arrayOverlap = (a = [], b = []) => {
  const setB = new Set(b.map((s) => s?.toLowerCase?.() ?? s));
  return a.filter((item) => setB.has(item?.toLowerCase?.() ?? item)).length;
};

const arrayComplement = (a = [], b = []) => {
  const setA = new Set(a.map((s) => s?.toLowerCase?.() ?? s));
  return b.filter((item) => !setA.has(item?.toLowerCase?.() ?? item)).length;
};

const normalize = (value, max) => Math.min(value / max, 1) * 100;

export const ScoringService = {
  computeCofounderScore: (viewer, candidate, viewerPref, candidatePref) => {
    const reasons = [];

    let skillComplementarity = 0;
    const viewerSkills = viewer.skills?.map((s) => s.skill?.name || s.name) || [];
    const candidateSkills = candidate.skills?.map((s) => s.skill?.name || s.name) || [];
    const complementCount = arrayComplement(viewerSkills, candidateSkills);
    const overlapCount = arrayOverlap(viewerSkills, candidateSkills);
    skillComplementarity = normalize(complementCount * 3 + overlapCount, 30);
    if (complementCount > 2) reasons.push(`${complementCount} complementary skills`);

    let sectorAlignment = 0;
    const viewerSectors = viewerPref?.sectors || [];
    const candidateSectors = candidatePref?.sectors || [];
    const sectorOverlap = arrayOverlap(viewerSectors, candidateSectors);
    sectorAlignment = normalize(sectorOverlap * 10, 30);
    if (sectorOverlap > 0) reasons.push(`Shared interest in ${viewerSectors.find((s) => candidateSectors.map((c) => c?.toLowerCase()).includes(s?.toLowerCase())) || "same sector"}`);

    let experienceCompat = 0;
    const viewerRoles = viewer.roles?.map((r) => r.roleType) || [];
    const candidateRoles = candidate.roles?.map((r) => r.roleType) || [];
    const roleComplement = viewerRoles.some((vr) =>
      candidateRoles.some((cr) => ROLE_COMPLEMENTARITY[vr]?.includes(cr))
    );
    if (roleComplement) {
      experienceCompat = 70;
      reasons.push("Complementary roles");
    } else if (viewerRoles.some((vr) => candidateRoles.includes(vr))) {
      experienceCompat = 40;
    }

    let locationCompat = 0;
    const viewerLoc = viewer.location;
    const candidateLoc = candidate.location;
    if (viewerPref?.remoteOk || candidatePref?.remoteOk) {
      locationCompat = 80;
    }
    if (viewerLoc?.city && candidateLoc?.city) {
      if (viewerLoc.city.toLowerCase() === candidateLoc.city.toLowerCase()) {
        locationCompat = 100;
        reasons.push(`Both in ${viewerLoc.city}`);
      } else if (viewerLoc.country?.toLowerCase() === candidateLoc.country?.toLowerCase()) {
        locationCompat = Math.max(locationCompat, 60);
      }
    }

    let commitmentAlign = 0;
    if (viewerPref?.commitment && candidatePref?.commitment) {
      commitmentAlign = viewerPref.commitment === candidatePref.commitment ? 100 : 40;
    } else {
      commitmentAlign = 50;
    }

    let socialProximity = 0;
    const mutuals = candidate._mutualCount || 0;
    if (mutuals > 0) {
      socialProximity = normalize(mutuals * 8, 50);
      reasons.push(`${mutuals} mutual connections`);
    }

    const score =
      skillComplementarity * 0.3 +
      sectorAlignment * 0.2 +
      experienceCompat * 0.15 +
      locationCompat * 0.15 +
      commitmentAlign * 0.1 +
      socialProximity * 0.1;

    return { score: Math.round(Math.min(score, 100)), reasons };
  },

  computePeopleMatchScore: (viewer, candidate) => {
    const reasons = [];

    let sharedInterests = 0;
    const viewerSkills = viewer.skills?.map((s) => s.skill?.name || s.name) || [];
    const candidateSkills = candidate.skills?.map((s) => s.skill?.name || s.name) || [];
    const skillOverlap = arrayOverlap(viewerSkills, candidateSkills);
    sharedInterests = normalize(skillOverlap * 8, 40);
    if (skillOverlap > 2) reasons.push(`${skillOverlap} shared skills`);

    let mutualScore = 0;
    const mutuals = candidate._mutualCount || 0;
    if (mutuals > 0) {
      mutualScore = normalize(mutuals * 5, 40);
      reasons.push(`${mutuals} mutual connections`);
    }

    let skillScore = 0;
    const complement = arrayComplement(viewerSkills, candidateSkills);
    skillScore = normalize(complement * 5, 30);

    let locationScore = 0;
    const vLoc = viewer.location;
    const cLoc = candidate.location;
    if (vLoc?.city && cLoc?.city && vLoc.city.toLowerCase() === cLoc.city.toLowerCase()) {
      locationScore = 100;
      reasons.push(`Based in ${vLoc.city}`);
    } else if (vLoc?.country && cLoc?.country && vLoc.country.toLowerCase() === cLoc.country.toLowerCase()) {
      locationScore = 50;
    }

    let roleRelevance = 0;
    const viewerRoles = viewer.roles?.map((r) => r.roleType) || [];
    const candidateRoles = candidate.roles?.map((r) => r.roleType) || [];
    const isComplementary = viewerRoles.some((vr) =>
      candidateRoles.some((cr) => ROLE_COMPLEMENTARITY[vr]?.includes(cr))
    );
    if (isComplementary) {
      roleRelevance = 80;
      reasons.push("Relevant role");
    }

    let activityScore = 0;
    if (candidate.roles?.some((r) => r.isVerified)) {
      activityScore += 40;
      reasons.push("Verified profile");
    }
    if (candidate.isPremium) activityScore += 20;
    if (candidate.lastActive) {
      const daysSince = (Date.now() - new Date(candidate.lastActive).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) activityScore += 40;
      else if (daysSince < 30) activityScore += 20;
    }

    const score =
      sharedInterests * 0.25 +
      mutualScore * 0.2 +
      skillScore * 0.2 +
      locationScore * 0.15 +
      roleRelevance * 0.1 +
      activityScore * 0.1;

    return { score: Math.round(Math.min(score, 100)), reasons };
  },

  computeIncubatorRelevanceScore: (viewer, incubator) => {
    const reasons = [];

    let sectorAlign = 0;
    const viewerSectors = [
      ...(viewer.cofounderPreference?.sectors || []),
      ...(viewer.skills?.map((s) => s.skill?.category).filter(Boolean) || []),
    ];
    if (incubator.sector && viewerSectors.length > 0) {
      const match = viewerSectors.some(
        (s) => s?.toLowerCase() === incubator.sector?.toLowerCase()
      );
      if (match) {
        sectorAlign = 100;
        reasons.push(`Aligned sector: ${incubator.sector}`);
      }
    }
    if (incubator.focusSectors?.length > 0 && viewerSectors.length > 0) {
      const overlap = arrayOverlap(viewerSectors, incubator.focusSectors);
      sectorAlign = Math.max(sectorAlign, normalize(overlap * 15, 30));
    }

    let locationMatch = 0;
    const vLoc = viewer.location;
    if (vLoc?.city && incubator.headquarters) {
      if (incubator.headquarters.toLowerCase().includes(vLoc.city.toLowerCase())) {
        locationMatch = 100;
        reasons.push(`Located in ${vLoc.city}`);
      } else if (vLoc.country && incubator.headquarters.toLowerCase().includes(vLoc.country.toLowerCase())) {
        locationMatch = 40;
      }
    }

    let programAvail = 0;
    const programCount = incubator._count?.programs || incubator.tenant?.programs?.length || 0;
    if (programCount > 0) {
      programAvail = normalize(programCount * 20, 60);
      reasons.push(`${programCount} active programs`);
    }

    let socialSignal = 0;
    const followers = incubator.followerCount || 0;
    socialSignal = normalize(Math.log10(followers + 1) * 15, 50);
    if (followers > 100) reasons.push(`${followers} followers`);

    const score =
      sectorAlign * 0.4 +
      locationMatch * 0.25 +
      programAvail * 0.2 +
      socialSignal * 0.15;

    return { score: Math.round(Math.min(score, 100)), reasons };
  },

  computeStartupRelevanceScore: (viewer, startup) => {
    const reasons = [];

    let sectorAlign = 0;
    const viewerSectors = [
      ...(viewer.cofounderPreference?.sectors || []),
      ...(viewer.skills?.map((s) => s.skill?.category).filter(Boolean) || []),
    ];
    if (startup.sector && viewerSectors.length > 0) {
      const match = viewerSectors.some(
        (s) => s?.toLowerCase() === startup.sector?.toLowerCase()
      );
      if (match) {
        sectorAlign = 100;
        reasons.push(`In ${startup.sector}`);
      }
    }

    let stageRelevance = 0;
    const stageOrder = ["IDEA", "MVP", "SEED", "PRE_SEED", "SERIES_A", "SERIES_B", "SERIES_C", "GROWTH"];
    if (startup.stage) {
      const idx = stageOrder.indexOf(startup.stage);
      stageRelevance = idx >= 0 ? normalize((idx + 1) * 10, 50) : 30;
      reasons.push(`${startup.stage} stage`);
    }

    let hiringMatch = 0;
    if (startup.isHiring) {
      hiringMatch = 60;
      if (startup.openPositions > 0) {
        hiringMatch = normalize(startup.openPositions * 20, 80);
        reasons.push(`${startup.openPositions} open positions`);
      }
    }

    let socialSignal = 0;
    const followers = startup.followerCount || 0;
    socialSignal = normalize(Math.log10(followers + 1) * 15, 50);
    if (startup._mutualMemberCount > 0) {
      socialSignal += 30;
      reasons.push(`${startup._mutualMemberCount} connections in team`);
    }

    const score =
      sectorAlign * 0.35 +
      stageRelevance * 0.25 +
      hiringMatch * 0.2 +
      socialSignal * 0.2;

    return { score: Math.round(Math.min(score, 100)), reasons };
  },
};
