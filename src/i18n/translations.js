// Radiance Polymers - Centralized Translation Dictionary (English & Hindi)
// Supports full UI localization, shop-floor rejection codes, downtime codes, and validations

export const TRANSLATIONS = {
  en: {
    // Brand & Header
    company_name: 'RADIANCE POLYMERS',
    system_title: 'Production Console v1.0',
    nav_console: 'Production Console',
    nav_analytics: 'Plant Analytics',
    nav_reports: 'Reports & Export',
    nav_master_data: 'Master Data',
    nav_system_health: 'System Health',
    nav_audit_trail: 'Audit Trail',
    btn_new_shift: 'New Shift',
    cloud_sync_active: 'Cloud Sync',
    cloud_sync_offline: 'Offline Cached',
    active_machine: 'Machine',
    active_shift: 'Shift',
    language_switcher: 'Language',

    // Roles
    role_operator: 'Operator',
    role_supervisor: 'Supervisor',
    role_manager: 'Production Manager',
    role_admin: 'Admin',

    // Production Console Header & Spec Strip
    session: 'SESSION',
    session_num: 'Session {num}',
    cycle_time: 'Cycle Time',
    cavity_count: 'Cavities',
    part_runner_wt: 'Part / Runner',
    target_per_hr: 'Target / Hr',
    start_counter: 'Start Counter',
    end_counter: 'End Counter',
    btn_change_mould: 'Part / Tool Change',
    btn_change_tool: 'Part / Tool Change',
    btn_materials: 'Materials',
    btn_counters: 'Counters',
    btn_shift_summary: 'Shift Summary',
    session_closed_banner: 'Session {seq} is Closed. Finished at {time} ({reason}). Entries are locked per Validation 8.',

    // Hourly Table Columns
    col_hour: 'Hour',
    col_interval: 'Time Interval',
    col_target: 'Target (pcs)',
    col_production: 'Production',
    col_rejection: 'Rejection',
    col_accepted: 'Accepted Qty',
    col_downtime: 'Downtime (m)',
    col_dt_code: 'DT Code',
    col_rej_code: 'Rejection Code',
    col_remarks: 'Remarks',
    col_action: 'Action',
    btn_edit: 'Edit',
    btn_log: 'Log',
    totals_label: 'Session {seq} Totals',
    good_parts_ratio: 'Good Parts Ratio',

    // Touch Numpad
    numpad_title: 'Touch Keypad',
    btn_done: 'DONE',
    btn_clear: 'CLR',

    // Hourly Entry Modal
    modal_hour_entry_title: 'Hourly Production Entry',
    target_auto_label: 'Theoretical Target',
    auto_calculated_note: 'Auto Calculated',
    gross_production_label: 'Gross Production Qty',
    rejection_qty_label: 'Rejection Qty',
    accepted_qty_label: 'Accepted Quantity',
    downtime_minutes_label: 'Downtime (Minutes)',
    rejection_code_label: 'Rejection Code (A–Q)',
    downtime_code_label: 'Downtime Code',
    select_downtime_prompt: '-- Select Downtime Reason --',
    remarks_label: 'Remarks / Floor Notes',
    remarks_placeholder: 'e.g. Mould water valve pressure adjusted',
    audit_reason_label: 'Audit Reason for Modification *',
    audit_reason_placeholder: 'Mandatory reason for modifying report',
    btn_save_entry: 'Save Hourly Entry',
    btn_update_entry: 'Update Hourly Record',
    btn_cancel: 'Cancel',
    max_possible_text: 'Max physically possible: {max} pcs',
    available_runtime_text: 'Max 60 min. Available Runtime: {runtime} min',

    // Part Change / Tool Change Wizard
    mould_change_title: 'Part Change / Tool Change Wizard',
    mould_change_warning: 'Tool Switch Protocol: This action safely closes Session {seq}, stamps the final machine counter, and sets up the new Part Number / Tool for Session {nextSeq}.',
    step1_close_session: 'Step 1: Close Current Session',
    step2_setup_session: 'Step 2: Setup New Session',
    active_mould_part: 'Active Part / Tool',
    machine_end_counter_label: 'Machine End Counter *',
    mould_change_reason_label: 'Part / Tool Change Reason *',
    select_new_mould_label: 'Select New Tool',
    select_new_part_label: 'Select New Part Number',
    auto_target_next_session: 'Auto-Computed Target For Session {nextSeq}',
    btn_confirm_mould_change: 'Confirm & Launch Session {nextSeq}',

    // Material Tracking
    material_tracking_title: 'Material Consumption Tracking',
    material_1_title: 'MATERIAL 1 (Primary Resin)',
    material_2_title: 'MATERIAL 2 (Additive / Purge / MB)',
    mat_select_label: 'Select Raw Material',
    mat_lot_label: 'Material Lot Number *',
    mat_opening_label: 'Opening Stock (kg)',
    mat_used_label: 'Used Qty (kg) *',
    mat_balance_label: 'Balance Stock',
    btn_save_materials: 'Save Material Consumption',
    mat_theoretical_req: 'Theoretical Requirement',
    mat_actual_consumed: 'Actual Consumed',

    // Counter Reconciliation
    counter_modal_title: 'Machine Counter & Shot Reconciliation',
    total_shots_counted: 'Total Shots Counted',
    expected_output_label: 'Expected Output',
    actual_prod_variance_label: 'Actual Prod / Variance',
    btn_update_counters: 'Update Machine Counters',

    // Shift Summary & Approval
    shift_summary_title: 'Shift Summary & Signoff',
    kpi_gross_production: 'Gross Production',
    kpi_accepted_quantity: 'Accepted Quantity',
    kpi_rejection_rate: 'Rejection Qty & %',
    kpi_total_downtime: 'Total Downtime',
    kpi_machine_utilization: 'Machine Utilization',
    kpi_overall_oee: 'Overall OEE Score',
    btn_export_excel: 'Export Excel',
    btn_print_report: 'Print Report',
    btn_submit_report: 'Submit Shift Report',
    btn_approve_report: 'Approve & Auto-Email PDF',
    btn_unlock_report: 'Unlock Report',
    report_locked_notice: 'Report is Approved & Locked (Audit Controlled)',
    email_dispatched_alert: 'Automated PDF Dispatched to management distribution list.',
    lumps_generated: 'Lumps Generated (kg)',
    lumps_generated_sub: 'Total purge & start-up lumps in kg',
    lumps_generated_help: 'Total start-up, purging & changeover lumps generated during the shift (in kg). Mandatory supervisor entry.',
    lumps_input_required: 'Supervisor must enter Lumps Generated (kg) before submitting (enter 0 if none).',

    // Analytics Dashboard
    analytics_title: 'Plant Production Analytics & Shop Floor Intelligence',
    analytics_subtitle: 'Real-time aggregate data across injection machines and shifts.',
    chart_machine_comparison: 'Machine-Wise Output & Utilization Comparison',
    chart_rejection_pareto: 'Rejection Pareto Distribution (Codes A–Q)',
    chart_downtime_classification: 'Downtime Loss Analysis by Classification',

    // Reports Hub
    reports_hub_title: 'Digital Production Reports & Export Suite',
    tab_shift_report: 'Shift Report',
    tab_daily_summary: 'Daily Summary',
    tab_rejection_report: 'Rejections (A-Q)',
    tab_downtime_report: 'Downtime Log',
    tab_material_report: 'Materials',
    export_mode_label: 'Export Language Format',
    export_mode_en: 'English',
    export_mode_hi: 'हिन्दी (Hindi)',
    export_mode_bilingual: 'Bilingual (English / हिन्दी)',

    // Validations (V1 - V10)
    val_v1_v9_exceeded: 'Validation 9 Block: Entered production ({prod} pcs) exceeds physical capacity limit ({max} pcs) for {runtime} minutes of runtime with {cycle}s cycle time and {cavities} cavities.',
    val_v2_rejection_exceeded: 'Validation 2 Block: Rejection quantity ({rej} pcs) cannot exceed total production quantity ({prod} pcs).',
    val_v2_negative: 'Validation 2 Block: Rejection quantity cannot be negative.',
    val_v3_downtime_range: 'Validation 3 Block: Downtime ({dt} min) must be between 0 and 60 minutes.',
    val_v5_counter_monotonic: 'Validation 5 Block: Machine End Counter ({end}) must be greater than Start Counter ({start}).',
    val_v6_shot_variance: 'Validation 6 Alert: Production vs Shot variance is {varPct}% (Delta: {delta} pcs). Expected {expected} pcs from {shots} shots.',
    val_v7_material_variance: 'Validation 7 Alert: Material consumption variance is {varPct}% ({actual} kg used vs {expected} kg theoretical). Check purge/scrap.',
    val_v8_session_closed: 'Validation 8 Block: This mould session is closed. No new entries can be added or modified.',
    val_machine_code_format: 'Validation Error: Invalid machine code "{code}". Machine code must follow strict pattern MC + 2 digits (e.g. MC01 to MC99).',
    val_time_unaccounted: 'Hourly Time Accounting Error: Only {accounted} of 60 minutes accounted for (Production: {prodMin} min, Downtime: {dtMin} min). A minimum of {minAllowed} minutes must be recorded ({buffer} min buffer). {missing} minutes remain unaccounted for.',
    val_time_exceeded: 'Hourly Time Accounting Error: Total accounted time ({accounted} min) exceeds allowable limit of {maxAllowedTime} min (Production: {prodMin} min, Downtime: {dtMin} min).'
  },

  hi: {
    // Brand & Header
    company_name: 'रेडियंस पॉलिमर्स',
    system_title: 'डिजिटल उत्पादन रिपोर्टिंग v1.0',
    nav_console: 'उत्पादन कंसोल',
    nav_analytics: 'प्लांट एनालिटिक्स',
    nav_reports: 'रिपोर्ट्स एवं निर्यात',
    nav_master_data: 'मास्टर डेटा',
    nav_system_health: 'सिस्टम हेल्थ',
    nav_audit_trail: 'ऑडिट ट्रेल',
    btn_new_shift: 'नई शिफ्ट',
    cloud_sync_active: 'क्लाउड सिंक सक्रिय',
    cloud_sync_offline: 'ऑफ़लाइन सुरक्षित',
    active_machine: 'मशीन',
    active_shift: 'शिफ्ट',
    language_switcher: 'भाषा (Language)',

    // Roles
    role_operator: 'ऑपरेटर',
    role_supervisor: 'सुपरवाइजर',
    role_manager: 'उत्पादन प्रबंधक',
    role_admin: 'एडमिन',

    // Production Console Header & Spec Strip
    session: 'सत्र',
    session_num: 'सत्र {num}',
    cycle_time: 'साइकिल समय',
    cavity_count: 'कैविटी',
    part_runner_wt: 'पार्ट / रनर भार',
    target_per_hr: 'लक्ष्य / घंटा',
    start_counter: 'प्रारंभिक काउंटर',
    end_counter: 'अंतिम काउंटर',
    btn_change_mould: 'पार्ट / टूल बदलाव',
    btn_change_tool: 'पार्ट / टूल बदलाव',
    btn_materials: 'सामग्री खपत',
    btn_counters: 'मशीन काउंटर',
    btn_shift_summary: 'शिफ्ट सारांश',
    session_closed_banner: 'सत्र {seq} बंद है। समापन समय: {time} (कारण: {reason})। नियम 8 के अनुसार प्रविष्टियाँ लॉक हैं।',

    // Hourly Table Columns
    col_hour: 'घंटा',
    col_interval: 'समय अंतराल',
    col_target: 'लक्ष्य (pcs)',
    col_production: 'कुल उत्पादन',
    col_rejection: 'रिजेक्शन',
    col_accepted: 'स्वीकृत मात्रा',
    col_downtime: 'डाउनटाइम (मि.)',
    col_dt_code: 'डाउनटाइम कोड',
    col_rej_code: 'रिजेक्शन कोड',
    col_remarks: 'टिप्पणी',
    col_action: 'कार्रवाई',
    btn_edit: 'संपादित',
    btn_log: 'दर्ज करें',
    totals_label: 'सत्र {seq} कुल योग',
    good_parts_ratio: 'स्वीकृत पार्ट अनुपात',

    // Touch Numpad
    numpad_title: 'टच कीपैड',
    btn_done: 'पूर्ण (DONE)',
    btn_clear: 'साफ़ (CLR)',

    // Hourly Entry Modal
    modal_hour_entry_title: 'प्रति घंटा उत्पादन प्रविष्टि',
    target_auto_label: 'सैद्धांतिक लक्ष्य',
    auto_calculated_note: 'स्वचालित गणना',
    gross_production_label: 'कुल उत्पादन संख्या (Gross)',
    rejection_qty_label: 'रिजेक्शन संख्या',
    accepted_qty_label: 'स्वीकृत मात्रा (Accepted)',
    downtime_minutes_label: 'डाउनटाइम (मिनट)',
    rejection_code_label: 'रिजेक्शन कोड (A–Q)',
    downtime_code_label: 'डाउनटाइम कोड',
    select_downtime_prompt: '-- डाउनटाइम का कारण चुनें --',
    remarks_label: 'टिप्पणी / फ्लोर नोट्स',
    remarks_placeholder: 'उदा. मोल्ड वाटर वाल्व प्रेशर एडजस्ट किया गया',
    audit_reason_label: 'संशोधन का ऑडिट कारण *',
    audit_reason_placeholder: 'रिपोर्ट में बदलाव का अनिवार्य कारण',
    btn_save_entry: 'प्रविष्टि सुरक्षित करें',
    btn_update_entry: 'रिकॉर्ड अपडेट करें',
    btn_cancel: 'रद्द करें',
    max_possible_text: 'अधिकतम संभव क्षमता: {max} pcs',
    available_runtime_text: 'अधिकतम 60 मि. उपलब्ध रनटाइम: {runtime} मि.',

    // Part Change / Tool Change Wizard
    mould_change_title: 'पार्ट बदलाव / टूल बदलाव विज़ार्ड',
    mould_change_warning: 'टूल परिवर्तन प्रोटोकॉल: यह क्रिया सत्र {seq} को सुरक्षित रूप से बंद करेगी, अंतिम काउंटर दर्ज करेगी और सत्र {nextSeq} शुरू करेगी।',
    step1_close_session: 'चरण 1: वर्तमान सत्र समाप्त करें',
    step2_setup_session: 'चरण 2: नया सत्र सेटअप करें',
    active_mould_part: 'सक्रिय पार्ट / टूल',
    machine_end_counter_label: 'मशीन अंतिम काउंटर *',
    mould_change_reason_label: 'पार्ट / टूल बदलाव का कारण *',
    select_new_mould_label: 'नया टूल चुनें',
    select_new_part_label: 'नया पार्ट नंबर चुनें',
    auto_target_next_session: 'सत्र {nextSeq} हेतु स्वचालित लक्ष्य',
    btn_confirm_mould_change: 'पुष्टि करें और सत्र {nextSeq} शुरू करें',

    // Material Tracking
    material_tracking_title: 'सामग्री खपत ट्रैकिंग (Material Consumption)',
    material_1_title: 'सामग्री 1 (मुख्य रेज़िन)',
    material_2_title: 'सामग्री 2 (एडिटिव / पर्ज / मास्टरबैच)',
    mat_select_label: 'कच्चा माल चुनें',
    mat_lot_label: 'सामग्री लॉट नंबर *',
    mat_opening_label: 'प्रारंभिक स्टॉक (kg)',
    mat_used_label: 'उपयोग की गई मात्रा (kg) *',
    mat_balance_label: 'बैलेंस स्टॉक',
    btn_save_materials: 'सामग्री खपत सुरक्षित करें',
    mat_theoretical_req: 'सैद्धांतिक आवश्यकता',
    mat_actual_consumed: 'वास्तविक उपयोग',

    // Counter Reconciliation
    counter_modal_title: 'मशीन काउंटर एवं शॉट मिलान',
    total_shots_counted: 'कुल गिने गए शॉट्स',
    expected_output_label: 'अपेक्षित उत्पादन',
    actual_prod_variance_label: 'वास्तविक उत्पादन / अंतर',
    btn_update_counters: 'मशीन काउंटर अपडेट करें',

    // Shift Summary & Approval
    shift_summary_title: 'शिफ्ट सारांश एवं अनुमोदन (Signoff)',
    kpi_gross_production: 'कुल उत्पादन (Gross)',
    kpi_accepted_quantity: 'स्वीकृत पार्ट (Accepted)',
    kpi_rejection_rate: 'रिजेक्शन मात्रा एवं %',
    kpi_total_downtime: 'कुल डाउनटाइम',
    kpi_machine_utilization: 'मशीन उपयोगिता %',
    kpi_overall_oee: 'समग्र OEE स्कोर',
    btn_export_excel: 'एक्सेल में निर्यात',
    btn_print_report: 'रिपोर्ट प्रिंट करें',
    btn_submit_report: 'शिफ्ट रिपोर्ट जमा करें',
    btn_approve_report: 'अनुमोदित करें एवं PDF ईमेल भेजें',
    btn_unlock_report: 'रिपोर्ट अनलॉक करें',
    report_locked_notice: 'रिपोर्ट अनुमोदित एवं लॉक है (ऑडिट नियंत्रित)',
    email_dispatched_alert: 'स्वचालित PDF रिपोर्ट प्रबंधन ईमेल पर भेजी जा चुकी है।',
    lumps_generated: 'लम्प्स जनरेटेड (कि.ग्रा.)',
    lumps_generated_sub: 'कुल पर्ज एवं स्टार्ट-अप लम्प्स (कि.ग्रा.)',
    lumps_generated_help: 'शिफ्ट के दौरान उत्पन्न स्टार्ट-अप और पर्जिंग लम्प्स (किग्रा में)। सुपरवाइजर द्वारा अनिवार्य प्रविष्टि।',
    lumps_input_required: 'शिफ्ट रिपोर्ट जमा करने से पहले सुपरवाइजर को लम्प्स (कि.ग्रा.) दर्ज करना आवश्यक है (यदि कोई नहीं है तो 0 दर्ज करें)।',

    // Analytics Dashboard
    analytics_title: 'प्लांट उत्पादन एनालिटिक्स एवं लाइव डैशबोर्ड',
    analytics_subtitle: 'इंजेक्शन मशीनों एवं शिफ्टों का वास्तविक समय डेटा।',
    chart_machine_comparison: 'मशीन अनुसार उत्पादन एवं उपयोगिता तुलना',
    chart_rejection_pareto: 'रिजेक्शन पेरेटो विश्लेषण (कोड A–Q)',
    chart_downtime_classification: 'डाउनटाइम नुकसान वर्गीकरण विश्लेषण',

    // Reports Hub
    reports_hub_title: 'डिजिटल उत्पादन रिपोर्ट एवं निर्यात केंद्र',
    tab_shift_report: 'शिफ्ट रिपोर्ट',
    tab_daily_summary: 'दैनिक सारांश',
    tab_rejection_report: 'रिजेक्शन रिपोर्ट (A-Q)',
    tab_downtime_report: 'डाउनटाइम लॉग',
    tab_material_report: 'सामग्री खपत',
    export_mode_label: 'निर्यात भाषा प्रारूप',
    export_mode_en: 'English (अंग्रेजी)',
    export_mode_hi: 'हिन्दी (Hindi)',
    export_mode_bilingual: 'द्विभाषी (Bilingual English / हिन्दी)',

    // Validations (V1 - V10)
    val_v1_v9_exceeded: 'सत्यापन 9 अवरोध: दर्ज उत्पादन ({prod} pcs) {runtime} मिनट के रनटाइम में {cycle}s साइकिल समय और {cavities} कैविटी हेतु भौतिक क्षमता सीमा ({max} pcs) से अधिक है।',
    val_v2_rejection_exceeded: 'सत्यापन 2 अवरोध: रिजेक्शन मात्रा ({rej} pcs) कुल उत्पादन मात्रा ({prod} pcs) से अधिक नहीं हो सकती।',
    val_v2_negative: 'सत्यापन 2 अवरोध: रिजेक्शन मात्रा नकारात्मक नहीं हो सकती।',
    val_v3_downtime_range: 'सत्यापन 3 अवरोध: डाउनटाइम ({dt} मिनट) 0 से 60 मिनट के मध्य होना अनिवार्य है।',
    val_v5_counter_monotonic: 'सत्यापन 5 अवरोध: मशीन अंतिम काउंटर ({end}) प्रारंभिक काउंटर ({start}) से अधिक होना चाहिए।',
    val_v6_shot_variance: 'सत्यापन 6 चेतावनी: उत्पादन और शॉट में अंतर {varPct}% है (अंतर: {delta} pcs)। {shots} शॉट्स से {expected} pcs अपेक्षित थे।',
    val_v7_material_variance: 'सत्यापन 7 चेतावनी: सामग्री खपत में अंतर {varPct}% है ({actual} kg उपयोग vs {expected} kg सैद्धांतिक)। स्क्रैप/पर्ज की जाँच करें।',
    val_v8_session_closed: 'सत्यापन 8 अवरोध: यह मोल्ड सत्र बंद हो चुका है। इसमें नए रिकॉर्ड जोड़ना या बदलना वर्जित है।',
    val_machine_code_format: 'सत्यापन त्रुटि: अमान्य मशीन कोड "{code}"। मशीन कोड MC + 2 अंक पैटर्न (उदा. MC01 से MC99) के अनुसार होना अनिवार्य है।',
    val_time_unaccounted: 'घंटे का समय असंतुलित: 60 में से केवल {accounted} मिनट दर्ज हैं (उत्पादन: {prodMin} मि, डाउनटाइम: {dtMin} मि)। न्यूनतम {minAllowed} मिनट दर्ज होना आवश्यक है ({buffer} मि बफर)। {missing} मिनट का हिसाब अधूरा है।',
    val_time_exceeded: 'घंटे का समय सीमा से अधिक: कुल दर्ज समय ({accounted} मि) अनुमत सीमा {maxAllowedTime} मि से अधिक है (उत्पादन: {prodMin} मि, डाउनटाइम: {dtMin} मि)।'
  }
};

