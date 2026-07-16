import commonEn from './locales/en/common.json';
import { matchSentenceAndExtractValues, t } from './util';

// List of predefined translation keys for notification messages
export const NOTIFICATION_TRANSLATION_KEYS = [
  // Feedback notification
  'employee_has_changed_equipment_status',
  'employee_submit_feedback_running',
  'employee_submit_feedback_idle',
  'employee_submit_feedback_planned_down',
  'employee_submit_feedback_unplanned_down',
  'employee_submit_feedback_unplanned_offline',
  'new_feedback',

  // Alarm notification
  'warning_alarm_occuring_in_equipment',
  'critical_alarm_occuring_in_equipment',

  // Status change notification
  'equipment_status_change_detected_running',
  'equipment_status_change_detected_idle',
  'equipment_status_change_detected_down',
  'equipment_status_change_detected_unplanned_down',
  'equipment_status_change_detected_planned_down',
  'equipment_status_change_detected_offline',

  // OEE Daily notification
  'location_oee_performance_below_limit',
  'location_oee_reached_performance_limit',

  // Work order notification
  'employee_start_production',
  'employee_pause_production',
  'employee_finish_production',
  'employee_resume_production',

  // SPC notification
  'equipment_parameter_outside_control_limit',
  'equipment_parameter_outside_specification_limit',

  // Abnormal parameter notification
  'abnormal_parameter_detected',
  'asset_abnormal_parameter',

  // License expiry notification
  'license_expiry_base_notification',
  'license_expiry_equipment_notification',

  // EM Daily location notification
  'daily_active_energy_notification',
  'daily_carbon_emission_notification',
  'daily_energy_cost_notification',

  // Inspection notification
  'add_inspection',
  'delete_inspection',
  'update_inspection',
];

// Function to translate a notification message using the predefined translation keys
export const translateMessageWithPredefinedKeys = (message: string): string => {
  // Loop through the translation keys and check if the message matches any of them
  for (const key of NOTIFICATION_TRANSLATION_KEYS) {
    // @ts-expect-error TS7053
    if (!commonEn[key]) {
      continue;
    }
    const [isMatch, dynamicValues] = matchSentenceAndExtractValues(
      message,
      // @ts-expect-error TS7053
      commonEn[key]
    );
    if (!isMatch) {
      continue;
    }
    return t(`common.${key}`, ...dynamicValues);
  }

  // If no translation key is found, return the original message
  return message;
};
