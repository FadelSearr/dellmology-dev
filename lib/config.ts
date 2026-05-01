/* ══════════════════════════════════════════════════════════════
   Dellmology Pro — Dynamic Configuration (Rule-Engine Versioning)
   
   Per roadmap: "Don't hard-code strategy parameters in code.
   Use Dynamic Configuration so you only need to update one place
   without redeploying the entire backend."
   ══════════════════════════════════════════════════════════════ */

export interface DellmologyConfig {
  // UPS Thresholds
  ups_entry_threshold: number;    // Default 70
  ups_exit_threshold: number;     // Default 40
  ups_strong_buy_threshold: number; // Default 80

  // Kill-Switch Parameters
  roc_killswitch_percent: number; // Default 5%
  roc_killswitch_window_min: number; // Default 5 min
  ihsg_crash_threshold: number;   // Default -1.5%
  ihsg_raised_ups_threshold: number; // Default 90

  // Position Sizing
  max_risk_per_trade_percent: number; // Default 2%
  slippage_buffer_percent: number;    // Default 0.75%
  max_position_percent: number;       // Default 10%
  stop_loss_atr_multiple: number;     // Default 2
  take_profit_atr_multiple: number;   // Default 3

  // Cooling Off
  drawdown_cooloff_percent: number;   // Default 5%
  cooloff_duration_hours: number;     // Default 24

  // Data Retention
  tick_data_retention_days: number;   // Default 7
  daily_data_retention_days: number;  // Default -1 (infinite)

  // Heartbeat
  heartbeat_interval_minutes: number; // Default 5
  offline_threshold_minutes: number;  // Default 10

  // Screener
  screener_min_volume: number;        // Default 1_000_000
  screener_min_frequency: number;     // Default 100

  // Combat Mode
  combat_mode_atr_threshold: number;  // ATR multiplier to trigger combat mode
  combat_mode_enabled: boolean;
}

export const DEFAULT_CONFIG: DellmologyConfig = {
  ups_entry_threshold: 70,
  ups_exit_threshold: 40,
  ups_strong_buy_threshold: 80,

  roc_killswitch_percent: 5,
  roc_killswitch_window_min: 5,
  ihsg_crash_threshold: -1.5,
  ihsg_raised_ups_threshold: 90,

  max_risk_per_trade_percent: 2,
  slippage_buffer_percent: 0.75,
  max_position_percent: 10,
  stop_loss_atr_multiple: 2,
  take_profit_atr_multiple: 3,

  drawdown_cooloff_percent: 5,
  cooloff_duration_hours: 24,

  tick_data_retention_days: 7,
  daily_data_retention_days: -1,

  heartbeat_interval_minutes: 5,
  offline_threshold_minutes: 10,

  screener_min_volume: 1_000_000,
  screener_min_frequency: 100,

  combat_mode_atr_threshold: 2.0,
  combat_mode_enabled: true,
};

// In production, this would load from Supabase profile table
let activeConfig: DellmologyConfig = { ...DEFAULT_CONFIG };

export function getConfig(): DellmologyConfig {
  return activeConfig;
}

export function updateConfig(partial: Partial<DellmologyConfig>): DellmologyConfig {
  activeConfig = { ...activeConfig, ...partial };
  return activeConfig;
}

export function resetConfig(): DellmologyConfig {
  activeConfig = { ...DEFAULT_CONFIG };
  return activeConfig;
}
