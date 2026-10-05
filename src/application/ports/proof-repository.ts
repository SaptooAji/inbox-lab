import type { ProofEntry } from "../dto/proof.dto";

export interface ProofRepository {
  /** Newest first, then by id. An unset gallery is an empty list. */
  list(): Promise<readonly ProofEntry[]>;
}
