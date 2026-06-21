

export function computePostScore({ post, context }) {
  const engagementScore = calculateEngagementScore(post);
  const recencyScore = calculateRecencyScore(post.createdAt);
  const relationshipScore = calculateRelationshipScore(post, context);
  const qualityScore = calculateQualityScore(post);
  const interactionScore = calculateUserInteractionScore(post, context);
  const ecosystemScore = calculateEcosystemScore(post, context);

  return (
    engagementScore * 0.25 +
    recencyScore * 0.20 +
    relationshipScore * 0.20 +
    qualityScore * 0.15 +
    interactionScore * 0.10 +
    ecosystemScore * 0.10
  );
}

export function computeTrendingScore(post, hoursWindow = 24) {
  const engagementVelocity = calculateEngagementVelocity(post, hoursWindow);
  const viralityScore = calculateViralityScore(post);
  const recencyBoost = calculateRecencyBoost(post.createdAt, hoursWindow);
  const ecosystemRelevance = calculateEcosystemRelevance(post);

  return (
    engagementVelocity * 0.40 +
    viralityScore * 0.30 +
    recencyBoost * 0.20 +
    ecosystemRelevance * 0.10
  );
}

export function computeDiscoverScore(post) {
  const authorPopularity = calculateAuthorPopularity(post);
  const contentQuality = calculateQualityScore(post);
  const diversityScore = calculateDiversityScore(post);
  const ecosystemRelevance = calculateEcosystemRelevance(post);

  return (
    authorPopularity * 0.30 +
    contentQuality * 0.30 +
    ecosystemRelevance * 0.25 +
    diversityScore * 0.15
  );
}

// ============================================================================
// ENGAGEMENT SCORING
// ============================================================================

function calculateEngagementScore(post) {
  const likes = post.likeCount || 0;
  const comments = post.commentCount || 0;
  const shares = post.shareCount || 0;
  const views = post.viewCount || 0;

  // Weighted engagement
  const rawScore = likes * 1 + comments * 4 + shares * 6 + views * 0.015;

  // Apply logarithmic scaling to prevent viral posts from dominating
  return Math.log10(rawScore + 1) * 12;
}

function calculateEngagementVelocity(post, hoursWindow) {
  const totalEngagement =
    (post.likeCount || 0) +
    (post.commentCount || 0) * 2.5 +
    (post.shareCount || 0) * 4;

  const hoursOld = Math.max(
    (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60),
    0.1
  );

  // Engagements per hour
  const velocity = totalEngagement / hoursOld;

  // Apply scaling
  return Math.log10(velocity + 1) * 18;
}

function calculateViralityScore(post) {
  const shares = post.shareCount || 0;
  const views = Math.max(post.viewCount || 1, 1);
  const comments = post.commentCount || 0;

  // Share rate
  const shareRate = (shares / views) * 100;

  // Comment engagement
  const commentRate = (comments / views) * 100;

  // Viral coefficient
  const viralCoefficient = shareRate * 3 + commentRate;

  // Bonus for absolute numbers
  const absoluteBonus = Math.log10((shares || 0) + 1) * 5;

  return viralCoefficient + absoluteBonus;
}

// ============================================================================
// RECENCY SCORING
// ============================================================================

function calculateRecencyScore(createdAt) {
  const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

  // Different decay for different time windows
  if (hoursAgo < 1) {
    return 50; // Very fresh
  } else if (hoursAgo < 6) {
    return 45 - hoursAgo * 2; // Slow decay
  } else if (hoursAgo < 24) {
    return 35 - hoursAgo * 1; // Medium decay
  } else if (hoursAgo < 72) {
    return 20 - hoursAgo * 0.2; // Faster decay
  } else {
    return Math.max(5 - hoursAgo * 0.05, 0); // Much faster decay
  }
}

function calculateRecencyBoost(createdAt, hoursWindow) {
  const hoursOld =
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

  if (hoursOld <= hoursWindow) {
    // Exponential boost for very recent content
    const recencyRatio = 1 - hoursOld / hoursWindow;
    return Math.pow(recencyRatio, 0.7) * 25;
  }

  return 0;
}

// ============================================================================
// RELATIONSHIP SCORING
// ============================================================================

