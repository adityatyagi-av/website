import crypto from "crypto";
import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { redisClient, getRedis, setRedis, deleteRedis } from "../../../config/redisClient.js";

const VALID_FIELD_TYPES = [
  "STRING", "TEXT", "NUMBER", "BOOLEAN", "DATE",
  "IMAGE_URL", "DOCUMENT_URL", "URL", "EMAIL", "PHONE",
  "SELECT", "MULTI_SELECT",
];

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
}

function generateApiKey() {
  return `repo_${crypto.randomBytes(32).toString("hex")}`;
}

function validateSchemaDefinition(schema) {
  if (!Array.isArray(schema) || schema.length === 0) {
    throw new ApiError(400, "Schema must be a non-empty array of field definitions");
  }

  const fieldNames = new Set();

  for (let i = 0; i < schema.length; i++) {
    const field = schema[i];

    if (!field.name || typeof field.name !== "string") {
      throw new ApiError(400, `Field at index ${i} must have a valid name`);
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.name)) {
      throw new ApiError(400, `Field name "${field.name}" must start with a letter and contain only letters, numbers, and underscores`);
    }

    if (fieldNames.has(field.name)) {
      throw new ApiError(400, `Duplicate field name: "${field.name}"`);
    }
    fieldNames.add(field.name);

    if (!field.type || !VALID_FIELD_TYPES.includes(field.type)) {
      throw new ApiError(400, `Field "${field.name}" has invalid type. Must be one of: ${VALID_FIELD_TYPES.join(", ")}`);
    }

    if ((field.type === "SELECT" || field.type === "MULTI_SELECT") && (!Array.isArray(field.options) || field.options.length === 0)) {
      throw new ApiError(400, `Field "${field.name}" of type ${field.type} must have a non-empty options array`);
    }

    if (field.type === "NUMBER") {
      if (field.min !== undefined && typeof field.min !== "number") {
        throw new ApiError(400, `Field "${field.name}" min must be a number`);
      }
      if (field.max !== undefined && typeof field.max !== "number") {
        throw new ApiError(400, `Field "${field.name}" max must be a number`);
      }
      if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
        throw new ApiError(400, `Field "${field.name}" min cannot be greater than max`);
      }
    }

    if ((field.type === "STRING" || field.type === "TEXT") && field.maxLength !== undefined) {
      if (typeof field.maxLength !== "number" || field.maxLength <= 0) {
        throw new ApiError(400, `Field "${field.name}" maxLength must be a positive number`);
      }
    }
  }

  return schema.map((field) => ({
    name: field.name,
    type: field.type,
    required: Boolean(field.required),
    ...(field.maxLength !== undefined && { maxLength: field.maxLength }),
    ...(field.min !== undefined && { min: field.min }),
    ...(field.max !== undefined && { max: field.max }),
    ...(field.options && { options: field.options }),
    ...(field.description && { description: field.description }),
  }));
}

function validateItemData(data, schema) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new ApiError(400, "Item data must be a non-null object");
  }

  const errors = [];
  const cleanedData = {};

  for (const field of schema) {
    const value = data[field.name];

    if (value === undefined || value === null || value === "") {
      if (field.required) {
        errors.push(`Field "${field.name}" is required`);
      }
      continue;
    }

    switch (field.type) {
      case "STRING":
      case "TEXT": {
        if (typeof value !== "string") {
          errors.push(`Field "${field.name}" must be a string`);
          break;
        }
        if (field.maxLength && value.length > field.maxLength) {
          errors.push(`Field "${field.name}" exceeds max length of ${field.maxLength}`);
          break;
        }
        cleanedData[field.name] = value;
        break;
      }
      case "NUMBER": {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(`Field "${field.name}" must be a valid number`);
          break;
        }
        if (field.min !== undefined && num < field.min) {
          errors.push(`Field "${field.name}" must be at least ${field.min}`);
          break;
        }
        if (field.max !== undefined && num > field.max) {
          errors.push(`Field "${field.name}" must be at most ${field.max}`);
          break;
        }
        cleanedData[field.name] = num;
        break;
      }
      case "BOOLEAN": {
        if (typeof value !== "boolean") {
          errors.push(`Field "${field.name}" must be a boolean`);
          break;
        }
        cleanedData[field.name] = value;
        break;
      }
      case "DATE": {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push(`Field "${field.name}" must be a valid date`);
          break;
        }
        cleanedData[field.name] = date.toISOString();
        break;
      }
      case "IMAGE_URL":
      case "DOCUMENT_URL":
      case "URL": {
        if (typeof value !== "string") {
          errors.push(`Field "${field.name}" must be a string URL`);
          break;
        }
        try {
          new URL(value);
        } catch {
          errors.push(`Field "${field.name}" must be a valid URL`);
          break;
        }
        cleanedData[field.name] = value;
        break;
      }
      case "EMAIL": {
        if (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(`Field "${field.name}" must be a valid email`);
          break;
        }
        cleanedData[field.name] = value;
        break;
      }
      case "PHONE": {
        if (typeof value !== "string") {
          errors.push(`Field "${field.name}" must be a string`);
          break;
        }
        cleanedData[field.name] = value;
        break;
      }
      case "SELECT": {
        if (typeof value !== "string" || !field.options.includes(value)) {
          errors.push(`Field "${field.name}" must be one of: ${field.options.join(", ")}`);
          break;
        }
        cleanedData[field.name] = value;
        break;
      }
      case "MULTI_SELECT": {
        if (!Array.isArray(value)) {
          errors.push(`Field "${field.name}" must be an array`);
          break;
        }
        const invalid = value.filter((v) => !field.options.includes(v));
        if (invalid.length > 0) {
          errors.push(`Field "${field.name}" has invalid options: ${invalid.join(", ")}`);
          break;
        }
        cleanedData[field.name] = value;
        break;
      }
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join("; "));
  }

  return cleanedData;
}

