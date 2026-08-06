import helpBiga from "@/assets/help-biga.jpg";
import helpRefresh from "@/assets/help-refresh.jpg";
import helpBulk from "@/assets/help-bulk.jpg";
import helpBalling from "@/assets/help-balling.jpg";
import helpProof from "@/assets/help-proof.jpg";
import helpCold from "@/assets/help-cold.jpg";

/**
 * Visual help media, one entry per protocol phase.
 * `altKey` / `descKey` / `okKeys` / `avoidKeys` are i18n keys so the whole
 * pedagogical layer stays translated in the 6 supported languages.
 */
export interface PhaseHelp {
  id: string;
  media: string;
  titleKey: string;
  altKey: string;
  descKey: string;
  okKeys: string[];
  avoidKeys: string[];
}

export const PHASE_HELP: Record<string, PhaseHelp> = {
  biga: {
    id: "biga",
    media: helpBiga,
    titleKey: "help_biga_title",
    altKey: "help_biga_alt",
    descKey: "help_biga_desc",
    okKeys: ["help_biga_ok1", "help_biga_ok2"],
    avoidKeys: ["help_biga_no1"],
  },
  refresh: {
    id: "refresh",
    media: helpRefresh,
    titleKey: "help_refresh_title",
    altKey: "help_refresh_alt",
    descKey: "help_refresh_desc",
    okKeys: ["help_refresh_ok1", "help_refresh_ok2"],
    avoidKeys: ["help_refresh_no1"],
  },
  bulk: {
    id: "bulk",
    media: helpBulk,
    titleKey: "help_bulk_title",
    altKey: "help_bulk_alt",
    descKey: "help_bulk_desc",
    okKeys: ["help_bulk_ok1", "help_bulk_ok2"],
    avoidKeys: ["help_bulk_no1"],
  },
  balling: {
    id: "balling",
    media: helpBalling,
    titleKey: "help_balling_title",
    altKey: "help_balling_alt",
    descKey: "help_balling_desc",
    okKeys: ["help_balling_ok1", "help_balling_ok2"],
    avoidKeys: ["help_balling_no1"],
  },
  cold: {
    id: "cold",
    media: helpCold,
    titleKey: "help_cold_title",
    altKey: "help_cold_alt",
    descKey: "help_cold_desc",
    okKeys: ["help_cold_ok1", "help_cold_ok2"],
    avoidKeys: ["help_cold_no1"],
  },
  proof: {
    id: "proof",
    media: helpProof,
    titleKey: "help_proof_title",
    altKey: "help_proof_alt",
    descKey: "help_proof_desc",
    okKeys: ["help_proof_ok1", "help_proof_ok2"],
    avoidKeys: ["help_proof_no1"],
  },
};

/** Maps a protocol step key to its visual help entry. */
export function helpForStep(stepKey: string): PhaseHelp | undefined {
  const map: Record<string, string> = {
    phase1: "biga",
    phase2: "cold",
    phase3: "refresh",
    phase4: "balling",
    knead: "refresh",
    bulk: "bulk",
    ball: "balling",
    proof: "proof",
  };
  const id = map[stepKey];
  return id ? PHASE_HELP[id] : undefined;
}
