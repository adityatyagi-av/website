export { resolveEntity } from "./entity-resolver.js";
export { canMessage } from "./permissions.js";
export { deduplicateLinkedEntities, deduplicateByRealUser } from "./deduplication.js";
export { getEntityMemberUserIds } from "./member-resolver.js";
export { resolveEntityAccess, buildInboxWhere, getUserOwnedEntityIds, resolveStartupEntityIds } from "./inbox-scope.js";
export { validateSendPermission } from "./send-guard.js";
export { registerEntityType, getHandler, getRegisteredTypes } from "./entity-registry.js";