// Localized Rejection Codes (Original A-Q with English & Hindi descriptions)
export const LOCALIZED_REJECTION_CODES = [
  { code: 'A', desc_en: 'Start Up', desc_hi: 'स्टार्ट अप (Start Up)' },
  { code: 'B', desc_en: 'Set Up', desc_hi: 'सेट अप (Set Up)' },
  { code: 'C', desc_en: 'Oil Mark', desc_hi: 'तेल का दाग (Oil Mark)' },
  { code: 'D', desc_en: 'IN PROCESS', desc_hi: 'इन-प्रोसेस दोष (In Process)' },
  { code: 'E', desc_en: 'Burn Mark', desc_hi: 'बर्न मार्क (Burn Mark / जला हुआ)' },
  { code: 'F', desc_en: 'Weld Line', desc_hi: 'वेल्ड लाइन (Weld Line / जोड़ रेखा)' },
  { code: 'G', desc_en: 'Sink Mark', desc_hi: 'सिंक मार्क (Sink Mark / सिकुड़न)' },
  { code: 'H', desc_en: 'Short Mould', desc_hi: 'शॉर्ट मोल्ड (Short Mould / अधूरा पार्ट)' },
  { code: 'I', desc_en: 'Power OFF', desc_hi: 'बिजली बंद (Power Off)' },
  { code: 'J', desc_en: 'MC Problem', desc_hi: 'मशीन खराबी (Machine Problem)' },
  { code: 'K', desc_en: 'Silver Mark', desc_hi: 'सिल्वर मार्क (Silver Mark / चांदी जैसी धारियां)' },
  { code: 'L', desc_en: 'Mould Problem', desc_hi: 'मोल्ड समस्या (Mould Problem)' },
  { code: 'M', desc_en: 'Material Transfer', desc_hi: 'सामग्री ट्रांसफर (Material Transfer)' },
  { code: 'N', desc_en: 'Mesh Mark', desc_hi: 'मेश मार्क (Mesh Mark / जाली का निशान)' },
  { code: 'O', desc_en: 'Mould Change', desc_hi: 'मोल्ड बदलाव (Mould Change)' },
  { code: 'P', desc_en: 'Other Defect', desc_hi: 'अन्य दोष (Other Defect)' },
  { code: 'Q', desc_en: 'Cycle Time', desc_hi: 'साइकिल समय विलंब (Cycle Time Delay)' },
];