function calculateRelationshipScore(post, context) {
  if (!context) return 5;

  let score = 0;

  // Following relationship
  if (context.isFollowed) {
    score += 25;
  }

  // Connection relationship (stronger than following)
  if (context.isConnected) {
    score += 15;
  }

  // Interaction history with this author
  if (context.userInteractions) {
    const { likes, comments, shares } = context.userInteractions;

    const hasLikedAuthor = likes.some((l) => l.postId && post.authorId);
    const hasCommentedOnAuthor = comments.some((c) => c.postId && post.authorId);
    const hasSharedAuthor = shares.some((s) => s.postId && post.authorId);

    if (hasLikedAuthor) score += 5;
    if (hasCommentedOnAuthor) score += 8;
    if (hasSharedAuthor) score += 10;
  }

  // Boost for startup ecosystem relationships
  if (context.socialGraph) {
    // If from user's startup
    if (post.page?.id && context.socialGraph.startupIds?.includes(post.page.id)) {
      score += 20;
    }

    // If from followed pages
    if (post.pageId && context.socialGraph.pageIds?.includes(post.pageId)) {
      score += 15;
    }
  }

  return Math.min(score, 50);
}

// ============================================================================
// QUALITY SCORING
// ============================================================================

function calculateQualityScore(post) {
  let score = 0;

  // Media quality indicators
  if (post.media && post.media.length > 0) {
    score += 12;
    // Bonus for multiple high-quality media
    score += Math.min(post.media.length - 1, 4) * 3;

    // Image quality bonus
    const highQualityImages = post.media.filter(
      (m) => m.mediaType === "IMAGE" && m.width > 1000
    );
    score += highQualityImages.length * 2;
  }

  // Hashtags (organized content)
  if (post.hashtags && post.hashtags.length > 0) {
    score += 6;
    // Bonus for popular hashtags
    const popularHashtags = post.hashtags.filter(
      (h) => h.hashtag.postCount > 100
    );
    score += popularHashtags.length * 2;
  }

  // Content length (medium-length posts perform better)
  if (post.content) {
    const length = post.content.length;
    if (length >= 100 && length <= 600) {
      score += 10;
    } else if (length > 600 && length <= 1200) {
      score += 7;
    } else if (length > 1200 && length <= 3000) {
      score += 5;
    }
  }

  // Content type bonuses
  switch (post.postType) {
    case "POLL":
      score += 8; // Interactive
      break;
    case "ARTICLE":
      score += 10; // Long-form content
      break;
    case "VIDEO":
      score += 9; // Rich media
      break;
    case "LINK":
      score += 6; // Curated content
      break;
  }

  // Link preview quality
  if (post.linkPreview) {
    score += 7;
  }

  // Mentions (networking indicator)
  if (post.mentions && post.mentions.length > 0) {
    score += Math.min(post.mentions.length * 2, 8);
  }

  return Math.min(score, 50);
}

// ============================================================================
// INTERACTION SCORING
// ============================================================================

function calculateUserInteractionScore(post, context) {
  if (!context || !context.userInteractions) return 0;

  const { preferredHashtags } = context.userInteractions;
  let score = 0;

  // Hashtag affinity
  if (post.hashtags && preferredHashtags && preferredHashtags.length > 0) {
    const postHashtags = post.hashtags.map((h) => h.hashtag.name);
    const matchingHashtags = postHashtags.filter((tag) =>
      preferredHashtags.includes(tag)
    );
    score += matchingHashtags.length * 4;
  }

  // Author affinity (from past interactions)
  if (context.userInteractions.likes) {
    const authorLikes = context.userInteractions.likes.filter(
      (l) => l.authorId === post.authorId
    );
    score += Math.min(authorLikes.length * 0.5, 8);
  }

  return Math.min(score, 15);
}

// ============================================================================
// ECOSYSTEM SCORING (Startup-specific)
// ============================================================================

function calculateEcosystemScore(post, context) {
  let score = 0;

  // Author role boost
  if (post.author?.roles) {
    const primaryRole = post.author.roles.find((r) => r.isPrimary);
    if (primaryRole) {
      const roleBoosts = {
        FOUNDER: 12,
        INVESTOR: 10,
        VC_PARTNER: 10,
        MENTOR: 9,
        PROFESSIONAL: 5,
        FREELANCER: 4,
        STUDENT: 3,
      };
      score += roleBoosts[primaryRole.roleType] || 0;
    }
  }

  // Page type boost (startup ecosystem)
  if (post.page) {
    const pageBoosts = {
      STARTUP: 15,
      VC_FIRM: 12,
      INSTITUTION: 8,
      COMPANY: 6,
      UNIVERSITY: 5,
    };
    score += pageBoosts[post.page.type] || 0;

    // Stage-based boost for startups
    if (post.page.type === "STARTUP" && post.page.stage) {
      const stageBoosts = {
        SEED: 3,
        SERIES_A: 4,
        SERIES_B: 5,
        SERIES_C: 4,
      };
      score += stageBoosts[post.page.stage] || 2;
    }

    // Sector relevance
    if (context?.preferences?.interests?.includes(post.page.sector)) {
      score += 8;
    }
  }

  return Math.min(score, 30);
}

