export const buildQueryOptions = ({
  page = 1,
  limit = 10,
  search = "",
  searchFields,
  defaultFields = [],
  sortBy = "createdAt",
  order = "desc",
}) => {
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  let effectiveSearchFields = [];
  if (Array.isArray(searchFields) && searchFields.length > 0) {
    effectiveSearchFields = searchFields;
  } else if (typeof searchFields === "string" && searchFields.trim() !== "") {
    try {
      const parsed = JSON.parse(searchFields);
      if (Array.isArray(parsed)) {
        effectiveSearchFields = parsed;
      } else {
        effectiveSearchFields = searchFields.split(",").map((s) => s.trim());
      }
    } catch {
      effectiveSearchFields = searchFields.split(",").map((s) => s.trim());
    }
  } else {
    effectiveSearchFields = defaultFields;
  }

  let where = {};
  if (search && effectiveSearchFields.length > 0) {
    where.OR = effectiveSearchFields.map((field) => {
      if (field.includes(".")) {
        const [relation, nestedField] = field.split(".");
        return {
          [relation]: {
            [nestedField]: { contains: search, mode: "insensitive" },
          },
        };
      } else {
        return { [field]: { contains: search, mode: "insensitive" } };
      }
    });
  }

  const orderBy = { [sortBy]: order };

  return { skip, take, where, orderBy };
};
