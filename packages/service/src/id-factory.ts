import type { OpaqueId, OpaqueIdKind } from "@hair/domain";

/** Server adapters supply cryptographically random IDs; tests supply a deterministic factory. */
export interface OpaqueIdFactory {
  next<Kind extends OpaqueIdKind>(kind: Kind): OpaqueId<Kind>;
}

