import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";

export const tenantStartupService = {
  getStartups: async ({
    tenantKey,
    page = 1,
    limit = 10,
    search = "",
    sortBy = "createdAt",
    order = "desc",
    stage,
    status,
  }) => {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const {
      skip,
      take,
      where: searchWhere,
      orderBy,
    } = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: [
        "startup.name",
        "startup.contactEmail",
        "startup.sector",
        "startup.stage",
      ],
      defaultFields: ["startup.name"],
      sortBy,
      order,
    });

    const whereClause = {
      tenantId: tenant.id,
      isActive: true,
      ...(stage ? { startup: { stage: { equals: stage } } } : {}),
      ...(status ? { startup: { status: { equals: status } } } : {}),
      ...searchWhere,
    };

    const [associations, total] = await Promise.all([
      db.startupTenantAssociation.findMany({
        where: whereClause,
        skip,
        take,
        orderBy,
        include: {
          startup: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
              contactPhone: true,
              sector: true,
              stage: true,
              logoUrl: true,
              foundedYear: true,
              status: true,
              createdAt: true,
              programAssociations: {
                include: {
                  program: {
                    select: {
                      id: true,
                      title: true,
                      // schemeType: true,
                      schemeTypeRef: { select: { id: true, name: true } },
                      governingBody: { select: { id: true, name: true } },
                      coverImage: true,
                      createdAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      db.startupTenantAssociation.count({ where: whereClause }),
    ]);

    const startups = associations.map((assoc) => ({
      id: assoc.startup.id,
      name: assoc.startup.name,
      contactEmail: assoc.startup.contactEmail,
      contactPhone: assoc.startup.contactPhone,
      sector: assoc.startup.sector,
      stage: assoc.startup.stage,
      logoUrl: assoc.startup.logoUrl,
      foundedYear: assoc.startup.foundedYear,
      registrationStatus: assoc.startup.status,
      tenantStatus: assoc.status,
      onboardedAt: assoc.onboardedAt,
      programs: assoc.startup.programAssociations.map((p) => ({
        id: p.program.id,
        title: p.program.title,
        schemeType: p.program.schemeType,
        schemeTypeRef: p.program.schemeTypeRef,
        governingBody: p.program.governingBody,
        coverImage: p.program.coverImage,
        createdAt: p.program.createdAt,
      })),
    }));

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      data: startups,
    };
  },

  getStartupDetails: async ({ tenantKey, startupId }) => {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const association = await db.startupTenantAssociation.findFirst({
      where: { tenantId: tenant.id, startupId },
      include: {
        startup: {
          include: {
            // user: { select: { id: true, name: true, email: true } },
            // founders: true,
            applications: {
              include: {
                program: {
                  select: {
                    id: true,
                    title: true,
                    schemeTypeRef: { select: { id: true, name: true } },
                    governingBody: { select: { id: true, name: true } },
                  },
                },

                history: true,
                changeRequests: {
                  include: { responses: true },
                },
                documentRequests: {
                  include: {
                    responses: {
                      include: { files: true },
                    },
                  },
                },
              },
            },
            tenantAssociations: {
              include: {
                tenant: {
                  select: { id: true, organizationName: true, tenantKey: true },
                },
              },
            },
            programAssociations: {
              include: {
                program: true,
              },
            },
            files: true,
          },
        },
      },
    });

    if (!association)
      throw new ApiError(404, "Startup not associated with this tenant");

    return {
      id: association.startup.id,
      name: association.startup.name,
      contactEmail: association.startup.contactEmail,
      contactPhone: association.startup.contactPhone,
      sector: association.startup.sector,
      stage: association.startup.stage,
      description: association.startup.description,
      website: association.startup.website,
      foundedYear: association.startup.foundedYear,
      registrationStatus: association.startup.status,
      logoUrl: association.startup.logoUrl,
      user: association.startup.user ?? null,
      founders: association.startup.founders,
      programs: association.startup.programAssociations.map((p) => p.program),
      tenants: association.startup.tenantAssociations.map((t) => t.tenant),
      applications: association.startup.applications,
      files: association.startup.files,
    };
  },
};