function calculateEcosystemRelevance(post) {
  let score = 0;

  // Startup ecosystem keywords
  const ecosystemKeywords = [
    "startup",
    "funding",
    "investor",
    "venture",
    "pitch",
    "founder",
    "scale",
    "growth",
    "innovation",
    "disruption",
    "mvp",
    "product market fit",
    "unicorn",
    "exit",
    "acquisition",
    "ipo",
  ];

  if (post.content) {
    const contentLower = post.content.toLowerCase();
    const matchCount = ecosystemKeywords.filter((keyword) =>
      contentLower.includes(keyword)
    ).length;
    score += Math.min(matchCount * 3, 15);
  }

  // Hashtag relevance
  const ecosystemHashtags = [
    "startup",
    "entrepreneurship",
    "founder",
    "vc",
    "investing",
    "innovation",
    "tech",
    "saas",
  ];

  if (post.hashtags) {
    const hashtagNames = post.hashtags.map((h) => h.hashtag.name.toLowerCase());
    const matchCount = hashtagNames.filter((tag) =>
      ecosystemHashtags.includes(tag)
    ).length;
    score += Math.min(matchCount * 5, 20);
  }

  return score;
}

// ============================================================================
// DIVERSITY & POPULARITY
// ============================================================================

function calculateAuthorPopularity(post) {
  if (!post.author || !post.author._count) return 5;

  const followers = post.author._count.followers || 0;

  // Logarithmic scaling with startup ecosystem adjustment
  let popularityScore = Math.log10(followers + 1) * 10;

  // Boost for ecosystem roles
  if (post.author.roles) {
    const hasEcosystemRole = post.author.roles.some((r) =>
      ["FOUNDER", "INVESTOR", "VC_PARTNER", "MENTOR"].includes(r.roleType)
    );
    if (hasEcosystemRole) {
      popularityScore *= 1.3;
    }
  }

  return Math.min(popularityScore, 40);
}

function calculateDiversityScore(post) {
  let score = 10; // Base diversity score

  // Content type diversity
  const diverseTypes = ["ARTICLE", "LINK", "VIDEO", "POLL"];
  if (diverseTypes.includes(post.postType)) {
    score += 8;
  }

  // Hashtag diversity
  if (post.hashtags && post.hashtags.length > 0) {
    score += Math.min(post.hashtags.length * 2, 12);
  }

  // Media diversity
  if (post.media && post.media.length > 0) {
    const uniqueMediaTypes = new Set(post.media.map((m) => m.mediaType));
    score += uniqueMediaTypes.size * 3;
  }

  return Math.min(score, 25);
}

// ============================================================================
// ANALYTICS & PREDICTIONS
// ============================================================================

export function calculateEngagementRate(post) {
  const totalEngagements =
    (post.likeCount || 0) +
    (post.commentCount || 0) +
    (post.shareCount || 0);

  const views = Math.max(post.viewCount || 1, 1);

  return (totalEngagements / views) * 100;
}

export function predictPostPerformance(post) {
  const qualityScore = calculateQualityScore(post);
  const engagementRate = calculateEngagementRate(post);
  const recencyScore = calculateRecencyScore(post.createdAt);
  const ecosystemRelevance = calculateEcosystemRelevance(post);

  const performanceScore =
    qualityScore * 0.30 +
    engagementRate * 0.30 +
    recencyScore * 0.25 +
    ecosystemRelevance * 0.15;

  if (performanceScore > 50) return "VIRAL";
  if (performanceScore > 35) return "HIGH";
  if (performanceScore > 20) return "MEDIUM";
  return "LOW";
}

export function calculateUserEngagementLevel(userInteractions) {
  if (!userInteractions) return "LURKER";

  const { likes, comments, shares, bookmarks } = userInteractions;

  const totalInteractions =
    likes.length + comments.length * 2 + shares.length * 3;

  if (totalInteractions > 100) return "SUPER_ACTIVE";
  if (totalInteractions > 50) return "ACTIVE";
  if (totalInteractions > 20) return "MODERATE";
  if (totalInteractions > 5) return "CASUAL";
  return "LURKER";
}