async function invalidateRepoCache(apiKey) {
  try {
    await deleteRedis(`repo:${apiKey}`);
    await deleteRedis(`repo_rl_config:${apiKey}`);

    let cursor = "0";
    const pattern = `repo_items:${apiKey}:*`;
    do {
      const result = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = result.cursor.toString();
      if (result.keys.length > 0) {
        await redisClient.del(result.keys);
      }
    } while (cursor !== "0");
  } catch (e) {
    console.error("Cache invalidation error:", e);
  }
}

export const publicRepositoryService = {
  createRepository: async ({ tenantId, creatorId, data }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!creatorId) throw new ApiError(401, "creatorId required");

    const { name, description, schema, isRateLimited, rateLimitPerMinute } = data;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new ApiError(400, "Repository name is required");
    }

    const validatedSchema = validateSchemaDefinition(schema);
    let slug = generateSlug(name);

    const existingSlug = await db.publicRepository.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    });

    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const apiKey = generateApiKey();

    const repository = await db.publicRepository.create({
      data: {
        tenantId,
        name: name.trim(),
        slug,
        description: description || null,
        apiKey,
        schema: validatedSchema,
        isRateLimited: isRateLimited !== undefined ? isRateLimited : true,
        rateLimitPerMinute: rateLimitPerMinute || 60,
        creatorId,
      },
    });

    return repository;
  },

  getRepositories: async ({ tenantId, filters = {}, pagination = {} }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");

    const { status, search } = filters;
    const { page = 1, limit = 20, sortBy = "createdAt", order = "desc" } = pagination;

    const { skip, take, orderBy } = buildQueryOptions({ page, limit, sortBy, order });

    const where = { tenantId };

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      db.publicRepository.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          apiKey: true,
          status: true,
          schema: true,
          isRateLimited: true,
          rateLimitPerMinute: true,
          totalItems: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { items: true, accessLogs: true } },
        },
      }),
      db.publicRepository.count({ where }),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  },

  getRepositoryById: async ({ tenantId, repositoryId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!repositoryId) throw new ApiError(400, "repositoryId required");

    const repository = await db.publicRepository.findUnique({
      where: { id: repositoryId },
      include: {
        _count: { select: { items: true, accessLogs: true } },
      },
    });

    if (!repository || repository.tenantId !== tenantId) {
      throw new ApiError(404, "Repository not found");
    }

    return repository;
  },

  updateRepository: async ({ tenantId, repositoryId, data }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!repositoryId) throw new ApiError(400, "repositoryId required");

    const repository = await db.publicRepository.findUnique({ where: { id: repositoryId } });
    if (!repository || repository.tenantId !== tenantId) {
      throw new ApiError(404, "Repository not found");
    }

    const { name, description, status, schema, isRateLimited, rateLimitPerMinute } = data;
    const updateData = {};

    if (name !== undefined) {
      updateData.name = name.trim();
      const newSlug = generateSlug(name);
      const existingSlug = await db.publicRepository.findUnique({
        where: { tenantId_slug: { tenantId, slug: newSlug } },
      });
      if (!existingSlug || existingSlug.id === repositoryId) {
        updateData.slug = newSlug;
      } else {
        updateData.slug = `${newSlug}-${Date.now().toString(36)}`;
      }
    }

    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      if (!["ACTIVE", "INACTIVE", "ARCHIVED"].includes(status)) {
        throw new ApiError(400, "Invalid status");
      }
      updateData.status = status;
    }
    if (schema !== undefined) {
      updateData.schema = validateSchemaDefinition(schema);
    }
    if (isRateLimited !== undefined) updateData.isRateLimited = isRateLimited;
    if (rateLimitPerMinute !== undefined) updateData.rateLimitPerMinute = rateLimitPerMinute;

    if (Object.keys(updateData).length === 0) {
      return repository;
    }

    const updated = await db.publicRepository.update({
      where: { id: repositoryId },
      data: updateData,
    });

    await invalidateRepoCache(repository.apiKey);

    return updated;
  },

  deleteRepository: async ({ tenantId, repositoryId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!repositoryId) throw new ApiError(400, "repositoryId required");

    const repository = await db.publicRepository.findUnique({ where: { id: repositoryId } });
    if (!repository || repository.tenantId !== tenantId) {
      throw new ApiError(404, "Repository not found");
    }

    const updated = await db.publicRepository.update({
      where: { id: repositoryId },
      data: { status: "ARCHIVED" },
    });

    await invalidateRepoCache(repository.apiKey);

    return updated;
  },

  regenerateApiKey: async ({ tenantId, repositoryId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!repositoryId) throw new ApiError(400, "repositoryId required");

    const repository = await db.publicRepository.findUnique({ where: { id: repositoryId } });
    if (!repository || repository.tenantId !== tenantId) {
      throw new ApiError(404, "Repository not found");
    }

    const oldApiKey = repository.apiKey;
    const newApiKey = generateApiKey();

    const updated = await db.publicRepository.update({
      where: { id: repositoryId },
      data: { apiKey: newApiKey },
    });

    await invalidateRepoCache(oldApiKey);

    return updated;
  },

  getRepositoryStats: async ({ tenantId, repositoryId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!repositoryId) throw new ApiError(400, "repositoryId required");

    const repository = await db.publicRepository.findUnique({ where: { id: repositoryId } });
    if (!repository || repository.tenantId !== tenantId) {
      throw new ApiError(404, "Repository not found");
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalItems, activeItems, accessLast24h, accessLast7d, accessLast30d, lastAccess] = await Promise.all([
      db.repositoryItem.count({ where: { repositoryId } }),
      db.repositoryItem.count({ where: { repositoryId, isActive: true } }),
      db.repositoryAccessLog.count({ where: { repositoryId, createdAt: { gte: last24h } } }),
      db.repositoryAccessLog.count({ where: { repositoryId, createdAt: { gte: last7d } } }),
      db.repositoryAccessLog.count({ where: { repositoryId, createdAt: { gte: last30d } } }),
      db.repositoryAccessLog.findFirst({ where: { repositoryId }, orderBy: { createdAt: "desc" } }),
    ]);

    return {
      totalItems,
      activeItems,
      access: {
        last24h: accessLast24h,
        last7d: accessLast7d,
        last30d: accessLast30d,
      },
      lastAccessedAt: lastAccess?.createdAt || null,
    };
  },

  getAccessLogs: async ({ tenantId, repositoryId, pagination = {} }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!repositoryId) throw new ApiError(400, "repositoryId required");

    const repository = await db.publicRepository.findUnique({ where: { id: repositoryId } });
    if (!repository || repository.tenantId !== tenantId) {
      throw new ApiError(404, "Repository not found");
    }

    const { page = 1, limit = 50, sortBy = "createdAt", order = "desc" } = pagination;
    const { skip, take, orderBy } = buildQueryOptions({ page, limit, sortBy, order });

    const where = { repositoryId };

    const [data, total] = await Promise.all([
      db.repositoryAccessLog.findMany({ where, skip, take, orderBy }),
      db.repositoryAccessLog.count({ where }),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  },

  addItem: async ({ tenantId, repositoryId, creatorId, data }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!repositoryId) throw new ApiError(400, "repositoryId required");

    const repository = await db.publicRepository.findUnique({ where: { id: repositoryId } });
    if (!repository || repository.tenantId !== tenantId) {
      throw new ApiError(404, "Repository not found");
    }

    const cleanedData = validateItemData(data, repository.schema);

    return db.$transaction(async (tx) => {
      const maxOrder = await tx.repositoryItem.aggregate({
        where: { repositoryId },
        _max: { orderIndex: true },
      });

      const item = await tx.repositoryItem.create({
        data: {
          repositoryId,
          data: cleanedData,
          orderIndex: (maxOrder._max.orderIndex || 0) + 1,
          createdById: creatorId,
        },
      });

      await tx.publicRepository.update({
        where: { id: repositoryId },
        data: { totalItems: { increment: 1 } },
      });

      return item;
    });
  },

  getItems: async ({ tenantId, repositoryId, filters = {}, pagination = {} }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!repositoryId) throw new ApiError(400, "repositoryId required");

    const repository = await db.publicRepository.findUnique({ where: { id: repositoryId } });
    if (!repository || repository.tenantId !== tenantId) {
      throw new ApiError(404, "Repository not found");
    }

    const { isActive } = filters;
    const { page = 1, limit = 20, sortBy = "orderIndex", order = "asc" } = pagination;
    const { skip, take, orderBy } = buildQueryOptions({ page, limit, sortBy, order });

    const where = { repositoryId };
    if (isActive !== undefined) where.isActive = isActive === "true";

    const [data, total] = await Promise.all([
      db.repositoryItem.findMany({ where, skip, take, orderBy }),
      db.repositoryItem.count({ where }),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  },

  getItemById: async ({ tenantId, repositoryId, itemId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!itemId) throw new ApiError(400, "itemId required");

    const item = await db.repositoryItem.findUnique({
      where: { id: itemId },
      include: { repository: true },
    });

    if (!item || item.repositoryId !== repositoryId || item.repository.tenantId !== tenantId) {
      throw new ApiError(404, "Item not found");
    }

    const { repository, ...itemData } = item;
    return itemData;
  },

  updateItem: async ({ tenantId, repositoryId, itemId, data }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!itemId) throw new ApiError(400, "itemId required");

    const item = await db.repositoryItem.findUnique({
      where: { id: itemId },
      include: { repository: true },
    });

    if (!item || item.repositoryId !== repositoryId || item.repository.tenantId !== tenantId) {
      throw new ApiError(404, "Item not found");
    }

    const cleanedData = validateItemData(data, item.repository.schema);

    const updated = await db.repositoryItem.update({
      where: { id: itemId },
      data: { data: cleanedData },
    });

    await invalidateRepoCache(item.repository.apiKey);

    return updated;
  },

  deleteItem: async ({ tenantId, repositoryId, itemId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!itemId) throw new ApiError(400, "itemId required");

    const item = await db.repositoryItem.findUnique({
      where: { id: itemId },
      include: { repository: true },
    });

    if (!item || item.repositoryId !== repositoryId || item.repository.tenantId !== tenantId) {
      throw new ApiError(404, "Item not found");
    }

    await db.$transaction(async (tx) => {
      await tx.repositoryItem.delete({ where: { id: itemId } });
      await tx.publicRepository.update({
        where: { id: repositoryId },
        data: { totalItems: { decrement: 1 } },
      });
    });

    await invalidateRepoCache(item.repository.apiKey);

    return { message: "Item deleted" };
  },

  bulkAddItems: async ({ tenantId, repositoryId, creatorId, items }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!repositoryId) throw new ApiError(400, "repositoryId required");
    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Items must be a non-empty array");
    }

    const repository = await db.publicRepository.findUnique({ where: { id: repositoryId } });
    if (!repository || repository.tenantId !== tenantId) {
      throw new ApiError(404, "Repository not found");
    }

    const validatedItems = items.map((item, index) => {
      try {
        return validateItemData(item, repository.schema);
      } catch (e) {
        throw new ApiError(400, `Item at index ${index}: ${e.message}`);
      }
    });

    return db.$transaction(async (tx) => {
      const maxOrder = await tx.repositoryItem.aggregate({
        where: { repositoryId },
        _max: { orderIndex: true },
      });

      let startOrder = (maxOrder._max.orderIndex || 0) + 1;

      const created = [];
      for (const itemData of validatedItems) {
        const item = await tx.repositoryItem.create({
          data: {
            repositoryId,
            data: itemData,
            orderIndex: startOrder++,
            createdById: creatorId,
          },
        });
        created.push(item);
      }

      await tx.publicRepository.update({
        where: { id: repositoryId },
        data: { totalItems: { increment: validatedItems.length } },
      });

      return created;
    });
  },

  bulkDeleteItems: async ({ tenantId, repositoryId, itemIds }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!repositoryId) throw new ApiError(400, "repositoryId required");
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw new ApiError(400, "itemIds must be a non-empty array");
    }

    const repository = await db.publicRepository.findUnique({ where: { id: repositoryId } });
    if (!repository || repository.tenantId !== tenantId) {
      throw new ApiError(404, "Repository not found");
    }

    const existingItems = await db.repositoryItem.findMany({
      where: { id: { in: itemIds }, repositoryId },
    });

    if (existingItems.length !== itemIds.length) {
      throw new ApiError(400, "Some items were not found in this repository");
    }

    await db.$transaction(async (tx) => {
      await tx.repositoryItem.deleteMany({
        where: { id: { in: itemIds }, repositoryId },
      });
      await tx.publicRepository.update({
        where: { id: repositoryId },
        data: { totalItems: { decrement: existingItems.length } },
      });
    });

    await invalidateRepoCache(repository.apiKey);

    return { message: `${existingItems.length} items deleted` };
  },

  getPublicData: async ({ apiKey, pagination = {}, ipAddress, userAgent }) => {
    if (!apiKey) throw new ApiError(400, "API key is required");

    const cacheKey = `repo:${apiKey}`;
    let repository;

    const cached = await getRedis(cacheKey);
    if (cached) {
      repository = JSON.parse(cached);
    } else {
      repository = await db.publicRepository.findUnique({
        where: { apiKey },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          status: true,
          schema: true,
          totalItems: true,
          isRateLimited: true,
          rateLimitPerMinute: true,
        },
      });

      if (!repository) {
        throw new ApiError(404, "Repository not found");
      }

      await setRedis(cacheKey, JSON.stringify(repository), 300);
    }

    if (repository.status !== "ACTIVE") {
      throw new ApiError(403, "This repository is not currently active");
    }

    const { page = 1, limit = 100 } = pagination;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Math.min(Number(limit), 500);

    const itemsCacheKey = `repo_items:${apiKey}:${page}:${take}`;
    let items, total;

    const cachedItems = await getRedis(itemsCacheKey);
    if (cachedItems) {
      const parsed = JSON.parse(cachedItems);
      items = parsed.items;
      total = parsed.total;
    } else {
      [items, total] = await Promise.all([
        db.repositoryItem.findMany({
          where: { repositoryId: repository.id, isActive: true },
          skip,
          take,
          orderBy: { orderIndex: "asc" },
          select: { id: true, data: true, createdAt: true, updatedAt: true },
        }),
        db.repositoryItem.count({
          where: { repositoryId: repository.id, isActive: true },
        }),
      ]);

      await setRedis(itemsCacheKey, JSON.stringify({ items, total }), 60);
    }

    const startTime = Date.now();
    db.repositoryAccessLog.create({
      data: {
        repositoryId: repository.id,
        ipAddress,
        userAgent,
        endpoint: `/public/repository/${apiKey}`,
        responseTime: Date.now() - startTime,
      },
    }).catch((e) => console.error("Access log error:", e));

    return {
      repository: {
        name: repository.name,
        description: repository.description,
        schema: repository.schema,
        totalItems: total,
      },
      items: items.map((item) => ({
        id: item.id,
        ...item.data,
        _createdAt: item.createdAt,
        _updatedAt: item.updatedAt,
      })),
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  getPublicSchema: async ({ apiKey }) => {
    if (!apiKey) throw new ApiError(400, "API key is required");

    const cacheKey = `repo:${apiKey}`;
    let repository;

    const cached = await getRedis(cacheKey);
    if (cached) {
      repository = JSON.parse(cached);
    } else {
      repository = await db.publicRepository.findUnique({
        where: { apiKey },
        select: { id: true, name: true, slug: true, description: true, status: true, schema: true, totalItems: true, isRateLimited: true, rateLimitPerMinute: true },
      });

      if (!repository) {
        throw new ApiError(404, "Repository not found");
      }

      await setRedis(cacheKey, JSON.stringify(repository), 300);
    }

    if (repository.status !== "ACTIVE") {
      throw new ApiError(403, "This repository is not currently active");
    }

    return {
      name: repository.name,
      description: repository.description,
      schema: repository.schema,
      totalItems: repository.totalItems,
    };
  },

  getPublicItem: async ({ apiKey, itemId }) => {
    if (!apiKey) throw new ApiError(400, "API key is required");
    if (!itemId) throw new ApiError(400, "itemId is required");

    const repository = await db.publicRepository.findUnique({
      where: { apiKey },
      select: { id: true, status: true },
    });

    if (!repository) throw new ApiError(404, "Repository not found");
    if (repository.status !== "ACTIVE") throw new ApiError(403, "This repository is not currently active");

    const item = await db.repositoryItem.findUnique({
      where: { id: itemId },
      select: { id: true, data: true, repositoryId: true, isActive: true, createdAt: true, updatedAt: true },
    });

    if (!item || item.repositoryId !== repository.id || !item.isActive) {
      throw new ApiError(404, "Item not found");
    }

    return {
      id: item.id,
      ...item.data,
      _createdAt: item.createdAt,
      _updatedAt: item.updatedAt,
    };
  },
};