// Localized Downtime Codes (DT-101 to DT-999 with English & Hindi descriptions)
export const LOCALIZED_DOWNTIME_CODES = [
  // Machine
  { code: 'DT-101', cat_en: 'Machine Related', cat_hi: 'मशीन संबंधित', desc_en: 'Hydraulic Failure', desc_hi: 'हाइड्रोलिक विफलता' },
  { code: 'DT-102', cat_en: 'Machine Related', cat_hi: 'मशीन संबंधित', desc_en: 'Heater Failure', desc_hi: 'हीटर विफलता (हीटिंग बंद)' },
  { code: 'DT-103', cat_en: 'Machine Related', cat_hi: 'मशीन संबंधित', desc_en: 'Servo Failure', desc_hi: 'सर्वो मोटर विफलता' },
  { code: 'DT-104', cat_en: 'Machine Related', cat_hi: 'मशीन संबंधित', desc_en: 'Electrical Failure', desc_hi: 'विद्युत खराबी' },

  // Mould
  { code: 'DT-201', cat_en: 'Mould Related', cat_hi: 'मोल्ड संबंधित', desc_en: 'Mould Cleaning', desc_hi: 'मोल्ड सफाई' },
  { code: 'DT-202', cat_en: 'Mould Related', cat_hi: 'मोल्ड संबंधित', desc_en: 'Mould Repair', desc_hi: 'मोल्ड मरम्मत' },
  { code: 'DT-203', cat_en: 'Mould Related', cat_hi: 'मोल्ड संबंधित', desc_en: 'Mould Change', desc_hi: 'मोल्ड बदलाव (टूलिंग चेंज)' },

  // Material
  { code: 'DT-301', cat_en: 'Material Related', cat_hi: 'सामग्री संबंधित', desc_en: 'Material Shortage', desc_hi: 'सामग्री (दाना) की कमी' },
  { code: 'DT-302', cat_en: 'Material Related', cat_hi: 'सामग्री संबंधित', desc_en: 'Material Change', desc_hi: 'सामग्री / कलर बदलाव' },

  // Process
  { code: 'DT-401', cat_en: 'Process Related', cat_hi: 'प्रक्रिया संबंधित', desc_en: 'Setup', desc_hi: 'मशीन एवं मोल्ड सेटअप' },
  { code: 'DT-402', cat_en: 'Process Related', cat_hi: 'प्रक्रिया संबंधित', desc_en: 'Trial Run', desc_hi: 'ट्रायल रन / नमूना' },
  { code: 'DT-403', cat_en: 'Process Related', cat_hi: 'प्रक्रिया संबंधित', desc_en: 'Quality Approval Wait', desc_hi: 'गुणवत्ता अनुमोदन प्रतीक्षा' },

  // Utility
  { code: 'DT-501', cat_en: 'Utility Related', cat_hi: 'उपयोगिता संबंधित', desc_en: 'Power Failure', desc_hi: 'बिजली कटौती (पावर कट)' },
  { code: 'DT-502', cat_en: 'Utility Related', cat_hi: 'उपयोगिता संबंधित', desc_en: 'Air Failure', desc_hi: 'हवा (न्यूमेटिक) का दबाव कम' },
  { code: 'DT-503', cat_en: 'Utility Related', cat_hi: 'उपयोगिता संबंधित', desc_en: 'Water Supply Failure', desc_hi: 'कूलिंग पानी आपूर्ति विफलता' },

  // Manpower
  { code: 'DT-601', cat_en: 'Manpower Related', cat_hi: 'मानव शक्ति संबंधित', desc_en: 'Operator Not Available', desc_hi: 'ऑपरेटर अनुपलब्ध' },
  { code: 'DT-602', cat_en: 'Manpower Related', cat_hi: 'मानव शक्ति संबंधित', desc_en: 'Supervisor Not Available', desc_hi: 'सुपरवाइजर अनुपलब्ध' },

  // Others
  { code: 'DT-999', cat_en: 'Others', cat_hi: 'अन्य', desc_en: 'Other', desc_hi: 'अन्य अनिर्दिष्ट कारण' },
];
