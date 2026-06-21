import db from "../../db/db.js";
import { buildQueryOptions } from "../../utils/queryHelper.js";
import { ApiError } from "../../utils/ApiError.js";

export const AddonService = {
  createAddon: async ({ addonKey, name, description, type, price, unit, estimatedPrice, icon }) => {
    if (!addonKey || !name || !description || !type) {
      throw new ApiError(400, "addonKey, name, description, and type are required");
    }

    const existing = await db.addon.findUnique({ where: { addonKey } });
    if (existing) {
      throw new ApiError(409, "Addon with this key already exists");
    }

    const addon = await db.addon.create({
      data: { addonKey, name, description, type, price, unit, estimatedPrice, icon },
    });

    return addon;
  },

  getAllAddons: async ({ page = 1, limit = 10, search = "", sortBy = "createdAt", order = "desc" }) => {
    const { skip, take, where, orderBy } = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["name", "description"],
      defaultFields: ["name", "description"],
      sortBy,
      order,
    });

    const [addons, totalCount] = await Promise.all([
      db.addon.findMany({
        skip,
        take,
        where,
        orderBy,
        include: { _count: { select: { addonRequests: true } } },
      }),
      db.addon.count({ where }),
    ]);

    return {
      data: addons,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  },

  getAddonById: async (addonId) => {
    const addon = await db.addon.findUnique({
      where: { id: addonId },
      include: { _count: { select: { addonRequests: true } } },
    });
    if (!addon) {
      throw new ApiError(404, "Addon not found");
    }
    return addon;
  },

  updateAddon: async (addonId, updateData) => {
    const addon = await db.addon.findUnique({ where: { id: addonId } });
    if (!addon) {
      throw new ApiError(404, "Addon not found");
    }

    const { addonKey, name, description, type, price, unit, estimatedPrice, icon } = updateData;

    if (addonKey && addonKey !== addon.addonKey) {
      const existing = await db.addon.findUnique({ where: { addonKey } });
      if (existing) {
        throw new ApiError(409, "Another addon with this key already exists");
      }
    }

    const updated = await db.addon.update({
      where: { id: addonId },
      data: {
        ...(addonKey !== undefined && { addonKey }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(price !== undefined && { price }),
        ...(unit !== undefined && { unit }),
        ...(estimatedPrice !== undefined && { estimatedPrice }),
        ...(icon !== undefined && { icon }),
      },
    });

    return updated;
  },

  toggleAddonStatus: async (addonId, isActive) => {
    const addon = await db.addon.findUnique({ where: { id: addonId } });
    if (!addon) {
      throw new ApiError(404, "Addon not found");
    }

    const updated = await db.addon.update({
      where: { id: addonId },
      data: { isActive },
    });

    return updated;
  },

  deleteAddon: async (addonId) => {
    const addon = await db.addon.findUnique({
      where: { id: addonId },
      include: { _count: { select: { addonRequests: true } } },
    });
    if (!addon) {
      throw new ApiError(404, "Addon not found");
    }

    if (addon._count.addonRequests > 0) {
      throw new ApiError(400, "Cannot delete addon with existing requests. Deactivate it instead.");
    }

    await db.addon.delete({ where: { id: addonId } });

    return { message: "Addon deleted successfully" };
  },
};
