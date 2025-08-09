// Config for FirstRep – Exploration build (GitHub Pages).
// NOTE: Keys in client code are fine for exploration, not for production.

window.FIRSTREP_CONFIG = {
  // Your master key (as shared). Rotate for prod or proxy via server.
  JSONBIN_MASTER_KEY: "$2a$10$8AI1P1rXZzRftjDaN8IlLutsn9gYXw/MWSAptBt4A2kKF8xpquCUm",
  // Optional: paste an existing bin ID; else we auto-create one on first sync.
  JSONBIN_BIN_ID: "",
};

window.FIRSTREP_CONST = {
  STORAGE_KEY: "firstrep_app_state_gp_v2",
  EVENT_LOG_KEY: "firstrep_event_log_gp_v2",
  JSONBIN_ID_KEY: "firstrep_jsonbin_binid_gp_v2",
  JSONBIN_KEY_KEY: "firstrep_jsonbin_masterkey_gp_v2",
};

window.FIRSTREP_UTILS = {
  todayStr: () => new Date().toISOString().slice(0, 10),
  fmtDate: (d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  uid: (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`,
  allSameDigits: (s) => /^([0-9])\1{9}$/.test(s),
  isValidIndianMobile: (s) => /^[6-9][0-9]{9}$/.test(s) && !/^([0-9])\1{9}$/.test(s),
};
