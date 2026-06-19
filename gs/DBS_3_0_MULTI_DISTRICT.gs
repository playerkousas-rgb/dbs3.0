/**
 * =============================================================================
 * DBS 3.0 多區專科徽章平台 - Apps Script 後端（Multi-District Edition）
 * =============================================================================
 * 模板日期: 2026-06-15
 * 1. 支援空白 Google Sheet 一鍵初始化
 * 2. 所有地區資料改由 Config 控制
 * 3. Email links 自動帶 d=區碼
 * 4. 新增 getHealthCheck 接入檢查 API
 * =============================================================================
 */

var CONFIG = {
  SHEET_NAME: 'DBS_Badge_System_v3',
  DEFAULT_FRONTEND_URL: 'https://districtbadgesystem30.vercel.app',
  DEFAULT_DISTRICT_CODE: 'NEW',
  DEFAULT_DISTRICT_NAME: '請填寫區名',
  LEADER_CONFIRM_TIMEOUT_HOURS: 72,
  EXAM_DEADLINE_DAYS: 90,
  AUTO_REMINDER_DAYS: 60,
  EXAMINER_SOURCE_ID: '',
  STATUS: {
    PENDING_PARENT: '待家長確認',
    PENDING_LEADER: '待團長確認',
    PENDING_DISTRICT: '待區批核',
    PENDING_EXAMINER_ACCEPT: '已指派待主考接受',
    ASSIGNED_EXAMINER: '已派主考進行中',
    EXAM_COMPLETED_PASS: '考驗合格待製證書',
    EXAM_COMPLETED_FAIL: '不合格',
    CERTIFICATE_READY: '證書待領取',
    COMPLETED: '已完成',
    EXPIRED: '逾期不合格'
  },
  EXAM_ARRANGEMENT: {
    SELF_APPLY: '童軍成員自行報考',
    APPROVED_COURSE: '認可訓練班',
    EXAM_DAY: '專章考驗日',
    OTHER_ARRANGEMENT: '其他安排',
    CERTIFICATE_EXCHANGE: '證書換專章'
  }
};

// ============================================================
// A. 試算表初始化與連線
// ============================================================

function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty('DBS_SHEET_ID');
  if (sheetId) return SpreadsheetApp.openById(sheetId);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到綁定的 Spreadsheet，請先在 Google Sheet 內貼上此 GS 並執行 setupSystem()');

  props.setProperty('DBS_SHEET_ID', ss.getId());
  return ss;
}

function initializeSheets(ss) {
  var ownerEmail = Session.getEffectiveUser().getEmail() || '';
  var sheetsConfig = [
    {
      name: 'README_新手必看',
      headers: ['項目', '說明'],
      data: getReadmeSheetData_().slice(1)
    },
    {
      name: 'Config',
      headers: ['Key', 'Value', 'Description'],
      data: [
        ['DISTRICT_CODE', CONFIG.DEFAULT_DISTRICT_CODE, '【必填】區碼（建議 3-4 個英文字，例如 SKW / CHW）'],
        ['DISTRICT_NAME', CONFIG.DEFAULT_DISTRICT_NAME, '【必填】顯示於前端及 email 的地區名稱'],
        ['CURRENT_TERM_START', '2025-04-01', '主考任期開始日期'],
        ['CURRENT_TERM_END', '2027-03-31', '主考任期結束日期'],
        ['EMAIL_REPLY_TO', ownerEmail, '【必填】系統通知及秘書聯絡電郵（請自行更新）'],
        ['ADC_EMAIL', ownerEmail, '【必填】ADC 主考申請通知收件人（請自行更新）'],
        ['LEADER_TIMEOUT_HOURS', '72', '團長確認時限（小時）'],
        ['EXAM_DEADLINE_DAYS', '90', '考核完成限期（日）'],
        ['NEXT_APPLICATION_ID', '1', '下一個申請編號流水號'],
        ['NEXT_CERTIFICATE_ID', '1', '下一個證書隊列編號流水號'],
        ['CERT_SEQ_2025', '1', '2025 年度證書流水號'],
        ['CERT_SEQ_2026', '1', '2026 年度證書流水號'],
        ['WEB_APP_URL', '', '【Deploy 後必填】貼上你的 Apps Script /exec URL，並用這條 URL 提交接入'],
        ['FRONTEND_URL', CONFIG.DEFAULT_FRONTEND_URL, '前端網址（已預設平台網址，一般不用改）'],
        ['STAFF_TOKEN', 'change-this-staff-token', '【必填】秘書後台密鑰（請立即更改）'],
        ['ADC_TOKEN', 'change-this-adc-token', '【必填】ADC 審批密鑰（請立即更改）'],
        ['API_KEY_HASH', '', 'setup 自動生成；API_KEY 的 SHA-256 雜湊值，用於驗證前端請求。明文不會儲存在此。'],
        ['CERT_SIGNER_TITLE_CN', '助理區總監(童軍)', '證書簽發人中文'],
        ['CERT_SIGNER_TITLE_EN', 'Assistant District Commissioner (Scouts)', '證書簽發人英文'],
        ['CERT_SIGNER_LABEL_CN', '助理區總監(童軍)', '證書中文職銜'],
        ['CERT_SIGNER_LABEL_EN', 'Assistant District Commissioner (Scouts)', '證書英文職銜'],
        ['SYSTEM_VERSION', 'DBS 3.0 Multi-District', '系統版本'],
        ['LAST_PATCH_APPLIED', '', '最近一次 patch 記錄（可留空）']
      ]
    },
    { name: 'Groups', headers: ['group_id', 'group_number', 'group_name', 'leader_name', 'leader_email', 'assistant_leader_email', 'district_area', 'updated_at'], data: getMockGroupsData_() },
    { name: 'BadgeCodes', headers: ['badge_name', 'badge_code', 'badge_name_en', 'category', 'category_en', 'full_title', 'active', 'duplicate', 'Remark'], data: getDefaultBadgeCodesData_() },
    { name: 'Examiners', headers: ['examiner_id', 'name', 'unit', 'email', 'phone', 'district_badges', 'group_badges', 'term_start', 'term_end', 'status', 'current_load', 'max_load', 'updated_at'], data: [] },
    {
      name: 'Applications',
      headers: [
        'application_id', 'submitted_at', 'member_name', 'member_name_en', 'group_id',
        'phone', 'email',
        'parent_name', 'parent_email', 'parent_confirmed_at', 'parent_confirmed_by',
        'ym_number', 'badge_name', 'badge_category',
        'exam_arrangement_type', 'self_examiner_name', 'course_name', 'query_code',
        'leader_confirmed_at', 'leader_confirmed_by',
        'district_approved_at', 'district_approved_by',
        'assigned_examiner_id', 'assigned_at', 'examiner_accepted', 'decline_reason',
        'exam_deadline',
        'result', 'result_remarks', 'result_date', 'result_submitted_by',
        'certificate_number', 'certificate_ready_at',
        'picked_up_by', 'picked_up_at',
        'status', 'remarks', 'audit_log'
      ],
      data: []
    },
    { name: 'CertificateQueue', headers: ['certificate_id', 'application_id', 'member_name', 'group_id', 'badge_name', 'result_date', 'certificate_number', 'print_status', 'printed_at', 'ready_at', 'notified_at', 'picked_up_by', 'picked_up_at', 'notes'], data: [] },
    {
      name: 'CertificatePrintList',
      headers: ['資料列', '考獲日期', '證書編號', '中文姓名', '英文姓名', '旅號', '旅號(中)', '旅號(英)', '專科徽章組別及名稱', '專章組別', 'Group', '專章名稱', '徽章編號', 'Proficiency Badges', 'SL_CSL_ESL_Title', 'SL_Title_E', 'application_id', 'print_batch', 'added_timestamp', 'reprint_count', 'last_reprint_at'],
      data: []
    },
    { name: 'AuditLog', headers: ['log_id', 'timestamp', 'action', 'application_id', 'user_email', 'details', 'ip_address'], data: [] },
    { name: 'ExaminerAppointments', headers: ['appointment_id', 'examiner_id', 'badge_name', 'term_start', 'term_end', 'approved_by', 'approved_at', 'application_form_url', 'status', 'renewal_reminder_sent', 'notes'], data: [] },
    { name: 'ExaminerMatrix', headers: ['姓名', '單位'], data: [] }
  ];

  sheetsConfig.forEach(function(config) {
    var sheet = ss.getSheetByName(config.name);
    if (!sheet) {
      sheet = ss.insertSheet(config.name);
      sheet.appendRow(config.headers);
      sheet.setFrozenRows(1);
      if (config.name === 'ExaminerMatrix') sheet.setFrozenColumns(2);
      if (config.name === 'CertificatePrintList') {
        var widths = [60,100,180,100,120,60,140,200,180,80,100,120,80,180,180,180,140,120,150,80,150];
        widths.forEach(function(w, idx) { sheet.setColumnWidth(idx + 1, w); });
      } else {
        sheet.setColumnWidth(1, 180);
      }
      config.data.forEach(function(row) { sheet.appendRow(row); });
    }
  });

  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);

  buildExaminerMatrixHeader_(ss);
  setSheetColorsAndVisibility_(ss);
}



function getDefaultBadgeCodesData_() {
  return [
    ["釣魚", "IAN", "Angler", "興趣", "Interest", "興趣 - 釣魚", "TRUE", "1", ""],
    ["愛護動物", "IAC", "Animal Care", "興趣", "Interest", "興趣 - 愛護動物", "TRUE", "1", ""],
    ["射箭", "IAR", "Archery", "興趣", "Interest", "興趣 - 射箭", "TRUE", "1", ""],
    ["藝術", "IAT", "Artist", "興趣", "Interest", "興趣 - 藝術", "TRUE", "1", ""],
    ["運動", "IAH", "Athlete", "興趣", "Interest", "興趣 - 運動", "TRUE", "1", ""],
    ["營地烹飪", "ICC", "Camp Cook", "興趣", "Interest", "興趣 - 營地烹飪", "TRUE", "1", ""],
    ["獨木舟", "ICA", "Canoeist", "興趣", "Interest", "興趣 - 獨木舟", "TRUE", "1", ""],
    ["搜集", "ICO", "Collector", "興趣", "Interest", "興趣 - 搜集", "TRUE", "1", ""],
    ["電腦", "ICP", "Computer", "興趣", "Interest", "興趣 - 電腦", "TRUE", "1", ""],
    ["單車", "ICY", "Cyclist", "興趣", "Interest", "興趣 - 單車", "TRUE", "1", ""],
    ["龍舟", "IDB", "Dragon Boatman", "興趣", "Interest", "興趣 - 龍舟", "TRUE", "1", ""],
    ["步操", "IFO", "Footdrill", "興趣", "Interest", "興趣 - 步操", "TRUE", "1", ""],
    ["地質", "IGE", "Geologist", "興趣", "Interest", "興趣 - 地質", "TRUE", "1", ""],
    ["騎術", "IHO", "Horseman", "興趣", "Interest", "興趣 - 騎術", "TRUE", "1", ""],
    ["風箏", "IKF", "Kite Flyer", "興趣", "Interest", "興趣 - 風箏", "TRUE", "1", ""],
    ["圖書管理", "ILI", "Librarian", "興趣", "Interest", "興趣 - 圖書管理", "TRUE", "1", ""],
    ["氣象", "IME", "Meteorologist", "興趣", "Interest", "興趣 - 氣象", "TRUE", "1", ""],
    ["模型製作", "IMM", "Model Maker", "興趣", "Interest", "興趣 - 模型製作", "TRUE", "1", ""],
    ["音樂", "IMU", "Musician", "興趣", "Interest", "興趣 - 音樂", "TRUE", "1", ""],
    ["自然", "INA", "Naturalist", "興趣", "Interest", "興趣 - 自然", "TRUE", "1", ""],
    ["公園定向", "IPO", "Park Orienteer", "興趣", "Interest", "興趣 - 公園定向", "TRUE", "1", ""],
    ["攝影", "IPH", "Photographer", "興趣", "Interest", "興趣 - 攝影", "TRUE", "1", ""],
    ["划艇", "IRO", "Rowing Boatman", "興趣", "Interest", "興趣 - 划艇", "TRUE", "1", ""],
    ["風帆", "ISA", "Sailor", "興趣", "Interest", "興趣 - 風帆", "TRUE", "1", ""],
    ["農務", "ISM", "Smallholder", "興趣", "Interest", "興趣 - 農務", "TRUE", "1", ""],
    ["游泳", "ISW", "Swimmer", "興趣", "Interest", "興趣 - 游泳", "TRUE", "1", ""],
    ["旅遊", "ITO", "Tourism", "興趣", "Interest", "興趣 - 旅遊", "TRUE", "1", ""],
    ["滑浪風帆", "IWI", "Windsurfer", "興趣", "Interest", "興趣 - 滑浪風帆", "TRUE", "1", ""],
    ["觀鳥", "IBW", "Birdwatcher", "興趣", "Interest", "興趣 - 觀鳥", "TRUE", "1", ""],
    ["射箭", "PAR", "Archery", "技能", "Pursuit", "技能 - 射箭", "TRUE", "1", ""],
    ["天象", "PAS", "Astronomer", "技能", "Pursuit", "技能 - 天象", "TRUE", "1", ""],
    ["航空領航", "PAN", "Aviation Navigator", "技能", "Pursuit", "技能 - 航空領航", "TRUE", "1", ""],
    ["原野烹飪", "PBA", "Backwoods cook", "技能", "Pursuit", "技能 - 原野烹飪", "TRUE", "1", ""],
    ["艇長", "PBO", "Boatswain", "技能", "Pursuit", "技能 - 艇長", "TRUE", "1", ""],
    ["露營", "PCM", "Camper", "技能", "Pursuit", "技能 - 露營", "TRUE", "1", ""],
    ["獨木舟水球", "PCP", "Canoe Polo", "技能", "Pursuit", "技能 - 獨木舟水球", "TRUE", "1", ""],
    ["獨木舟", "PCA", "Canoeist", "技能", "Pursuit", "技能 - 獨木舟", "TRUE", "1", ""],
    ["通訊", "PCO", "Communicator", "技能", "Pursuit", "技能 - 通訊 (A)", "TRUE", "2", ""],
    ["通訊", "PCO", "Communicator", "技能", "Pursuit", "技能 - 通訊 (B)", "TRUE", "2", ""],
    ["電腦", "PCT", "Computer", "技能", "Pursuit", "技能 - 電腦", "TRUE", "1", ""],
    ["烹飪 (中式)", "PCD", "Cook (Chinese Dishes)", "技能", "Pursuit", "技能 - 烹飪 (中式)", "TRUE", "1", ""],
    ["手藝", "PCR", "Craftsman", "技能", "Pursuit", "技能 - 手藝 (釘書)", "TRUE", "5", ""],
    ["手藝", "PCR", "Craftsman", "技能", "Pursuit", "技能 - 手藝 (木工)", "TRUE", "5", ""],
    ["手藝", "PCR", "Craftsman", "技能", "Pursuit", "技能 - 手藝 (皮工)", "TRUE", "5", ""],
    ["手藝", "PCR", "Craftsman", "技能", "Pursuit", "技能 - 手藝 (印刷)", "TRUE", "5", ""],
    ["手藝", "PCR", "Craftsman", "技能", "Pursuit", "技能 - 手藝 (籐工)", "TRUE", "5", ""],
    ["電子", "PEL", "Electronics", "技能", "Pursuit", "技能 - 電子", "TRUE", "1", ""],
    ["探險", "PEX", "Explorer", "技能", "Pursuit", "技能 - 探險", "TRUE", "1", ""],
    ["步操", "PFO", "Footdrill", "技能", "Pursuit", "技能 - 步操", "TRUE", "1", ""],
    ["模擬飛行", "PFS", "Flight Simulator", "技能", "Pursuit", "技能 - 模擬飛行", "TRUE", "1", "STC"],
    ["獨木舟國際賽艇", "PIR", "International Racing Kayak", "技能", "Pursuit", "技能 - 獨木舟國際賽艇", "TRUE", "1", ""],
    ["地圖繪製", "PMM", "Map Maker", "技能", "Pursuit", "技能 - 地圖繪製", "TRUE", "1", ""],
    ["地圖閱讀", "PMR", "Map Reader", "技能", "Pursuit", "技能 - 地圖閱讀", "TRUE", "1", ""],
    ["射擊", "PMS", "Marksman", "技能", "Pursuit", "技能 - 射擊", "TRUE", "1", ""],
    ["技擊", "PMA", "Master-at-arms", "技能", "Pursuit", "技能 - 技擊", "TRUE", "1", ""],
    ["機械", "PMC", "Mechanic", "技能", "Pursuit", "技能 - 機械", "TRUE", "1", ""],
    ["氣象", "PME", "Meteorologist", "技能", "Pursuit", "技能 - 氣象", "TRUE", "1", ""],
    ["多媒體創作", "PMD", "Multimedia Designer", "技能", "Pursuit", "技能 - 多媒體創作", "TRUE", "1", ""],
    ["領航", "PNA", "Navigator", "技能", "Pursuit", "技能 - 領航", "TRUE", "1", ""],
    ["觀察", "POB", "Observer", "技能", "Pursuit", "技能 - 觀察", "TRUE", "1", ""],
    ["野外定向", "POR", "Orienteer", "技能", "Pursuit", "技能 - 野外定向", "TRUE", "1", ""],
    ["先鋒工程", "PPI", "Pioneer", "技能", "Pursuit", "技能 - 先鋒工程", "TRUE", "1", ""],
    ["編程", "PPR", "Programmer", "技能", "Pursuit", "技能 - 編程", "TRUE", "1", ""],
    ["風帆賽艇舵手", "PRH", "Race Helmsman", "技能", "Pursuit", "技能 - 風帆賽艇舵手", "TRUE", "1", ""],
    ["風帆", "PSA", "Sailor", "技能", "Pursuit", "技能 - 風帆", "TRUE", "1", ""],
    ["徒手潛水", "PSD", "Skin Diver", "技能", "Pursuit", "技能 - 徒手潛水", "TRUE", "1", ""],
    ["體育", "PSP", "Sportsman", "技能", "Pursuit", "技能 - 體育", "TRUE", "1", ""],
    ["樹木護理", "PTC", "Tree Carer", "技能", "Pursuit", "技能 - 樹木護理", "TRUE", "1", ""],
    ["國際友誼", "PWF", "World Friendship", "技能", "Pursuit", "技能 - 國際友誼", "TRUE", "1", ""],
    ["營地管理", "SCW", "Camp Warden", "服務", "Service", "服務 - 營地管理", "TRUE", "1", ""],
    ["獨木舟救生", "SCR", "Canoe Rescuer", "服務", "Service", "服務 - 獨木舟救生", "TRUE", "1", ""],
    ["公民", "SCI", "Civis", "服務", "Service", "服務 - 公民", "TRUE", "1", ""],
    ["護養", "SCO", "Conservator", "服務", "Service", "服務 - 護養", "TRUE", "2", "Accept - 舊舵手"],
    ["共融", "SDA", "Disability Awareness", "服務", "Service", "服務 - 共融", "TRUE", "1", ""],
    ["環境保護", "SEP", "Environmental Protection", "服務", "Service", "服務 - 環境保護", "TRUE", "1", ""],
    ["消防", "SFI", "Fireman", "服務", "Service", "服務 - 消防", "TRUE", "1", ""],
    ["急救", "SFA", "First Aider", "服務", "Service", "服務 - 急救", "TRUE", "1", ""],
    ["指引", "SGU", "Guide", "服務", "Service", "服務 - 指引", "TRUE", "1", ""],
    ["語言", "SIN", "Interpreter", "服務", "Service", "服務 - 語言 (英語)", "TRUE", "2", ""],
    ["語言", "SIN", "Interpreter", "服務", "Service", "服務 - 語言 (普通話)", "TRUE", "2", ""],
    ["工藝", "SJO", "Jobman", "服務", "Service", "服務 - 工藝", "TRUE", "1", ""],
    ["拯溺", "SLI", "Lifesaver", "服務", "Service", "服務 - 拯溺", "TRUE", "1", ""],
    ["精神健康", "SMH", "Mental Health Ambassador", "服務", "Service", "服務 - 精神健康", "TRUE", "1", ""],
    ["食物營養", "SNU", "Nutritionist", "服務", "Service", "服務 - 食物營養", "TRUE", "1", ""],
    ["領港", "SPI", "Pilot", "服務", "Service", "服務 - 領港", "TRUE", "1", ""],
    ["公共衛生", "SPH", "Public Health Ambassador", "服務", "Service", "服務 - 公共衛生", "TRUE", "1", ""],
    ["物資管理", "SQU", "Quartermaster", "服務", "Service", "服務 - 物資管理", "TRUE", "1", ""],
    ["秘書", "SSE", "Secretary", "服務", "Service", "服務 - 秘書", "TRUE", "1", ""],
    ["天象", "INAS", "Astronomer", "教導", "Instructor", "教導 - 天象", "TRUE", "1", ""],
    ["原野烹飪", "INBA", "Backswoodcook", "教導", "Instructor", "教導 - 原野烹飪", "TRUE", "1", ""],
    ["露營", "INCA", "Camper", "教導", "Instructor", "教導 - 露營", "TRUE", "1", ""],
    ["通訊", "INCM", "Communicator", "教導", "Instructor", "教導 - 通訊", "TRUE", "1", ""],
    ["護養", "INCO", "Conservator", "教導", "Instructor", "教導 - 護養", "TRUE", "1", ""],
    ["烹飪（中式）", "INCD", "Cook (Chinese Dishes)", "教導", "Instructor", "教導 - 烹飪（中式）", "TRUE", "1", ""],
    ["單車", "INCY", "Cyclist", "教導", "Instructor", "教導 - 單車", "TRUE", "1", ""],
    ["模型飛行", "INFS", "Flight Simulator", "教導", "Instructor", "教導 - 模型飛行", "TRUE", "1", ""],
    ["林務", "INFO", "Forester", "教導", "Instructor", "教導 - 林務", "TRUE", "1", ""],
    ["拯溺", "INLI", "Lifesaver", "教導", "Instructor", "教導 - 拯溺", "TRUE", "1", ""],
    ["地圖繪製", "INMM", "Map Maker", "教導", "Instructor", "教導 - 地圖繪製", "TRUE", "1", ""],
    ["機械", "INMC", "Mechanic", "教導", "Instructor", "教導 - 機械", "TRUE", "1", ""],
    ["氣象", "INME", "Meteorologist", "教導", "Instructor", "教導 - 氣象", "TRUE", "1", ""],
    ["多媒體創作", "INMD", "Multimedia Designer", "教導", "Instructor", "教導 - 多媒體創作", "TRUE", "1", ""],
    ["觀察", "INOB", "Observer", "教導", "Instructor", "教導 - 觀察", "TRUE", "1", ""],
    ["野外定向", "INOR", "Orienteer", "教導", "Instructor", "教導 - 野外定向", "TRUE", "1", ""],
    ["攝影", "INPH", "Photographer", "教導", "Instructor", "教導 - 攝影", "TRUE", "1", ""],
    ["先鋒工程", "INPI", "Pioneer", "教導", "Instructor", "教導 - 先鋒工程", "TRUE", "1", ""],
    ["風帆", "INSA", "Sailor", "教導", "Instructor", "教導 - 風帆", "TRUE", "1", ""],
    ["游泳", "INSW", "Swimmer", "教導", "Instructor", "教導 - 游泳", "TRUE", "1", ""],
    ["樹木護理", "INTC", "Tree Carer", "教導", "Instructor", "教導 - 樹木護理", "TRUE", "1", ""],
    ["社區參與章", "CIB", "Community Involvement Badge", "其他", "Other", "社區參與", "TRUE", "1", ""],
    ["艇工", "SOA", "Oarsman", "其他", "Other", "艇工", "TRUE", "1", ""],
    ["水手", "SBM", "Boatman", "其他", "Other", "水手", "TRUE", "1", ""],
    ["水手長", "SBW", "Boatswain", "其他", "Other", "水手長", "TRUE", "1", ""],
    ["初級航空活動", "BAA", "Basic Air Activity", "其他", "Other", "初級航空活動", "TRUE", "1", ""],
    ["中級航空活動", "IAA", "Intermediate Air Activity", "其他", "Other", "中級航空活動", "TRUE", "1", ""],
    ["高級航空活動", "AAA", "Advanced Air Activity", "其他", "Other", "高級航空活動", "TRUE", "1", ""],
    ["繩結", "SKC", "Knotting", "其他", "Other", "繩結", "TRUE", "1", ""],
    ["領導才", "SLTC", "Leadership Training", "其他", "Other", "領導才", "TRUE", "1", ""],
    ["宗教章", "SRB", "Religious Badge", "其他", "Other", "宗教章", "TRUE", "1", ""],
    ["維護自然世界章", "WCB", "World Conservation Badge", "其他", "Other", "維護自然世界", "TRUE", "1", ""],
    ["世界童軍環境章", "WSE", "World Scout Environment Badge", "其他", "Other", "世界童軍環境", "TRUE", "1", ""],
    ["深資童軍先修章", "VSL", "Venture Scout Link Badge", "其他", "Other", "深資童軍先修", "TRUE", "1", ""],
    ["航空", "SAM", "Airman", "舊", "", "航空", "", "1", "Delete"],
    ["高級航空", "SSA", "Senior Airman", "舊", "", "高級航空", "", "1", "Delete"],
    ["優異航空", "SMA", "Master Airman", "舊", "", "優異航空", "", "1", "Delete"],
    ["副舵手", "SCM", "Coxswain's Mate", "舊", "", "副舵手", "", "1", "Delete"],
    ["舵手", "SCO", "Coxswain", "舊", "", "舵手", "", "2", "Delete"]
  ];
}

function getMockGroupsData_() {
  return [
    ['G-001', '1', '第1旅（例子，請改成你區資料）', '請填團長姓名', 'group1@example.com', '', '請填地區', Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyyy-MM-dd')],
    ['G-002', '2', '第2旅（例子，請改成你區資料）', '請填團長姓名', 'group2@example.com', '', '請填地區', Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyyy-MM-dd')]
  ];
}

function getReadmeSheetData_() {
  return [
    ['項目', '說明'],
    ['先做這 4 步', '1) 先執行 setupSystem() → 2) 通過 Google 權限授權 → 3) 回 Config 填黃底欄位 → 4) Deploy 為 Web App 拿 /exec URL'],
    ['你要改的工作表（有顏色）', '黃色 Config：必填設定；綠色 Groups：填你區旅團資料；藍色 ExaminerMatrix：填主考 D / G。BadgeCodes 已預載最新章目，但預設隱藏，不用你手建。'],
    ['Config 必填', 'DISTRICT_CODE、DISTRICT_NAME、EMAIL_REPLY_TO、ADC_EMAIL、STAFF_TOKEN、ADC_TOKEN。FRONTEND_URL 已預設平台網址，一般不用改。Deploy 後把 /exec URL 貼回 WEB_APP_URL。'],
    ['Groups 怎樣填', '每列 1 位領袖 / 1 個旅團。例：group_id=G-001、group_number=1、group_name=第1旅、leader_name=陳大文、leader_email=group1@example.com'],
    ['BadgeCodes 怎樣用', '已預載最新章目，預設隱藏，一般不用自己重建，也不用日常手改。新章正確做法＝貼平台更新檔 GS 並 Run 1 次。'],
    ['ExaminerMatrix 怎樣填', 'A 欄=主考姓名，B 欄=單位（例如：第1旅），C 欄起每個章填 D 或 G。D=區主考，G=旅團主考。已有主考名單可直接批量填這張表，不用重新申請。'],
    ['Examiner 三表關係', 'ExaminerMatrix = 人工維護主表；Examiners = 前端實際讀取名單；ExaminerAppointments = 新主考自行申請 / ADC 審批流程表。初始化現有名單請改 ExaminerMatrix，不是 ExaminerAppointments。'],
    ['新章正確流程', '新章 = 貼平台提供的更新檔 GS + Run 1 次；如再改主考資格 = 改 ExaminerMatrix + 同步主考資料。'],
    ['進階工作表', 'BadgeCodes、Applications、CertificateQueue、CertificatePrintList、AuditLog、ExaminerAppointments、Examiners 預設隱藏，因為一般不用手改；如要查看，可用選單顯示。'],
    ['如何拿 URL', 'Apps Script 內按 Deploy → New deployment → 類型選 Web App → Who has access 選 Anyone → Deploy → 複製 /exec URL'],
    ['如何通知平台接入', '把 /exec URL 和 API Key 一起提交到前端「申請接入」頁面。API Key 在 setup 彈窗只顯示一次，忘記了請用選單 → 重新生成 API Key。'],
    ['🛡️ 你的資料有多安全？', ''],
    ['資料存放在哪？', 'Google 伺服器（Google Sheet），不是某台不知名的電腦。'],
    ['API Key 存放在哪？', 'Vercel 伺服器環境變數，不出現在任何前端代碼。'],
    ['Config 存了甚麼？', '只有 API Key 的 SHA-256 雜湊值（API_KEY_HASH），連管理員也無法還原。'],
    ['攻擊門檻', '要取得你的資料，攻擊者要麼攻破 Google 伺服器，要麼攻破 Vercel 伺服器。比存在自己家裡的電腦更安全。'],
    ['健康檢查', '用瀏覽器打開：你的 /exec URL + ?action=getHealthCheck。看到 ready=true 才算完成。'],
    ['固定版權', '© 2026 SKWSCOUT SYSTEM']
  ];
}

function setSheetColorsAndVisibility_(ss) {
  var visibleColors = {
    'README_新手必看': '#8e24aa',
    'Config': '#fbc02d',
    'Groups': '#43a047',
    'BadgeCodes': '#fb8c00',
    'ExaminerMatrix': '#1e88e5'
  };
  Object.keys(visibleColors).forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (sh) sh.setTabColor(visibleColors[name]);
  });

  ['Applications', 'CertificateQueue', 'CertificatePrintList', 'AuditLog', 'ExaminerAppointments', 'Examiners'].forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (sh && !sh.isSheetHidden()) sh.hideSheet();
  });
}

function buildExaminerMatrixHeader_(ss) {
  var sh = ss.getSheetByName('ExaminerMatrix');
  if (!sh) return;
  var titles = getActiveFullTitles_();
  if (titles.length === 0) return;
  var header = ['姓名', '單位'].concat(titles);
  var values = sh.getDataRange().getValues();
  var hasRealHeader = values.length > 0 && values[0] && values[0][2];
  if (!hasRealHeader) {
    sh.clear();
    sh.getRange(1, 1, 1, header.length).setValues([header]);
    sh.setFrozenRows(1);
    sh.setFrozenColumns(2);
  }
}

function showAdvancedSheets() {
  var ss = getSpreadsheet();
  ['BadgeCodes', 'Applications', 'CertificateQueue', 'CertificatePrintList', 'AuditLog', 'ExaminerAppointments', 'Examiners'].forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (sh && sh.isSheetHidden()) sh.showSheet();
  });
  SpreadsheetApp.getUi().alert('已顯示進階工作表');
}

function hideAdvancedSheets() {
  var ss = getSpreadsheet();
  ['BadgeCodes', 'Applications', 'CertificateQueue', 'CertificatePrintList', 'AuditLog', 'ExaminerAppointments', 'Examiners'].forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (sh && !sh.isSheetHidden()) sh.hideSheet();
  });
  SpreadsheetApp.getUi().alert('已隱藏進階工作表');
}

// ============================================================
// B. 工具函數
// ============================================================

function getConfig(key) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Config');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) { if (data[i][0] === key) return data[i][1]; }
  return null;
}

function setConfig(key, value) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Config');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) { sheet.getRange(i + 1, 2).setValue(value); return; }
  }
  sheet.appendRow([key, value, '']);
}

function getDistrictCode_() {
  return String(getConfig('DISTRICT_CODE') || CONFIG.DEFAULT_DISTRICT_CODE || 'NEW').trim().toUpperCase();
}

function getDistrictName_() {
  return String(getConfig('DISTRICT_NAME') || CONFIG.DEFAULT_DISTRICT_NAME || '請填寫區名').trim();
}

function getFrontendUrl_() {
  return String(getConfig('FRONTEND_URL') || CONFIG.DEFAULT_FRONTEND_URL || '').replace(/\/$/, '');
}

function getEmailReplyTo_() {
  var v = String(getConfig('EMAIL_REPLY_TO') || '').trim();
  return v || Session.getEffectiveUser().getEmail() || '';
}

function getSystemLabel_() {
  return getDistrictName_() + '專科徽章系統';
}

function buildFrontendLink_(path, params) {
  var base = getFrontendUrl_();
  var d = getDistrictCode_();
  var q = [];
  q.push('d=' + encodeURIComponent(d));
  params = params || {};
  for (var k in params) {
    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
      q.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    }
  }
  return base + path + '?' + q.join('&');
}


function generateApplicationId() {
  var now = new Date();
  var dateStr = Utilities.formatDate(now, 'Asia/Hong_Kong', 'yyMMdd');
  var nextId = parseInt(getConfig('NEXT_APPLICATION_ID') || '1');
  var id = getDistrictCode_() + '-' + dateStr + '-' + ('0000' + nextId).slice(-4);
  setConfig('NEXT_APPLICATION_ID', nextId + 1);
  return id;
}

function generateQueryCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }

function generateCertificateId() {
  var nextId = parseInt(getConfig('NEXT_CERTIFICATE_ID') || '1');
  var id = 'CERT-' + ('00000' + nextId).slice(-5);
  setConfig('NEXT_CERTIFICATE_ID', nextId + 1);
  return id;
}

function getNextCertSequence() {
  var year = Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyyy');
  var configKey = 'CERT_SEQ_' + year;
  var seq = parseInt(getConfig(configKey) || '1');
  setConfig(configKey, seq + 1);
  return { year: year, seq: seq };
}

function generateCertificateNumber(badgeName) {
  var badgeCode = getBadgeCode(badgeName);
  var cs = getNextCertSequence();
  return badgeCode + '/HKIR/' + cs.year + '/' + getDistrictCode_() + '/' + ('000' + cs.seq).slice(-3);
}

function numberToOrdinal(n) {
  n = parseInt(n);
  var s = ["th", "st", "nd", "rd"];
  var v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getBadgeCode(badgeName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('BadgeCodes');
  if (!sheet) return 'GEN';
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === badgeName && (data[i][6] === true || data[i][6] === 'TRUE' || data[i][6] === '✔')) return data[i][1];
  }
  return 'GEN';
}

function getBadgeFullData(badgeFullTitleOrName) {
  var sheet = getSpreadsheet().getSheetByName('BadgeCodes');
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  // 優先用 full_title 比對（欄 5），找不到再退回 badge_name（欄 0）
  for (var i = 1; i < data.length; i++) {
    var active = data[i][6];
    if (!(active === '✔' || active === true || active === 'TRUE')) continue;
    if (data[i][5] === badgeFullTitleOrName || data[i][0] === badgeFullTitleOrName) {
      return {
        badgeName:   data[i][0],   // 用於列印（手藝/單車）
        badgeCode:   data[i][1],   // 用於 cert code（PMA/IBI）
        badgeNameEn: data[i][2],
        category:    data[i][3],   // 用於列印（技能/興趣）
        categoryEn:  data[i][4],
        fullTitle:   data[i][5]
      };
    }
  }
  return { badgeName: badgeFullTitleOrName, badgeCode: 'GEN', badgeNameEn: badgeFullTitleOrName, category: '其他', categoryEn: 'Others', fullTitle: badgeFullTitleOrName };
}

function getGroupFullData(groupId) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Groups');
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  var leaders = [];
  var baseRow = null;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === groupId) {
      if (!baseRow) baseRow = data[i];
      if (data[i][3]) leaders.push(data[i][3]);
    }
  }
  if (!baseRow) return { groupId: groupId, groupNumber: '', groupName: groupId, groupNameCn: groupId, groupNameEn: groupId, leaderName: '', leaderEmail: '', hasLeader: false };
  var num = baseRow[1];
  return {
    groupId: groupId, groupNumber: num, groupName: baseRow[2],
    groupNameCn: '第' + num + '旅', groupNameEn: numberToOrdinal(num) + ' Group',
    leaderName: leaders.join('、'),
    leaderTitle: leaders.length > 0 ? leaders.map(function(n){ return n + ' 團長'; }).join('、') : baseRow[2] + ' 負責領袖',
    leaderEmail: baseRow[4], assistantLeaderEmail: baseRow[5],
    hasLeader: leaders.length > 0
  };
}

function getGroupName(groupId) { var info = getGroupFullData(groupId); return info ? info.groupName : groupId; }

function addAuditLog(action, applicationId, userEmail, details) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('AuditLog');
  var timestamp = new Date().toISOString();
  var logId = sheet.getLastRow();
  sheet.appendRow([logId, timestamp, action, applicationId, userEmail, details, '']);
}

function sendSystemEmail(to, subject, body, options) {
  if (!to) { Logger.log('收件人為空，跳過'); return false; }
  try {
    var BR = String.fromCharCode(60) + 'br' + String.fromCharCode(62);
    var htmlBody = String(body).split('\n').join(BR);
    var replyTo = getEmailReplyTo_();

    var mailOptions = {
      name: getSystemLabel_(),
      htmlBody: htmlBody
    };
    if (replyTo) mailOptions.replyTo = replyTo;

    var subj = String(subject);
    var bccKeywords = ['批核', '合格', '逾期', '失敗', '證書', '主考申請', '審批', '不合格', '到期'];
    var shouldBcc = replyTo && bccKeywords.some(function(k) { return subj.indexOf(k) >= 0; });
    if (shouldBcc) mailOptions.bcc = replyTo;

    if (options) { for (var k in options) mailOptions[k] = options[k]; }

    GmailApp.sendEmail(to, subject, body, mailOptions);
    Logger.log('Email 已寄出: ' + to + ' / ' + subject + (shouldBcc ? ' [BCC replyTo]' : ''));
    return true;
  } catch (e) {
    Logger.log('Email 寄送失敗 (' + to + '): ' + e.message);
    return false;
  }
}

function generateToken(prefix, applicationId, extraData, expiryHours) {
  var expiry = new Date();
  expiry.setHours(expiry.getHours() + (expiryHours || 72));
  return Utilities.base64Encode(JSON.stringify({ prefix: prefix, appId: applicationId, extra: extraData || {}, exp: expiry.getTime(), rand: Math.random().toString(36).substring(2, 10) }));
}

function verifyToken(tokenStr, expectedPrefix) {
  try {
    var tokenData = JSON.parse(Utilities.newBlob(Utilities.base64Decode(tokenStr)).getDataAsString());
    if (tokenData.prefix !== expectedPrefix) return null;
    if (new Date().getTime() > tokenData.exp) return null;
    return tokenData;
  } catch (e) { return null; }
}

function getColIndex(headers, colName) { return headers.indexOf(colName); }
function getAppValue(row, headers, colName) {
  var col = headers.indexOf(colName);
  if (col === -1) return '';
  return row[col] || '';
}
function setAppCell(sheet, rowIndex, headers, colName, value) {
  var col = headers.indexOf(colName);
  if (col === -1) return;
  sheet.getRange(rowIndex + 1, col + 1).setValue(value);
}

// ============================================================
// C. Web App 路由 (支援 Sync)
// ============================================================

function doGet(e) {
  // ★ API Key 認證
  var requiredApiKeyHash = getConfig('API_KEY_HASH');
  if (requiredApiKeyHash) {
    if (sha256_(e.parameter.apiKey || '') !== requiredApiKeyHash) {
      return ContentService.createTextOutput(JSON.stringify({success:false,error:'Unauthorized: invalid or missing apiKey'})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  var action = e.parameter.action;
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  try {
    var result;
    switch (action) {
      case 'getStatus': result = apiGetStatus(e.parameter.appId, e.parameter.ymNumber); break;
      case 'getPendingCertificates': result = apiGetPendingCertificates(); break;
      case 'getActiveExaminers': result = apiGetActiveExaminers(); break;
      case 'getBadgeCodes': result = apiGetBadgeCodes(); break;
      case 'getGroups': result = apiGetGroups(); break;
      case 'getPrintList': result = apiGetPrintList({ staffToken: e.parameter.token }); break;
      case 'verifyLeaderToken': result = { success: true, token: e.parameter.token }; break;
      case 'verifyExaminerToken': result = { success: true, token: e.parameter.token }; break;
      case 'syncExaminers': result = apiSyncExaminers({ staffToken: e.parameter.token }); break; // 支援 GET 測試
      case 'getHealthCheck': result = apiGetHealthCheck(); break;
      default: result = { success: false, error: '未知動作' };
    }
    output.setContent(JSON.stringify(result));
  } catch (err) { output.setContent(JSON.stringify({ success: false, error: err.toString() })); }
  return output;
}

function doPost(e) {
  // ★ API Key 認證
  var data = JSON.parse(e.postData.contents);
  var requiredApiKeyHash = getConfig('API_KEY_HASH');
  if (requiredApiKeyHash) {
    if (sha256_(data.apiKey || '') !== requiredApiKeyHash) {
      return ContentService.createTextOutput(JSON.stringify({success:false,error:'Unauthorized: invalid or missing apiKey'})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  var action = data.action;
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  try {
    var result;
    switch (action) {
      case 'submitApplication': result = apiSubmitApplication(data); break;
      case 'adcGetPending': result = apiAdcGetPending(data); break;
      case 'adcApprove':    result = apiAdcApprove(data);    break;
      case 'adcVerify':     result = apiAdcVerify(data);     break;
      case 'getExaminerAppointmentStatus': result = apiGetExaminerAppointmentStatus(data); break;
      case 'parentConfirm': result = apiParentConfirm(data); break;
      case 'leaderConfirm': result = apiLeaderConfirm(data); break;
      case 'districtApprove': result = apiDistrictApprove(data); break;
      case 'examinerAccept': result = apiExaminerAccept(data); break;
      case 'examinerDecline': result = apiExaminerDecline(data); break;
      case 'examinerSubmitResult': result = apiExaminerSubmitResult(data); break;
      case 'markCertificateReady': result = apiMarkCertificateReady(data); break;
      case 'markCertificatePickedUp': result = apiMarkCertificatePickedUp(data); break;
      case 'adminGetPendingApplications': result = apiAdminGetPendingApplications(data); break;
      case 'adminGetDashboard': result = apiAdminGetDashboard(data); break;
      case 'approveExaminerAppointment': result = apiApproveExaminerAppointment(data); break;
      case 'getPrintList': result = apiGetPrintList(data); break;
      case 'reprintCertificate': result = apiReprintCertificate(data); break;
      case 'updateSignerTitle': result = apiUpdateSignerTitle(data); break;
      case 'overrideExaminer': result = apiOverrideExaminer(data); break;
      case 'submitExaminerApplication': result = apiSubmitExaminerApplication(data); break;
      case 'partialApproveExaminer': result = apiPartialApproveExaminer(data); break;
      case 'recalculateLoads': result = apiRecalculateLoads(data); break;
      case 'syncExaminers': result = apiSyncExaminers(data); break; // 👈 新增同步功能
      case 'adminGetCertificates': result = apiAdminGetCertificates(data); break;
      case 'getCertificate':       result = apiGetCertificate(data); break;

      default: result = { success: false, error: '未知動作' };
      
    }
    output.setContent(JSON.stringify(result));
  } catch (err) { output.setContent(JSON.stringify({ success: false, error: err.toString() })); }
  return output;
}

// ============================================================
// C2. 動態資料 API
// ============================================================

function apiGetBadgeCodes() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('BadgeCodes');
  if (!sheet) return { success: false, error: '找不到 BadgeCodes 工作表' };
  var data = sheet.getDataRange().getValues();
  var badges = [];
  for (var i = 1; i < data.length; i++) {
    var active = data[i][6];
    if (active === '✔' || active === true || active === 'TRUE') {
      badges.push({ badgeName: data[i][0], badgeCode: data[i][1], badgeNameEn: data[i][2], category: data[i][3], categoryEn: data[i][4], fullTitle: data[i][5], remark: data[i][8] || '' });
    }
  }
  return { success: true, badges: badges };
}

function apiGetGroups() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Groups');
  if (!sheet) return { success: false, error: '找不到 Groups 工作表' };
  var data = sheet.getDataRange().getValues();
  var seen = {};
  for (var i = 1; i < data.length; i++) {
    var gid = data[i][0];
    if (!gid) continue;
    if (!seen[gid]) { seen[gid] = { groupId: data[i][0], groupNumber: data[i][1], groupName: data[i][2], leaders: [], leaderEmail: data[i][4], assistantLeaderEmail: data[i][5], districtArea: data[i][6] }; }
    if (data[i][3]) seen[gid].leaders.push(data[i][3]);
  }
  var groups = [];
  for (var key in seen) {
    var g = seen[key];
    groups.push({
      groupId: g.groupId, groupNumber: g.groupNumber, groupName: g.groupName,
      leaderName: g.leaders.length > 0 ? g.leaders.join('、') : '',
      leaderTitle: g.leaders.length > 0 ? g.leaders.map(function(n){ return n + ' 團長'; }).join('、') : g.groupName + ' 負責領袖',
      leaderEmail: g.leaderEmail, hasLeader: g.leaders.length > 0, districtArea: g.districtArea
    });
  }
  return { success: true, groups: groups };
}

function apiGetActiveExaminers() {
  var ss = getSpreadsheet();
  var exSheet = ss.getSheetByName('Examiners');
  if (!exSheet) return { success: true, examiners: [] };
  var exData = exSheet.getDataRange().getValues();
  var exH = exData[0];
  var now = new Date();
  var result = [];

  // 過濾雜訊（#N/A 等）
  var clean = function(raw) {
    return String(raw || '').split(',')
      .map(function(s){ return s.trim(); })
      .filter(function(s){ return s && s !== '#N/A' && s !== '#REF!' && s !== 'NULL'; });
  };

  for (var i = 1; i < exData.length; i++) {
    var status = exData[i][exH.indexOf('status')];
    var termEnd = new Date(exData[i][exH.indexOf('term_end')]);
    if (status !== 'ACTIVE' || termEnd <= now) continue;

    var dList = clean(exData[i][exH.indexOf('district_badges')]);
    var gList = clean(exData[i][exH.indexOf('group_badges')]);
    var qualifiedBadges = [];
    dList.forEach(function(ft){ qualifiedBadges.push({ badgeName: ft, fullTitle: ft, scope: 'D' }); });
    gList.forEach(function(ft){ qualifiedBadges.push({ badgeName: ft, fullTitle: ft, scope: 'G' }); });
    if (qualifiedBadges.length === 0) continue;

    result.push({
      name: exData[i][exH.indexOf('name')],
      unit: exData[i][exH.indexOf('unit')] || '',
      examinerId: exData[i][exH.indexOf('examiner_id')] || '',
      email: exData[i][exH.indexOf('email')] || '',
      phone: exData[i][exH.indexOf('phone')] || '',
      qualifiedBadges: qualifiedBadges,
      districtBadges: dList,
      groupBadges: gList,
      totalBadgeCount: qualifiedBadges.length,
      currentLoad: parseInt(exData[i][exH.indexOf('current_load')] || '0'),
      maxLoad: parseInt(exData[i][exH.indexOf('max_load')] || '5')
    });
  }
  return { success: true, examiners: result };
}
// ============================================================
// D. 報考申請
// ============================================================

function apiSubmitApplication(data) {
  var ss = getSpreadsheet();
  var required = ['memberName', 'groupId', 'phone', 'email', 'ymNumber', 'badgeName', 'examArrangementType', 'parentName', 'parentEmail'];
  for (var f = 0; f < required.length; f++) { if (!data[required[f]]) return { success: false, error: '缺少必填欄位: ' + required[f] }; }
  var validTypes = Object.keys(CONFIG.EXAM_ARRANGEMENT);
  if (validTypes.indexOf(data.examArrangementType) === -1) return { success: false, error: '無效的考驗安排類型' };
  var groupInfo = getGroupFullData(data.groupId);
  if (!groupInfo || groupInfo.groupName === data.groupId) return { success: false, error: '無效的團體代碼' };
  var appId = generateApplicationId();
  var queryCode = generateQueryCode();
  var now = new Date(), nowStr = now.toISOString();
  var webAppUrl = getConfig('WEB_APP_URL') || ScriptApp.getService().getUrl();
  var appSheet = ss.getSheetByName('Applications');
  var headers = appSheet.getRange(1, 1, 1, appSheet.getLastColumn()).getValues()[0];
  var newRow = [];
  for (var c = 0; c < headers.length; c++) {
    var h = headers[c];
    switch (h) {
      case 'application_id': newRow.push(appId); break;
      case 'submitted_at': newRow.push(nowStr); break;
      case 'member_name': newRow.push(data.memberName || ''); break;
      case 'member_name_en': newRow.push(data.memberNameEn || ''); break;
      case 'group_id': newRow.push(data.groupId || ''); break;
      case 'phone': newRow.push(data.phone || ''); break; // 修正語法
      case 'email': newRow.push(data.email || ''); break; // 修正語法
      case 'parent_name': newRow.push(data.parentName || ''); break;
      case 'parent_email': newRow.push(data.parentEmail || ''); break;
      case 'parent_confirmed_at': newRow.push(''); break;
      case 'parent_confirmed_by': newRow.push(''); break;
      case 'ym_number': newRow.push(data.ymNumber || ''); break;
      case 'badge_name': newRow.push(data.badgeName || ''); break;
      case 'badge_category': newRow.push(data.badgeCategory || ''); break;
      case 'exam_arrangement_type': newRow.push(data.examArrangementType || ''); break;
      case 'self_examiner_name': newRow.push(data.selfExaminerName || ''); break;
      case 'course_name': newRow.push(data.courseName || ''); break;
      case 'query_code': newRow.push(queryCode); break;
      case 'status': newRow.push(CONFIG.STATUS.PENDING_PARENT); break;
      case 'remarks': newRow.push(data.remarks || ''); break;
      case 'audit_log': newRow.push(JSON.stringify([{time: nowStr, action: 'APPLICATION_SUBMITTED', by: data.email}])); break;
      default: newRow.push(''); break;
    }
  }
  appSheet.appendRow(newRow);

  var parentToken = generateToken('parent', appId, { queryCode: queryCode }, 168);
  var frontendUrl = getFrontendUrl_();
  var parentConfirmUrl = buildFrontendLink_('/parent-confirm', { token: parentToken });
  sendSystemEmail(data.parentEmail, '【'+ getDistrictName_() +'專科徽章】' + data.memberName + ' 報考 ' + data.badgeName + ' — 需要家長確認',
    (data.parentName || '家長') + '您好：\n\n您的子女 ' + data.memberName + '（童軍成員編號：' + data.ymNumber + '）已提交專科徽章「' + data.badgeName + '」的報考申請。\n\n申請編號：' + appId + '\n考驗安排：' + CONFIG.EXAM_ARRANGEMENT[data.examArrangementType] + '\n所屬旅團：' + groupInfo.groupName + '\n\n請點擊以下連結確認同意：\n' + parentConfirmUrl + '\n\n'+ getSystemLabel_() +'');
  addAuditLog('PARENT_NOTIFICATION_SENT', appId, 'system', '發送家長確認電郵至 ' + data.parentEmail);

  sendSystemEmail(data.email, '【'+ getDistrictName_() +'專科徽章】已收到報考申請 - ' + data.memberName,
    data.memberName + ' 您好：\n\n您的專科徽章「' + data.badgeName + '」報考申請已成功提交。\n\n申請編號：' + appId + '\n查詢驗證碼：' + queryCode + '\n目前狀態：待家長確認\n\n系統已發送確認電郵給您的家長。\n\n'+ getSystemLabel_() +'');
  addAuditLog('APPLICATION_SUBMITTED', appId, data.email, '成員透過網站提交，YMIS=' + data.ymNumber);
  return { success: true, applicationId: appId, queryCode: queryCode, status: CONFIG.STATUS.PENDING_PARENT };
}

// D2. 家長確認
function apiParentConfirm(data) {
  var tokenData = verifyToken(data.token, 'parent');
  if (!tokenData) return { success: false, error: '連結已失效或無效' };
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Applications');
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var rowIndex = -1;
  for (var i = 1; i < allData.length; i++) { if (getAppValue(allData[i], headers, 'application_id') === tokenData.appId) { rowIndex = i; break; } }
  if (rowIndex === -1) return { success: false, error: '找不到申請記錄' };
  var currentStatus = getAppValue(allData[rowIndex], headers, 'status');
  if (currentStatus !== CONFIG.STATUS.PENDING_PARENT) return { success: false, error: '此申請已不在「待家長確認」狀態，目前狀態：' + currentStatus };
  var nowStr = new Date().toISOString();
  setAppCell(sheet, rowIndex, headers, 'parent_confirmed_at', nowStr);
  setAppCell(sheet, rowIndex, headers, 'parent_confirmed_by', 'via_email_link');
  setAppCell(sheet, rowIndex, headers, 'status', CONFIG.STATUS.PENDING_LEADER);
  addAuditLog('PARENT_CONFIRMED', tokenData.appId, 'parent', '家長透過電郵連結確認');

  var groupId = getAppValue(allData[rowIndex], headers, 'group_id');
  var memberName = getAppValue(allData[rowIndex], headers, 'member_name');
  var badgeName = getAppValue(allData[rowIndex], headers, 'badge_name');
  var ymNumber = getAppValue(allData[rowIndex], headers, 'ym_number');
  var groupInfo = getGroupFullData(groupId);
  var webAppUrl = getConfig('WEB_APP_URL') || ScriptApp.getService().getUrl();
  var leaderToken = generateToken('leader', tokenData.appId, { queryCode: tokenData.extra.queryCode || '' }, 72);
  var frontendUrl = getFrontendUrl_();
  var leaderConfirmUrl = buildFrontendLink_('/leader-confirm', { token: leaderToken });
  if (groupInfo && groupInfo.leaderEmail) {
    var leaderDisplayName = groupInfo.hasLeader ? groupInfo.leaderTitle : groupInfo.groupName + ' 負責領袖';
    sendSystemEmail(groupInfo.leaderEmail, '【'+ getDistrictName_() +'專科徽章】請確認團員報考申請 - ' + memberName,
      leaderDisplayName + '您好：\n\n貴團團員 ' + memberName + '（' + ymNumber + '）已提交專科徽章「' + badgeName + '」的報考申請，家長已確認同意。\n\n申請編號：' + tokenData.appId + '\n\n請於 72 小時內點擊以下連結確認：\n' + leaderConfirmUrl + '\n\n此電郵確認等同團長簽署及蓋印。\n\n'+ getSystemLabel_() +'');
    addAuditLog('LEADER_NOTIFICATION_SENT', tokenData.appId, 'system', '發送團長確認至 ' + groupInfo.leaderEmail);
    if (groupInfo.assistantLeaderEmail) {
      sendSystemEmail(groupInfo.assistantLeaderEmail, '【副本】團員報考專科徽章申請 - ' + memberName, '助理團長您好：\n\n貴團團員 ' + memberName + ' 申報考專科徽章「' + badgeName + '」。\n團長已收到確認連結，此為知會。\n\n申請編號：' + tokenData.appId);
    }
  }
  return { success: true, message: '感謝確認！申請已轉交團長審批。' };
}

// E. 團長確認
function apiLeaderConfirm(data) {
  var tokenData = verifyToken(data.token, 'leader');
  if (!tokenData) return { success: false, error: '連結已失效或無效' };
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Applications');
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var rowIndex = -1;
  for (var i = 1; i < allData.length; i++) { if (getAppValue(allData[i], headers, 'application_id') === tokenData.appId) { rowIndex = i; break; } }
  if (rowIndex === -1) return { success: false, error: '找不到申請記錄' };
  setAppCell(sheet, rowIndex, headers, 'leader_confirmed_at', new Date().toISOString());
  setAppCell(sheet, rowIndex, headers, 'leader_confirmed_by', data.leaderEmail || '團長確認連結');
  setAppCell(sheet, rowIndex, headers, 'status', CONFIG.STATUS.PENDING_DISTRICT);
  var memberEmail = getAppValue(allData[rowIndex], headers, 'email');
  var memberName = getAppValue(allData[rowIndex], headers, 'member_name');
  var badgeName = getAppValue(allData[rowIndex], headers, 'badge_name');
  
  
  // ★ 新增：通知 DBS 有新申請待審批
  var groupIdForDbs = getAppValue(allData[rowIndex], headers, 'group_id');
  var ymForDbs = getAppValue(allData[rowIndex], headers, 'ym_number');
  var adminUrl = buildFrontendLink_('/admin');
  sendSystemEmail(getEmailReplyTo_(), 
    '【'+ getDistrictName_() +'專科徽章】新申請待審批 - ' + memberName + ' / ' + badgeName,
    '專章秘書您好：\n\n以下申請已完成家長及團長確認，等候您於後台批核：\n\n' +
    '申請編號：' + tokenData.appId + '\n' +
    '考生姓名：' + memberName + '\n' +
    'YMIS：' + ymForDbs + '\n' +
    '所屬旅團：' + groupIdForDbs + '\n' +
    '報考專章：' + badgeName + '\n\n' +
    '【進入後台審批】' + adminUrl + '\n\n' +
    getSystemLabel_());
  
  addAuditLog('LEADER_CONFIRMED', tokenData.appId, data.leaderEmail || 'token', '團長透過連結確認');
  addAuditLog('DBS_NOTIFICATION_SENT', tokenData.appId, 'system', '已通知 DBS 待批');
  return { success: true, message: '團長確認成功' };
}

// F. 區會審批
function apiDistrictApprove(data) {
  // 權限檢查（如果你的函數已有就跳過這段）
  if (!data.staffToken || data.staffToken !== getConfig('STAFF_TOKEN')) {
    return { success: false, error: '權限不足' };
  }
  
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Applications');
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var rowIndex = -1;
  for (var i = 1; i < allData.length; i++) { if (getAppValue(allData[i], headers, 'application_id') === data.applicationId) { rowIndex = i; break; } }
  if (rowIndex === -1) return { success: false, error: '找不到申請記錄' };
  var appData = allData[rowIndex];
  var badgeName = getAppValue(appData, headers, 'badge_name');
  var examArrType = getAppValue(appData, headers, 'exam_arrangement_type');
  var selfExaminerName = getAppValue(appData, headers, 'self_examiner_name');
  var now = new Date(), nowStr = now.toISOString();
  if (examArrType === 'CERTIFICATE_EXCHANGE' || examArrType === 'APPROVED_COURSE' || examArrType === 'EXAM_DAY') {
    setAppCell(sheet, rowIndex, headers, 'district_approved_at', nowStr);
    setAppCell(sheet, rowIndex, headers, 'district_approved_by', data.approvedBy || '秘書後台');
    setAppCell(sheet, rowIndex, headers, 'status', CONFIG.STATUS.EXAM_COMPLETED_PASS);
    addAuditLog('DISTRICT_APPROVED', data.applicationId, data.approvedBy, examArrType + ' 無需派主考');
    return { success: true, message: '已批核（' + CONFIG.EXAM_ARRANGEMENT[examArrType] + '）' };
  }
  var assignedExaminerId = '', assignedExaminerName = '', assignedExaminerEmail = '', assignedExaminerPhone = '';
  if (examArrType === 'SELF_APPLY' && selfExaminerName) {
    var examinersSheet = ss.getSheetByName('Examiners');
    var examinersData = examinersSheet.getDataRange().getValues();
    var exH = examinersData[0];
    for (var i = 1; i < examinersData.length; i++) {
      var exName = examinersData[i][exH.indexOf('name')];
      var exStatus = examinersData[i][exH.indexOf('status')];
      var exEnd = new Date(examinersData[i][exH.indexOf('term_end')]);
      var dBadges = (examinersData[i][exH.indexOf('district_badges')] || '').toString();
      var gBadges = (examinersData[i][exH.indexOf('group_badges')] || '').toString();
      var allBadges = dBadges + ',' + gBadges;
      if (exName === selfExaminerName && exStatus === 'ACTIVE' && exEnd > now && allBadges.indexOf(badgeName) >= 0) {
        assignedExaminerId = examinersData[i][exH.indexOf('examiner_id')];
        assignedExaminerName = exName;
        assignedExaminerEmail = examinersData[i][exH.indexOf('email')];
        assignedExaminerPhone = examinersData[i][exH.indexOf('phone')];
        break;
      }
    }
    if (!assignedExaminerId) return { success: false, error: '自行安排的主考不在授權名單內', requiresManualOverride: true };
  }
  if (data.overrideExaminerId && !assignedExaminerId) {
    var overrideEx = _getActiveExaminersForAdmin_().find(function(e){ return e.examinerId === data.overrideExaminerId; });
    if (overrideEx) {
      assignedExaminerId = overrideEx.examinerId;
      assignedExaminerName = overrideEx.name;
      assignedExaminerEmail = overrideEx.email;
      assignedExaminerPhone = overrideEx.phone;
    }
  }
  if (!assignedExaminerId) {
    var autoAssign = autoAssignExaminer(badgeName);
    if (autoAssign) { assignedExaminerId = autoAssign.examinerId; assignedExaminerName = autoAssign.name; assignedExaminerEmail = autoAssign.email; assignedExaminerPhone = autoAssign.phone; }
  }
  if (!assignedExaminerId) return { success: false, error: '未能自動指派主考，請手動指派' };
  setAppCell(sheet, rowIndex, headers, 'district_approved_at', nowStr);
  setAppCell(sheet, rowIndex, headers, 'district_approved_by', data.approvedBy || '秘書後台');
  setAppCell(sheet, rowIndex, headers, 'assigned_examiner_id', assignedExaminerId);
  setAppCell(sheet, rowIndex, headers, 'assigned_at', nowStr);
  setAppCell(sheet, rowIndex, headers, 'examiner_accepted', 'pending');
  setAppCell(sheet, rowIndex, headers, 'status', CONFIG.STATUS.PENDING_EXAMINER_ACCEPT);
  updateExaminerLoad(assignedExaminerId, 1);
  var memberName = getAppValue(appData, headers, 'member_name');
  var memberPhone = getAppValue(appData, headers, 'phone');
  var memberEmail = getAppValue(appData, headers, 'email');
  var webAppUrl = getConfig('WEB_APP_URL') || ScriptApp.getService().getUrl();
  var acceptToken = generateToken('exAccept', data.applicationId, { examinerId: assignedExaminerId }, 48);
  var declineToken = generateToken('exDecline', data.applicationId, { examinerId: assignedExaminerId }, 48);
  if (assignedExaminerEmail) {
    var deadline = new Date(); deadline.setDate(deadline.getDate() + CONFIG.EXAM_DEADLINE_DAYS);
    sendSystemEmail(assignedExaminerEmail, '【'+ getDistrictName_() +'專科徽章】新考核指派 - ' + badgeName,
      '主考 ' + assignedExaminerName + ' 您好：\n\n您已被指派為以下考核的主考：\n\n考生：' + memberName + '\n專章：' + badgeName + '\n申請編號：' + data.applicationId + '\n考生電話：' + memberPhone + '\n\n考核限期：' + Utilities.formatDate(deadline, 'Asia/Hong_Kong', 'yyyy年MM月dd日') + '\n\n【接受指派】' + buildFrontendLink_('/examiner-accept', { token: acceptToken }) + '\n【拒絕指派】' + buildFrontendLink_('/examiner-decline', { token: declineToken }) + '\n\n'+ getSystemLabel_() +'');
  }
  
  addAuditLog('DISTRICT_APPROVED', data.applicationId, data.approvedBy, '批核並指派主考 ' + assignedExaminerId);
  return { success: true, message: '已批核並指派主考', assignedExaminer: { id: assignedExaminerId, name: assignedExaminerName } };
}

// G. 主考接受 / 拒絕
function apiExaminerAccept(data) {
  var tokenData = verifyToken(data.token, 'exAccept');
  if (!tokenData) return { success: false, error: '連結已失效或無效' };
  
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Applications');
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var rowIndex = -1;
  for (var i = 1; i < allData.length; i++) { 
    if (getAppValue(allData[i], headers, 'application_id') === tokenData.appId) { rowIndex = i; break; } 
  }
  if (rowIndex === -1) return { success: false, error: '找不到申請記錄' };
  
  var currentAccepted = getAppValue(allData[rowIndex], headers, 'examiner_accepted');
  if (currentAccepted === 'accepted') {
    return { success: false, error: '此考核已接受，請勿重複操作' };
  }
  
  var deadline = new Date(); 
  deadline.setDate(deadline.getDate() + CONFIG.EXAM_DEADLINE_DAYS);
  setAppCell(sheet, rowIndex, headers, 'examiner_accepted', 'accepted');
  setAppCell(sheet, rowIndex, headers, 'exam_deadline', Utilities.formatDate(deadline, 'Asia/Hong_Kong', 'yyyy-MM-dd'));
  setAppCell(sheet, rowIndex, headers, 'status', CONFIG.STATUS.ASSIGNED_EXAMINER);
  
  var memberEmail = getAppValue(allData[rowIndex], headers, 'email');
  var memberName  = getAppValue(allData[rowIndex], headers, 'member_name');
  var memberPhone = getAppValue(allData[rowIndex], headers, 'phone');
  var badgeName   = getAppValue(allData[rowIndex], headers, 'badge_name');
  var examinerId  = getAppValue(allData[rowIndex], headers, 'assigned_examiner_id');
  var examinerName  = getExaminerNameById(examinerId);
  var examinerEmail = getExaminerEmailById(examinerId);
  var examinerPhone = getExaminerPhoneById(examinerId);
  var frontendUrl = getFrontendUrl_();
  var deadlineStr = Utilities.formatDate(deadline, 'Asia/Hong_Kong', 'yyyy年MM月dd日');
  
  // ★ 寄信給考生（這是考生第一次收到主考資料，重點信）
  if (memberEmail) {
    var contactInfo = '';
    if (examinerEmail) contactInfo += '\n主考電郵：' + examinerEmail;
    if (examinerPhone) contactInfo += '\n主考電話：' + examinerPhone;
    if (!contactInfo) contactInfo = '\n（主考聯絡方式請聯絡專章秘書 '+ getEmailReplyTo_() +' 索取）';
    
    sendSystemEmail(memberEmail, '【'+ getDistrictName_() +'專科徽章】主考已確認 - ' + badgeName + '（請即聯絡）',
      memberName + ' 您好：\n\n您的「' + badgeName + '」考核主考已確認接受指派。\n\n' +
      '📌 主考：' + examinerName + contactInfo + '\n\n' +
      '⏰ 考核限期：' + deadlineStr + '\n\n' +
      '請盡快主動聯絡主考安排考核時間。\n考核完成後，主考會在系統內回報成績。\n\n' +
      '申請編號：' + tokenData.appId + '\n\n' +
      getSystemLabel_());
  }
  
  // ★ 寄信給主考（含成績提交連結）
  if (examinerEmail) {
    var submitToken = generateToken('examiner', tokenData.appId, { examinerId: examinerId }, 24 * 90);
    var submitUrl = buildFrontendLink_('/examiner-submit', { token: submitToken });
    sendSystemEmail(examinerEmail, '【'+ getDistrictName_() +'專科徽章】已接受指派 - ' + badgeName + '（請收藏此電郵）',
      examinerName + ' 主考您好：\n\n感謝您接受此項考核工作。\n\n' +
      '📋 考核資料：\n' +
      '考生：' + memberName + '\n' +
      '考生電話：' + memberPhone + '\n' +
      '專章：' + badgeName + '\n' +
      '申請編號：' + tokenData.appId + '\n' +
      '考核限期：' + deadlineStr + '\n\n' +
      '完成考核後，請點擊以下連結提交結果：\n' +
      '【🎯 提交考核結果】' + submitUrl + '\n\n' +
      '（此連結有效期 90 天，請收藏此電郵直至考核完成）\n\n' +
      getSystemLabel_());
  }
  
  addAuditLog('EXAMINER_ACCEPTED', tokenData.appId, examinerId, '主考確認接受');
  return { success: true, message: '已確認接受指派' };
}

function apiExaminerDecline(data) {
  var tokenData = verifyToken(data.token, 'exDecline');
  if (!tokenData) return { success: false, error: '連結已失效或無效' };
  if (!data.reason) return { success: false, error: '請提供拒絕原因' };
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Applications');
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var rowIndex = -1;
  for (var i = 1; i < allData.length; i++) { if (getAppValue(allData[i], headers, 'application_id') === tokenData.appId) { rowIndex = i; break; } }
  if (rowIndex === -1) return { success: false, error: '找不到申請記錄' };
  var oldExaminerId = getAppValue(allData[rowIndex], headers, 'assigned_examiner_id');
  var badgeName = getAppValue(allData[rowIndex], headers, 'badge_name');
  var memberName = getAppValue(allData[rowIndex], headers, 'member_name');
  setAppCell(sheet, rowIndex, headers, 'examiner_accepted', 'declined');
  setAppCell(sheet, rowIndex, headers, 'decline_reason', data.reason);
  if (oldExaminerId) updateExaminerLoad(oldExaminerId, -1);
  var newAssign = autoAssignExaminer(badgeName, oldExaminerId);
  if (!newAssign) {
    setAppCell(sheet, rowIndex, headers, 'assigned_examiner_id', '');
    setAppCell(sheet, rowIndex, headers, 'status', CONFIG.STATUS.PENDING_DISTRICT);
    addAuditLog('EXAMINER_DECLINED', tokenData.appId, oldExaminerId, '拒絕：' + data.reason + '。無其他主考');
    return { success: false, error: '主考已拒絕，無其他主考可分配' };
  }
  var nowStr = new Date().toISOString();
  setAppCell(sheet, rowIndex, headers, 'assigned_examiner_id', newAssign.examinerId);
  setAppCell(sheet, rowIndex, headers, 'assigned_at', nowStr);
  setAppCell(sheet, rowIndex, headers, 'examiner_accepted', 'pending');
  setAppCell(sheet, rowIndex, headers, 'decline_reason', '');
  updateExaminerLoad(newAssign.examinerId, 1);
  var webAppUrl = getConfig('WEB_APP_URL') || ScriptApp.getService().getUrl();
  var acceptToken = generateToken('exAccept', tokenData.appId, { examinerId: newAssign.examinerId }, 48);
  var declineToken = generateToken('exDecline', tokenData.appId, { examinerId: newAssign.examinerId }, 48);
  if (newAssign.email) {
    sendSystemEmail(newAssign.email, '【'+ getDistrictName_() +'專科徽章】新考核指派（重新分配）- ' + badgeName,
      '主考 ' + newAssign.name + ' 您好：\n\n由於原先指派的主考工作繁忙，現重新指派您。\n考生：' + memberName + '\n專章：' + badgeName + '\n\n【接受指派】' + buildFrontendLink_('/examiner-accept', { token: acceptToken }) + '\n【拒絕指派】' + buildFrontendLink_('/examiner-decline', { token: declineToken }) + '\n\n'+ getSystemLabel_() +'');
  }
    addAuditLog('EXAMINER_DECLINED', tokenData.appId, oldExaminerId, '拒絕：' + data.reason + '。重新指派 ' + newAssign.examinerId);
  return { success: true, message: '已重新指派主考', newExaminer: newAssign };
}

// H. 主考提交成績
function apiExaminerSubmitResult(data) {
  var tokenData = verifyToken(data.token, 'examiner');
  if (!tokenData) return { success: false, error: '連結已失效或無效' };
  
  var ss = getSpreadsheet();
  var appSheet = ss.getSheetByName('Applications');
  var appData = appSheet.getDataRange().getValues();
  var headers = appData[0];
  var rowIndex = -1;
  for (var i = 1; i < appData.length; i++) { 
    if (getAppValue(appData[i], headers, 'application_id') === tokenData.appId) { rowIndex = i; break; } 
  }
  if (rowIndex === -1) return { success: false, error: '找不到申請記錄' };
  
  // 避免重複提交
  var existingResult = getAppValue(appData[rowIndex], headers, 'result');
  if (existingResult === 'PASS' || existingResult === 'FAIL') {
    return { success: false, error: '此考核結果已提交，請勿重複操作' };
  }
  
  var now = new Date().toISOString();
  var result = data.result;
  var remarks = data.remarks || '';
  
  setAppCell(appSheet, rowIndex, headers, 'result', result);
  setAppCell(appSheet, rowIndex, headers, 'result_remarks', remarks);
  setAppCell(appSheet, rowIndex, headers, 'result_date', now);
  setAppCell(appSheet, rowIndex, headers, 'result_submitted_by', '主考連結提交');
  
  var examinerId = getAppValue(appData[rowIndex], headers, 'assigned_examiner_id');
  var examinerName = getExaminerNameById(examinerId);
  var memberName = getAppValue(appData[rowIndex], headers, 'member_name');
  var memberEmail = getAppValue(appData[rowIndex], headers, 'email');
  var groupId = getAppValue(appData[rowIndex], headers, 'group_id');
  var groupInfoForLeader = getGroupFullData(groupId);
  var leaderEmail = groupInfoForLeader ? groupInfoForLeader.leaderEmail : '';
  var badgeName = getAppValue(appData[rowIndex], headers, 'badge_name');
  var ymNumber = getAppValue(appData[rowIndex], headers, 'ym_number');
  var adminUrl = buildFrontendLink_('/admin');
  
  if (examinerId) updateExaminerLoad(examinerId, -1);
  
  if (result === 'PASS') {
    setAppCell(appSheet, rowIndex, headers, 'status', CONFIG.STATUS.EXAM_COMPLETED_PASS);
    setAppCell(appSheet, rowIndex, headers, 'result', result); // 原有代碼
    setAppCell(appSheet, rowIndex, headers, 'result_remarks', remarks); // 原有代碼
    
    // ★ 新增這一行：補回考獲日期 ★
    setAppCell(appSheet, rowIndex, headers, 'result_date', now); 
    
    // 加進 CertificateQueue
    var certId = generateCertificateId();
    ss.getSheetByName('CertificateQueue').appendRow([
      certId, tokenData.appId, memberName, groupId, badgeName, 
      now, '', 'PENDING_PRINT', '', '', '', '', '', ''
    ]);
    
    // ★★★ v3.11: 合格時同步到 CertificatePrintList + 排序重編證書編號 ★★★
    try {
      syncToPrintListOnPass(ss, tokenData.appId, memberName, 
        getAppValue(appData[rowIndex], headers, 'member_name_en'),
        groupId, badgeName, now, examinerName, remarks);
    } catch (syncErr) {
      Logger.log('⚠️ CertificatePrintList 同步警告: ' + syncErr.toString());
    }
    
    // ★ 寄信給 DBS（新證書待製作）
    sendSystemEmail(getEmailReplyTo_(), 
      '【'+ getDistrictName_() +'專科徽章】新證書待製作 - ' + memberName + ' / ' + badgeName,
      '專章秘書您好：\n\n以下考核已合格，請製作證書：\n\n' +
      '證書隊列ID：' + certId + '\n' +
      '申請編號：' + tokenData.appId + '\n' +
      '考生：' + memberName + '（' + ymNumber + '）\n' +
      '旅團：' + groupId + '\n' +
      '專章：' + badgeName + '\n' +
      '主考：' + examinerName + '\n' +
      (remarks ? '主考評語：' + remarks + '\n' : '') + '\n' +
      '【進入後台處理】' + adminUrl + '\n\n' +
      getSystemLabel_());
    
     // ★ 寄信給考生與團長（合格通知）
    var recipients = [];
    if (memberEmail) recipients.push(memberEmail);
    if (leaderEmail && leaderEmail !== memberEmail) recipients.push(leaderEmail);
    
    if (recipients.length > 0) {
      sendSystemEmail(recipients.join(','), '【'+ getDistrictName_() +'專科徽章】🎉 考核合格 - ' + memberName + ' / ' + badgeName,
        '童軍成員 / 團長 您好：\n\n恭喜！本團童軍 ' + memberName + ' 的「' + badgeName + '」考核已合格！\n\n' +
        '✅ 結果：合格\n' +
        '主考：' + examinerName + '\n' +
        (remarks ? '主考評語：' + remarks + '\n' : '') + '\n' +
        '📌 下一步：證書製作中，完成後會另行通知領取。\n\n' +
        '申請編號：' + tokenData.appId + '\n\n' +
        getSystemLabel_());
    }
    
    addAuditLog('EXAMINER_RESULT_SUBMITTED', tokenData.appId, examinerId, '合格・評語：' + remarks);
    return { success: true, message: '已記錄合格，證書製作流程已啟動' };
    
  } else {
    setAppCell(appSheet, rowIndex, headers, 'status', CONFIG.STATUS.EXAM_COMPLETED_FAIL);
    
    // ★ 寄信給 DBS（不合格紀錄）
    sendSystemEmail(getEmailReplyTo_(),
      '【'+ getDistrictName_() +'專科徽章】考核不合格紀錄 - ' + memberName + ' / ' + badgeName,
      '專章秘書您好（紀錄通知）：\n\n' +
      '申請編號：' + tokenData.appId + '\n' +
      '考生：' + memberName + '（' + ymNumber + '）\n' +
      '旅團：' + groupId + '\n' +
      '專章：' + badgeName + '\n' +
      '主考：' + examinerName + '\n' +
      '結果：❌ 不合格\n' +
      (remarks ? '主考評語：' + remarks + '\n' : '') + '\n' +
      '系統已通知考生。\n\n' +
      getSystemLabel_());
    
    // ★ 寄信給考生（不合格通知）
    if (memberEmail) {
      sendSystemEmail(memberEmail, '【'+ getDistrictName_() +'專科徽章】考核結果通知 - ' + badgeName,
        memberName + ' 您好：\n\n您的「' + badgeName + '」考核結果如下：\n\n' +
        '❌ 結果：未能合格\n' +
        '主考：' + examinerName + '\n' +
        (remarks ? '主考評語：' + remarks + '\n' : '') + '\n' +
        '如有疑問，請聯絡主考或專章秘書 '+ getEmailReplyTo_() +'。\n\n' +
        '申請編號：' + tokenData.appId + '\n\n' +
        getSystemLabel_());
    }
    
    addAuditLog('EXAMINER_RESULT_SUBMITTED', tokenData.appId, examinerId, '不合格・評語：' + remarks);
    return { success: true, message: '已記錄不合格結果' };
  }
}
// I. 證書管理
function apiMarkCertificateReady(data) {
  var ss = getSpreadsheet();
  var certSheet = ss.getSheetByName('CertificateQueue');
  var certData = certSheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < certData.length; i++) { if (certData[i][0] === data.certificateId) { rowIndex = i; break; } }
  if (rowIndex === -1) return { success: false, error: '找不到證書記錄' };
  var now = new Date(), nowStr = now.toISOString();
  var appId = certData[rowIndex][1], badgeName = certData[rowIndex][4], memberName = certData[rowIndex][2];
  var certificateNumber = generateCertificateNumber(badgeName);
  certSheet.getRange(rowIndex + 1, 7).setValue(certificateNumber);
  certSheet.getRange(rowIndex + 1, 8).setValue('READY');
  certSheet.getRange(rowIndex + 1, 9).setValue(nowStr);
  certSheet.getRange(rowIndex + 1, 10).setValue(nowStr);
  var appSheet = ss.getSheetByName('Applications');
  var appData = appSheet.getDataRange().getValues();
  var appHeaders = appData[0];
  var appRow = -1;
  for (var i = 1; i < appData.length; i++) { if (getAppValue(appData[i], appHeaders, 'application_id') === appId) { appRow = i; break; } }
  if (appRow >= 0) {
    setAppCell(appSheet, appRow, appHeaders, 'certificate_number', certificateNumber);
    setAppCell(appSheet, appRow, appHeaders, 'certificate_ready_at', nowStr);
    setAppCell(appSheet, appRow, appHeaders, 'status', CONFIG.STATUS.CERTIFICATE_READY);
    var memberEmail = getAppValue(appData[appRow], appHeaders, 'email');
    var memberNameEn = getAppValue(appData[appRow], appHeaders, 'member_name_en');
    var groupId = getAppValue(appData[appRow], appHeaders, 'group_id');
    var resultDate = (getAppValue(appData[appRow], appHeaders, 'result_date') || nowStr).toString().split('T')[0];
    var badgeInfo = getBadgeFullData(badgeName);
    var groupInfo = getGroupFullData(groupId);
    var printSheet = ss.getSheetByName('CertificatePrintList');
    printSheet.appendRow([0, resultDate, certificateNumber, memberName, memberNameEn, groupInfo.groupNumber, groupInfo.groupNameCn, groupInfo.groupNameEn, badgeInfo.fullTitle, badgeInfo.category, badgeInfo.categoryEn, badgeInfo.badgeName, badgeInfo.badgeCode, badgeInfo.badgeNameEn, getConfig('CERT_SIGNER_TITLE_CN') || '', getConfig('CERT_SIGNER_TITLE_EN') || '', appId, 'BATCH-' + Utilities.formatDate(now, 'Asia/Hong_Kong', 'yyyyMMdd-HHmm'), nowStr, 0, '']);
    sortCertificatePrintListByDate();
    if (memberEmail) {
      sendSystemEmail(memberEmail, '【'+ getDistrictName_() +'專科徽章】證書已可領取', memberName + ' 您好：\n\n您的「' + badgeName + '」專科徽章證書（編號：' + certificateNumber + '）已製作完成，請到區會領取。\n\n'+ getSystemLabel_() +'');
      certSheet.getRange(rowIndex + 1, 11).setValue(nowStr);
    }
  }
  addAuditLog('CERTIFICATE_READY', appId, data.staffEmail || '秘書', '已標記可領取：' + certificateNumber);
  return { success: true, certificateNumber: certificateNumber };
}
// ★ 1. 後台拉取所有證書清單（給 /admin 證書管理 tab 用）
function apiAdminGetCertificates(data) {
  if (!data.staffToken || data.staffToken !== getConfig('STAFF_TOKEN')) {
    return { success: false, error: '權限不足' };
  }
  var ss = getSpreadsheet();
  var certSheet = ss.getSheetByName('CertificateQueue');
  if (!certSheet) return { success: true, certificates: [] };
  
  var data2 = certSheet.getDataRange().getValues();
  // 表頭：certificate_id, application_id, member_name, group_id, badge_name, 
  //       result_date, certificate_number, print_status, printed_at, ready_at, 
  //       notified_at, picked_up_by, picked_up_at, notes
  var certs = [];
  for (var i = 1; i < data2.length; i++) {
    if (!data2[i][0]) continue;
    certs.push({
      certificateId:    data2[i][0],
      applicationId:    data2[i][1],
      memberName:       data2[i][2],
      groupId:          data2[i][3],
      badgeName:        data2[i][4],
      resultDate:       data2[i][5] ? new Date(data2[i][5]).toISOString() : '',
      certificateNumber: data2[i][6],
      printStatus:      data2[i][7],
      printedAt:        data2[i][8],
      readyAt:          data2[i][9] ? new Date(data2[i][9]).toISOString() : '',
      notifiedAt:       data2[i][10],
      pickedUpBy:       data2[i][11],
      pickedUpAt:       data2[i][12] ? new Date(data2[i][12]).toISOString() : '',
      notes:            data2[i][13]
    });
  }
  // 排序：待製作 > 待領取 > 已領取
  var order = { 'PENDING_PRINT': 1, 'READY': 2, 'PICKED_UP': 3 };
  certs.sort(function(a, b) {
    var oa = order[a.printStatus] || 99;
    var ob = order[b.printStatus] || 99;
    if (oa !== ob) return oa - ob;
    return String(b.resultDate || '').localeCompare(String(a.resultDate || ''));
  });
  return { success: true, certificates: certs };
}

// ★ 2. 取得單張證書詳細資料（給列印頁用）
function apiGetCertificate(data) {
  if (!data.staffToken || data.staffToken !== getConfig('STAFF_TOKEN')) {
    return { success: false, error: '權限不足' };
  }
  if (!data.certificateId) return { success: false, error: '缺少 certificateId' };
  
  var ss = getSpreadsheet();
  
  // ★ 先從 CertificateQueue 找到 application_id
  var certSheet = ss.getSheetByName('CertificateQueue');
  if (!certSheet) return { success: false, error: '找不到 CertificateQueue' };
  
  var certData = certSheet.getDataRange().getValues();
  var found = null;
  for (var i = 1; i < certData.length; i++) {
    if (certData[i][0] === data.certificateId) {
      found = certData[i];
      break;
    }
  }
  if (!found) return { success: false, error: '找不到該證書' };
  
  var applicationId = found[1];
  var certNumber    = found[6];
  var readyAt       = found[9];
  
  // ★ 從 CertificatePrintList 讀取完整資料（D欄=中文姓名, E欄=英文姓名）
  var printSheet = ss.getSheetByName('CertificatePrintList');
  var memberName = '', memberNameEn = '', groupNameCn = '', groupNameEn = '';
  var groupNumber = '', badgeName = '', badgeNameEn = '';
  var category = '', categoryEn = '', badgeCode = '', fullTitle = '';
  var resultDate = '';
  
  if (printSheet) {
    var printData = printSheet.getDataRange().getValues();
    var printHeaders = printData[0];
    var appIdCol = printHeaders.indexOf('application_id');
    
    for (var i = 1; i < printData.length; i++) {
      if (appIdCol >= 0 && printData[i][appIdCol] === applicationId) {
        // ★ CertificatePrintList 欄位映射：
        // A=資料列, B=考獲日期, C=證書編號, D=中文姓名, E=英文姓名
        // F=旅號, G=旅號(中), H=旅號(英)
        // I=專科徽章組別及名稱, J=專章組別, K=Group
        // L=專章名稱, M=徽章編號, N=Proficiency Badges
        // O=SL_CSL_ESL_Title, P=SL_Title_E
        memberName = printData[i][3] || '';      // D欄：中文姓名
        memberNameEn = printData[i][4] || '';    // E欄：英文姓名
        groupNumber = printData[i][5] || '';     // F欄：旅號
        groupNameCn = printData[i][6] || '';     // G欄：旅號(中)
        groupNameEn = printData[i][7] || '';     // H欄：旅號(英)
        fullTitle = printData[i][8] || '';       // I欄：專科徽章組別及名稱
        category = printData[i][9] || '';        // J欄：專章組別
        categoryEn = printData[i][10] || '';     // K欄：Group
        badgeName = printData[i][11] || '';      // L欄：專章名稱
        badgeCode = printData[i][12] || '';      // M欄：徽章編號
        badgeNameEn = printData[i][13] || '';    // N欄：Proficiency Badges
        resultDate = printData[i][1] || '';      // B欄：考獲日期
        
        // 如果證書編號為空，從 PrintList 取
        if (!certNumber || certNumber === '') {
          certNumber = printData[i][2] || '';    // C欄：證書編號
        }
        break;
      }
    }
  }
  
  // ★ 如果 PrintList 沒有，fallback 到 Applications
  if (!memberName) {
    var appSheet = ss.getSheetByName('Applications');
    if (appSheet) {
      var appData = appSheet.getDataRange().getValues();
      var headers = appData[0];
      for (var i = 1; i < appData.length; i++) {
        if (getAppValue(appData[i], headers, 'application_id') === applicationId) {
          memberName = getAppValue(appData[i], headers, 'member_name') || '';
          memberNameEn = getAppValue(appData[i], headers, 'member_name_en') || '';
          groupId = getAppValue(appData[i], headers, 'group_id') || '';
          badgeName = getAppValue(appData[i], headers, 'badge_name') || '';
          resultDate = getAppValue(appData[i], headers, 'result_date') || '';
          break;
        }
      }
    }
  }
  
  // 補充資料：從 BadgeCodes 拿英文章名、類別（如果 PrintList 沒有）
  if (!badgeNameEn) {
    var badgeInfo = (typeof getBadgeFullData === 'function') ? getBadgeFullData(badgeName) : null;
    if (badgeInfo) {
      badgeNameEn = badgeInfo.badgeNameEn || '';
      category = category || badgeInfo.category || '';
      categoryEn = categoryEn || badgeInfo.categoryEn || '';
      badgeCode = badgeCode || badgeInfo.badgeCode || '';
      fullTitle = fullTitle || badgeInfo.fullTitle || '';
    }
  }
  
  // 補充資料：從 Groups 拿中英旅名（如果 PrintList 沒有）
  if (!groupNameCn) {
    var groupInfo = (typeof getGroupFullData === 'function') ? getGroupFullData(found[3]) : null;
    if (groupInfo) {
      groupNameCn = groupInfo.groupNameCn || '';
      groupNameEn = groupInfo.groupNameEn || '';
      groupNumber = groupInfo.groupNumber || '';
    }
  }
  
  return {
    success: true,
    certificate: {
      certificateId:    found[0],
      applicationId:    applicationId,
      memberName:       memberName,
      memberNameEn:     memberNameEn,
      groupId:          found[3] || groupNumber,
      groupNameCn:      groupNameCn,
      groupNameEn:      groupNameEn,
      badgeName:        badgeName,
      badgeNameEn:      badgeNameEn,
      badgeCode:        badgeCode,
      category:         category,
      categoryEn:       categoryEn,
      fullTitle:        fullTitle,
      resultDate:       resultDate ? new Date(resultDate).toISOString() : '',
      certificateNumber: certNumber,
      readyAt:          readyAt ? new Date(readyAt).toISOString() : '',
      signerTitleCn:    getConfig('CERT_SIGNER_TITLE_CN') || '楊德銘',
      signerTitleEn:    getConfig('CERT_SIGNER_TITLE_EN') || 'Yeung Tak Ming',
      signerLabelCn:    getConfig('CERT_SIGNER_LABEL_CN') || '助理區總監(童軍)',
      signerLabelEn:    getConfig('CERT_SIGNER_LABEL_EN') || 'Assistant District Commissioner (Scouts)',
    }
  };
}


function apiMarkCertificatePickedUp(data) {
  var ss = getSpreadsheet();
  var certSheet = ss.getSheetByName('CertificateQueue');
  var certData = certSheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < certData.length; i++) { if (certData[i][0] === data.certificateId) { rowIndex = i; break; } }
  if (rowIndex === -1) return { success: false, error: '找不到證書記錄' };
  var nowStr = new Date().toISOString(), appId = certData[rowIndex][1];
  certSheet.getRange(rowIndex + 1, 8).setValue('PICKED_UP');
  certSheet.getRange(rowIndex + 1, 12).setValue(data.pickedUpBy || certData[rowIndex][2]);
  certSheet.getRange(rowIndex + 1, 13).setValue(nowStr);
  var appSheet = ss.getSheetByName('Applications');
  var appData = appSheet.getDataRange().getValues();
  var appHeaders = appData[0];
  for (var i = 1; i < appData.length; i++) {
    if (getAppValue(appData[i], appHeaders, 'application_id') === appId) {
      setAppCell(appSheet, i, appHeaders, 'picked_up_by', data.pickedUpBy || getAppValue(appData[i], appHeaders, 'member_name'));
      setAppCell(appSheet, i, appHeaders, 'picked_up_at', nowStr);
      setAppCell(appSheet, i, appHeaders, 'status', CONFIG.STATUS.COMPLETED);
      break;
    }
  }
  addAuditLog('CERTIFICATE_PICKED_UP', appId, data.staffEmail || '秘書', '已領取');
  return { success: true, message: '已標記為已領取' };
}

function apiReprintCertificate(data) {
  if (!data.staffToken || data.staffToken !== getConfig('STAFF_TOKEN')) return { success: false, error: '權限不足' };
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('CertificatePrintList');
  if (!sheet) return { success: false, error: '找不到列印清單' };
  var allData = sheet.getDataRange().getValues();
  var targetRow = -1;
  for (var i = 1; i < allData.length; i++) { if (allData[i][16] === data.applicationId) { targetRow = i; break; } }
  if (targetRow === -1) return { success: false, error: '找不到該申請編號' };
  var nowStr = new Date().toISOString();
  var newRow = allData[targetRow].slice(0, 17);
  newRow[17] = 'REPRINT-' + Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyyyMMdd-HHmm');
  newRow[18] = nowStr;
  newRow[19] = parseInt(allData[targetRow][19] || '0') + 1;
  newRow[20] = nowStr;
  sheet.appendRow(newRow);
  return { success: true, message: '已標記重印' };
}

function sortCertificatePrintListByDate() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('CertificatePrintList');
  if (!sheet || sheet.getLastRow() <= 1) return;
  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  var allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = allData[0], rows = allData.slice(1);
  rows.sort(function(a, b) {
    var dateA = a[1] ? new Date(a[1]) : new Date('2099-12-31');
    var dateB = b[1] ? new Date(b[1]) : new Date('2099-12-31');
    if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
    return (a[16] || '').localeCompare(b[16] || '');
  });
  var newData = [headers].concat(rows);
  sheet.clear();
  sheet.getRange(1, 1, newData.length, newData[0].length).setValues(newData);
  for (var i = 1; i < newData.length; i++) { sheet.getRange(i + 1, 1).setValue(i); }
}

// J. 查詢 API
function apiGetStatus(appId, ymNumber) {
  if (!appId || ymNumber === undefined || ymNumber === null || ymNumber === '') {
    return { success: false, error: '缺少申請編號或童軍成員編號' };
  }

  // 強力標準化：去空白、去前導零、轉字串
  var normalize = function(v) {
    if (v === null || v === undefined) return '';
    return String(v).trim().replace(/^0+/, '') || '0';
  };

  var targetAppId = String(appId).trim();
  var targetYm    = normalize(ymNumber);

  Logger.log('查詢: appId="' + targetAppId + '" ym="' + targetYm + '"');

  var ss = getSpreadsheet();
  var data = ss.getSheetByName('Applications').getDataRange().getValues();
  var headers = data[0];

  for (var i = 1; i < data.length; i++) {
    var rowAppId = String(getAppValue(data[i], headers, 'application_id') || '').trim();
    var rowYm    = normalize(getAppValue(data[i], headers, 'ym_number'));

    if (rowAppId !== targetAppId) continue;

    Logger.log('找到列 ' + (i+1) + ' | sheet ym="' + rowYm + '" vs input="' + targetYm + '"');

    if (rowYm !== targetYm) {
      return { success: false, error: '童軍成員編號不匹配（sheet: ' + rowYm + ', 您輸入: ' + targetYm + '）' };
    }

    return {
      success: true,
      applicationId: rowAppId,
      memberName: getAppValue(data[i], headers, 'member_name'),
      groupId: getAppValue(data[i], headers, 'group_id'),
      badgeName: getAppValue(data[i], headers, 'badge_name'),
      status: getAppValue(data[i], headers, 'status'),
      ymNumber: rowYm,
      submittedAt: getAppValue(data[i], headers, 'submitted_at'),
      parentConfirmedAt: getAppValue(data[i], headers, 'parent_confirmed_at') || null,
      leaderConfirmedAt: getAppValue(data[i], headers, 'leader_confirmed_at') || null,
      districtApprovedAt: getAppValue(data[i], headers, 'district_approved_at') || null,
      assignedExaminerId: getAppValue(data[i], headers, 'assigned_examiner_id') || null,
      examinerAccepted: getAppValue(data[i], headers, 'examiner_accepted') || null,
      examDeadline: getAppValue(data[i], headers, 'exam_deadline') || null,
      result: getAppValue(data[i], headers, 'result') || null,
      certificateNumber: getAppValue(data[i], headers, 'certificate_number') || null,
      pickedUpAt: getAppValue(data[i], headers, 'picked_up_at') || null
    };
  }
  return { success: false, error: '找不到申請記錄' };
}

function apiGetPendingCertificates() {
  var data = getSpreadsheet().getSheetByName('CertificateQueue').getDataRange().getValues();
  var pending = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][7] === 'READY' && data[i][12] === '') pending.push({ certificateId: data[i][0], applicationId: data[i][1], memberName: data[i][2], groupId: data[i][3], badgeName: data[i][4], readyAt: data[i][10] });
  }
  return { success: true, certificates: pending };
}

function apiGetPrintList(data) {
  if (!data.staffToken || data.staffToken !== getConfig('STAFF_TOKEN')) return { success: false, error: '權限不足' };
  var sheet = getSpreadsheet().getSheetByName('CertificatePrintList');
  if (!sheet) return { success: false, error: '找不到列印清單' };
  var allData = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < allData.length; i++) {
    list.push({ seq: allData[i][0], resultDate: allData[i][1], certNumber: allData[i][2], memberName: allData[i][3], memberNameEn: allData[i][4], groupNumber: allData[i][5], groupNameCn: allData[i][6], groupNameEn: allData[i][7], fullTitle: allData[i][8], category: allData[i][9], categoryEn: allData[i][10], badgeName: allData[i][11], badgeCode: allData[i][12], badgeNameEn: allData[i][13], slTitle: allData[i][14], slTitleEn: allData[i][15], applicationId: allData[i][16], printBatch: allData[i][17], addedAt: allData[i][18], reprintCount: allData[i][19], lastReprintAt: allData[i][20] });
  }
  return { success: true, printList: list };
}

// K. 秘書後台 API
function apiAdminGetPendingApplications(data) {
  if (!data.staffToken || data.staffToken !== getConfig('STAFF_TOKEN')) return { success: false, error: '權限不足' };
  
  var allData = getSpreadsheet().getSheetByName('Applications').getDataRange().getValues();
  var headers = allData[0];
  var pending = [];
  var showStatuses = [CONFIG.STATUS.PENDING_PARENT, CONFIG.STATUS.PENDING_LEADER, CONFIG.STATUS.PENDING_DISTRICT, CONFIG.STATUS.PENDING_EXAMINER_ACCEPT];
  
  // 預先讀一次 Examiners + Groups 表，避免每筆都重讀
  var examinersList = _getActiveExaminersForAdmin_();
  
  for (var i = 1; i < allData.length; i++) {
    var status = getAppValue(allData[i], headers, 'status');
    if (showStatuses.indexOf(status) < 0) continue;
    
    var appId = getAppValue(allData[i], headers, 'application_id');
    var memberName = getAppValue(allData[i], headers, 'member_name');
    var groupId = getAppValue(allData[i], headers, 'group_id');
    var badgeName = getAppValue(allData[i], headers, 'badge_name');
    var examArrType = getAppValue(allData[i], headers, 'exam_arrangement_type');
    var selfExaminerName = getAppValue(allData[i], headers, 'self_examiner_name');
    
    // ★ 主考預覽資訊
    var examinerPreview = _previewExaminerForApp_(examArrType, selfExaminerName, badgeName, groupId, examinersList);
    
    pending.push({
      applicationId: appId,
      submittedAt: getAppValue(allData[i], headers, 'submitted_at'),
      memberName: memberName,
      groupId: groupId,
      ymNumber: getAppValue(allData[i], headers, 'ym_number'),
      badgeName: badgeName,
      examArrangementType: examArrType,
      selfExaminerName: selfExaminerName,
      parentName: getAppValue(allData[i], headers, 'parent_name'),
      parentConfirmedAt: getAppValue(allData[i], headers, 'parent_confirmed_at'),
      leaderConfirmedAt: getAppValue(allData[i], headers, 'leader_confirmed_at'),
      status: status,
      phone: getAppValue(allData[i], headers, 'phone'),
      email: getAppValue(allData[i], headers, 'email'),
      // ★ 新增主考預覽欄
      examinerPreview: examinerPreview
    });
  }
  return { success: true, applications: pending, availableExaminers: examinersList };
}

// 共用：讀取所有有效主考（簡化版，供 admin 預覽用）
function _getActiveExaminersForAdmin_() {
  var exSheet = getSpreadsheet().getSheetByName('Examiners');
  if (!exSheet) return [];
  var data = exSheet.getDataRange().getValues();
  var H = data[0];
  var now = new Date();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var status = data[i][H.indexOf('status')];
    var termEnd = new Date(data[i][H.indexOf('term_end')]);
    if (status !== 'ACTIVE' || termEnd <= now) continue;
    
    var clean = function(raw) {
      return String(raw || '').split(',').map(function(s){return s.trim();})
        .filter(function(s){ return s && s !== '#N/A' && s !== '#REF!'; });
    };
    
    result.push({
      examinerId: data[i][H.indexOf('examiner_id')],
      name: data[i][H.indexOf('name')],
      unit: data[i][H.indexOf('unit')] || '',
      email: data[i][H.indexOf('email')] || '',
      phone: data[i][H.indexOf('phone')] || '',
      districtBadges: clean(data[i][H.indexOf('district_badges')]),
      groupBadges: clean(data[i][H.indexOf('group_badges')]),
      currentLoad: parseInt(data[i][H.indexOf('current_load')] || '0'),
      maxLoad: parseInt(data[i][H.indexOf('max_load')] || '5')
    });
  }
  return result;
}

// 共用：為一筆申請預覽主考
function _previewExaminerForApp_(examArrType, selfExaminerName, badgeName, groupId, examinersList) {
  // 不需派主考的安排
  if (examArrType === 'CERTIFICATE_EXCHANGE' || examArrType === 'APPROVED_COURSE' || examArrType === 'EXAM_DAY') {
    return { mode: 'no_examiner', label: '不需派主考', detail: CONFIG.EXAM_ARRANGEMENT[examArrType] || examArrType, valid: true };
  }
  
  // 取得考生旅團資訊（找團名比對 G 主考）
  var groupName = getGroupName(groupId);
  
  // 自選主考
  if (examArrType === 'SELF_APPLY' && selfExaminerName) {
    var found = null;
    for (var i = 0; i < examinersList.length; i++) {
      if (examinersList[i].name === selfExaminerName) { found = examinersList[i]; break; }
    }
    if (!found) {
      return { mode: 'self', label: '⚠️ ' + selfExaminerName, detail: '不在主考名單，建議改派', valid: false, severity: 'warn' };
    }
    // 檢查資格
    var isD = found.districtBadges.indexOf(badgeName) >= 0;
    var isG = found.groupBadges.indexOf(badgeName) >= 0;
    if (!isD && !isG) {
      return { mode: 'self', label: '❌ ' + selfExaminerName, detail: '無此章資格', valid: false, severity: 'error' };
    }
    // G 主考要同旅
    if (isG && !isD) {
      var sameUnit = found.unit && groupName && (found.unit.indexOf(groupName) >= 0 || groupName.indexOf(found.unit) >= 0);
      if (!sameUnit) {
        return { mode: 'self', label: '⚠️ ' + selfExaminerName, detail: 'G 主考但不同旅 (' + found.unit + ')', valid: false, severity: 'warn' };
      }
    }
    // 負荷檢查
    if (found.currentLoad >= found.maxLoad) {
      return { mode: 'self', label: '⚠️ ' + selfExaminerName, detail: '已滿載 ' + found.currentLoad + '/' + found.maxLoad, valid: false, severity: 'warn' };
    }
    var scope = isD ? 'D 區主考' : 'G 旅團主考';
    return { mode: 'self', label: '✅ ' + selfExaminerName, detail: scope + '・負荷 ' + found.currentLoad + '/' + found.maxLoad, valid: true, examinerId: found.examinerId };
  }
  
  // 由區會派發 → 預覽自動分配結果
  var candidates = [];
  for (var i = 0; i < examinersList.length; i++) {
    var ex = examinersList[i];
    if (ex.currentLoad >= ex.maxLoad) continue;
    var hasD = ex.districtBadges.indexOf(badgeName) >= 0;
    var hasG = ex.groupBadges.indexOf(badgeName) >= 0;
    if (hasD || hasG) candidates.push({ ex: ex, scope: hasD ? 'D' : 'G' });
  }
  if (candidates.length === 0) {
    return { mode: 'auto', label: '❌ 無合資格主考', detail: '請先委任主考', valid: false, severity: 'error' };
  }
  // 排序：負荷低的優先
  candidates.sort(function(a,b){ return a.ex.currentLoad - b.ex.currentLoad; });
  var best = candidates[0];
  return { 
    mode: 'auto', 
    label: '🤖 ' + best.ex.name + ' (' + best.scope + ')', 
    detail: '系統建議・負荷 ' + best.ex.currentLoad + '/' + best.ex.maxLoad + '・共 ' + candidates.length + ' 位合資格', 
    valid: true,
    examinerId: best.ex.examinerId
  };
}

function apiAdminGetDashboard(data) {
  if (!data.staffToken || data.staffToken !== getConfig('STAFF_TOKEN')) return { success: false, error: '權限不足' };
  var appData = getSpreadsheet().getSheetByName('Applications').getDataRange().getValues();
  var headers = appData[0];
  var counts = {};
  var allStatuses = Object.values(CONFIG.STATUS);
  for (var s = 0; s < allStatuses.length; s++) { counts[allStatuses[s]] = 0; }
  var totalThisMonth = 0;
  var thisMonth = Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyyy-MM');
  for (var i = 1; i < appData.length; i++) {
    var status = getAppValue(appData[i], headers, 'status');
    if (counts[status] !== undefined) counts[status]++;
    var sub = getAppValue(appData[i], headers, 'submitted_at');
    if (sub && sub.toString().indexOf(thisMonth) === 0) totalThisMonth++;
  }
  return { success: true, stats: counts, totalThisMonth: totalThisMonth };
}

// L. 主考委任 + 簽發人
function OLD_apiApproveExaminerAppointment(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('ExaminerAppointments');
  var dataRows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < dataRows.length; i++) { if (dataRows[i][0] === data.appointmentId) { rowIndex = i; break; } }
  if (rowIndex === -1) return { success: false, error: '找不到申請記錄' };
  var nowStr = new Date().toISOString();
  var termStart = data.termStart || Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyyy-MM-dd');
  var termEnd = data.termEnd || getConfig('CURRENT_TERM_END');
  var exId = 'E-' + Math.random().toString(36).substr(2, 5).toUpperCase();
  sheet.getRange(rowIndex + 1, 2).setValue(exId);
  sheet.getRange(rowIndex + 1, 6).setValue(data.approvedBy || 'ADC');
  sheet.getRange(rowIndex + 1, 7).setValue(nowStr);
  sheet.getRange(rowIndex + 1, 10).setValue('ACTIVE');
  var badges = dataRows[rowIndex][2], notes = dataRows[rowIndex][10] || '';
  var emailMatch = notes.match(/電郵：([^|]+)/), phoneMatch = notes.match(/電話：([^|]+)/);
  ss.getSheetByName('Examiners').appendRow([exId, data.examinerName || '待補', '', emailMatch ? emailMatch[1].trim() : '', phoneMatch ? phoneMatch[1].trim() : '', badges, '', termStart, termEnd, 'ACTIVE', 0, 5, nowStr]);
  addAuditLog('EXAMINER_APPOINTMENT_APPROVED', '', data.approvedBy, '批准主考 ' + exId);
  return { success: true, examinerId: exId };
}

function apiUpdateSignerTitle(data) {
  if (!data.staffToken || data.staffToken !== getConfig('STAFF_TOKEN')) return { success: false, error: '權限不足' };
  if (data.signerTitleCn) setConfig('CERT_SIGNER_TITLE_CN', data.signerTitleCn);
  if (data.signerTitleEn) setConfig('CERT_SIGNER_TITLE_EN', data.signerTitleEn);
  return { success: true, message: '已更新' };
}

function apiOverrideExaminer(data) {
  if (!data.staffToken || data.staffToken !== getConfig('STAFF_TOKEN')) return { success: false, error: '權限不足' };
  return { success: true };
}

// M. 主考工具函數
function autoAssignExaminer(badgeFullTitle, excludeExaminerId) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Examiners');
  var data = sheet.getDataRange().getValues();
  var exH = data[0];
  var now = new Date();
  var candidates = [];

  for (var i = 1; i < data.length; i++) {
    var exId = data[i][exH.indexOf('examiner_id')];
    if (exId === excludeExaminerId) continue;
    var status = data[i][exH.indexOf('status')];
    var termEnd = new Date(data[i][exH.indexOf('term_end')]);
    var load = parseInt(data[i][exH.indexOf('current_load')] || '0');
    var max  = parseInt(data[i][exH.indexOf('max_load')] || '5');
    if (status !== 'ACTIVE' || termEnd <= now || load >= max) continue;

    // 用 full_title 直接比對
    var dList = String(data[i][exH.indexOf('district_badges')] || '').split(',').map(function(s){return s.trim();});
    var gList = String(data[i][exH.indexOf('group_badges')] || '').split(',').map(function(s){return s.trim();});
    if (dList.indexOf(badgeFullTitle) === -1 && gList.indexOf(badgeFullTitle) === -1) continue;

    candidates.push({
      examinerId: exId,
      name:  data[i][exH.indexOf('name')],
      email: data[i][exH.indexOf('email')],
      phone: data[i][exH.indexOf('phone')],
      load:  load,
      score: max - load
    });
  }
  if (candidates.length === 0) return null;
  candidates.sort(function(a,b){ return b.score - a.score; });
  return candidates[0];
}

function updateExaminerLoad(examinerId, delta) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Examiners');
  var data = sheet.getDataRange().getValues();
  var exH = data[0];
  for (var i = 1; i < data.length; i++) {
    if (data[i][exH.indexOf('examiner_id')] === examinerId) {
      var loadCol = exH.indexOf('current_load');
      sheet.getRange(i + 1, loadCol + 1).setValue(Math.max(0, parseInt(data[i][loadCol] || '0') + delta));
      break;
    }
  }
}

function getExaminerNameById(examinerId) {
  if (!examinerId) return '';
  var data = getSpreadsheet().getSheetByName('Examiners').getDataRange().getValues();
  var exH = data[0];
  var idCol = exH.indexOf('examiner_id');
  var nameCol = exH.indexOf('name');
  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === examinerId) return data[i][nameCol] || '';
  }
  return '';
}

function getExaminerEmailById(examinerId) {
  if (!examinerId) return '';
  var data = getSpreadsheet().getSheetByName('Examiners').getDataRange().getValues();
  var exH = data[0];
  var idCol = exH.indexOf('examiner_id');
  var emailCol = exH.indexOf('email');
  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === examinerId) return data[i][emailCol] || '';
  }
  return '';
}

function getExaminerPhoneById(examinerId) {
  if (!examinerId) return '';
  var data = getSpreadsheet().getSheetByName('Examiners').getDataRange().getValues();
  var exH = data[0];
  var idCol = exH.indexOf('examiner_id');
  var phoneCol = exH.indexOf('phone');
  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === examinerId) return data[i][phoneCol] || '';
  }
  return '';
}

function getExaminerPhoneById(examinerId) {
  var data = getSpreadsheet().getSheetByName('Examiners').getDataRange().getValues();
  var exH = data[0];
  for (var i = 1; i < data.length; i++) { 
    if (data[i][exH.indexOf('examiner_id')] === examinerId) return data[i][exH.indexOf('phone')]; 
  }
  return '';
}

// N. Google Form 對接
function onExaminerFormSubmit(e) {
  var MAIN_SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('DBS_SHEET_ID');
  if (!MAIN_SPREADSHEET_ID) return;
  var ss = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID);
  var sheet = ss.getSheetByName('ExaminerAppointments');
  var timestamp = e.values[0], name = e.values[1] || '', email = e.values[2] || '', phone = e.values[3] || '', badges = e.values[4] || '', qualifications = e.values[5] || '';
  var appId = 'APT-' + Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyMMdd') + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
  sheet.appendRow([appId, '', badges, '', '', '', '', '', 'PENDING_ADC_APPROVAL', 'FALSE', '資歷：' + qualifications + ' | 電郵：' + email + ' | 電話：' + phone + ' | 姓名：' + name + ' | 提交時間：' + timestamp]);
  sendSystemEmail(getEmailReplyTo_(), '【'+ getDistrictName_() +'專科徽章】新主考委任申請 - ' + name, 'ADC 您好：\n\n申請人：' + name + '\n電郵：' + email + '\n申請專章：' + badges + '\n\n'+ getSystemLabel_() +'');
}

// O. 每日自動化 Trigger
function dailyAutomation() {
  var ss = getSpreadsheet(), now = new Date();
  var appSheet = ss.getSheetByName('Applications'), appData = appSheet.getDataRange().getValues();
  var headers = appData[0];
  for (var i = 1; i < appData.length; i++) {
    var status = getAppValue(appData[i], headers, 'status');
    var submittedAt = new Date(getAppValue(appData[i], headers, 'submitted_at'));
    var appId = getAppValue(appData[i], headers, 'application_id');
    var groupId = getAppValue(appData[i], headers, 'group_id');
    if (status === CONFIG.STATUS.PENDING_PARENT) {
      var hoursElapsed = (now - submittedAt) / (1000 * 60 * 60);
      if (hoursElapsed > 48 && hoursElapsed < 72) {
        var parentEmail = getAppValue(appData[i], headers, 'parent_email');
        if (parentEmail) { sendSystemEmail(parentEmail, '【催辦】專科徽章報考申請待家長確認', '申請編號 ' + appId + ' 已提交超過 48 小時，請盡快確認。'); addAuditLog('PARENT_REMINDER_SENT', appId, 'system', '48小時催辦'); }
      }
    }
    if (status === CONFIG.STATUS.PENDING_LEADER) {
      var parentConfirmedAt = getAppValue(appData[i], headers, 'parent_confirmed_at');
      if (parentConfirmedAt) {
        var leaderHours = (now - new Date(parentConfirmedAt)) / (1000 * 60 * 60);
        if (leaderHours > 48 && leaderHours < 72) {
          var groupInfo = getGroupFullData(groupId);
          if (groupInfo && groupInfo.leaderEmail) { sendSystemEmail(groupInfo.leaderEmail, '【催辦】專科徽章報考申請待確認', '申請編號 ' + appId + ' 已超過 48 小時，請盡快確認。'); addAuditLog('LEADER_REMINDER_SENT', appId, 'system', '48小時催辦'); }
        }
      }
    }
    if (status === CONFIG.STATUS.PENDING_EXAMINER_ACCEPT) {
      var assignedAt = getAppValue(appData[i], headers, 'assigned_at');
      if (assignedAt) {
        var exHours = (now - new Date(assignedAt)) / (1000 * 60 * 60);
        if (exHours > 42 && exHours < 48) {
          var exEmail = getExaminerEmailById(getAppValue(appData[i], headers, 'assigned_examiner_id'));
          if (exEmail) sendSystemEmail(exEmail, '【催辦】請盡快回覆考核指派', '申請編號：' + appId + '\n\n'+ getSystemLabel_() +'');
        }
      }
    }
    var examDeadline = getAppValue(appData[i], headers, 'exam_deadline');
    if (status === CONFIG.STATUS.ASSIGNED_EXAMINER && examDeadline) {
      var daysRemaining = Math.ceil((new Date(examDeadline) - now) / (1000 * 60 * 60 * 24));
      if (daysRemaining === 7) {
        var memberEmail = getAppValue(appData[i], headers, 'email');
        if (memberEmail) sendSystemEmail(memberEmail, '【提醒】專科徽章考核即將到期', '您的考核將於 7 日後到期。\n申請編號：' + appId);
        addAuditLog('EXAM_DEADLINE_REMINDER', appId, 'system', '7日到期提醒');
      }
      if (daysRemaining <= 0) {
        setAppCell(appSheet, i, headers, 'result', 'FAIL');
        setAppCell(appSheet, i, headers, 'result_remarks', '逾期未完成考核');
        setAppCell(appSheet, i, headers, 'result_date', now.toISOString());
        setAppCell(appSheet, i, headers, 'status', CONFIG.STATUS.EXPIRED);
        var eId = getAppValue(appData[i], headers, 'assigned_examiner_id');
        if (eId) updateExaminerLoad(eId, -1);
        addAuditLog('EXAM_AUTO_EXPIRED', appId, 'system', '逾期不合格');
      }
    }
  }
  var exSheet = ss.getSheetByName('Examiners'), exData = exSheet.getDataRange().getValues();
  var exH = exData[0];
  for (var i = 1; i < exData.length; i++) {
    var termEnd = new Date(exData[i][exH.indexOf('term_end')]);
    var daysToExpiry = Math.ceil((termEnd - now) / (1000 * 60 * 60 * 24));
    if (daysToExpiry <= 60 && daysToExpiry > 0 && !exData[i][exH.indexOf('updated_at')]) {
      var exEmail = exData[i][exH.indexOf('email')];
      if (exEmail) sendSystemEmail(exEmail, '【'+ getDistrictName_() +'專科徽章】主考委任即將到期', exData[i][exH.indexOf('name')] + ' 主考您好：\n\n您的委任將於 ' + daysToExpiry + ' 日後到期。\n\n'+ getSystemLabel_() +'');
    }
    if (daysToExpiry <= 0) exSheet.getRange(i + 1, exH.indexOf('status') + 1).setValue('EXPIRED');
  }
}

// P. 系統初始化
/** SHA-256 雜湊（用於 API_KEY 驗證，不存明文） */
function sha256_(str) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
  return digest.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

/** 生成 API Key（只存 hash 到 Config） */
function generateApiKey_(ss) {
  var sh = ss.getSheetByName('Config');
  if (!sh) return '';
  var values = sh.getDataRange().getValues();
  var generatedKey = '';
  for (var i = 1; i < values.length; i++) {
    var key = String(values[i][0] || '').trim();
    if (key === 'API_KEY_HASH' && !values[i][1]) {
      generatedKey = 'ak_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      sh.getRange(i + 1, 2).setValue(sha256_(generatedKey));
      sh.getRange(i + 1, 3).setValue('setup 自動生成；API_KEY 的 SHA-256 雜湊值。明文不會儲存在此。');
    }
  }
  return generatedKey;
}

/** 重新生成 API Key（忘記或懷疑洩漏時用） */
function regenerateApiKeyMenu() {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('Config');
  if (!sh) { SpreadsheetApp.getUi().alert('錯誤', '找不到 Config 工作表。'); return; }
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var key = String(values[i][0] || '').trim();
    if (key === 'API_KEY_HASH') {
      var newKey = 'ak_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      sh.getRange(i + 1, 2).setValue(sha256_(newKey));
      sh.getRange(i + 1, 3).setValue('重新生成於 ' + new Date().toISOString() + '；API_KEY 的 SHA-256 雜湊值。');
      SpreadsheetApp.getUi().alert(
        '🔑 新 API Key 已生成',
        '新 API Key（只顯示一次，請即複製）：\n'
        + '───────────────────────\n'
        + newKey
        + '\n───────────────────────\n\n'
        + '⚠️ 複製時只取上下橫線之間的文字，不要包含空格或換行！\n\n'
        + '舊 Key 即刻失效！請把新 Key 交給平台管理員更新。',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }
  }
  SpreadsheetApp.getUi().alert('錯誤', '找不到 API_KEY_HASH 設定行。');
}

function setupSystem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('請先在 Google Sheet 中綁定 Apps Script，再執行 setupSystem()');

  var props = PropertiesService.getScriptProperties();
  props.setProperty('DBS_SHEET_ID', ss.getId());

  initializeSheets(ss);

  var serviceUrl = ScriptApp.getService().getUrl();
  if (serviceUrl) setConfig('WEB_APP_URL', serviceUrl);
  if (!getConfig('FRONTEND_URL')) setConfig('FRONTEND_URL', CONFIG.DEFAULT_FRONTEND_URL);
  if (!getConfig('EMAIL_REPLY_TO')) setConfig('EMAIL_REPLY_TO', Session.getEffectiveUser().getEmail() || '');
  if (!getConfig('ADC_EMAIL')) setConfig('ADC_EMAIL', Session.getEffectiveUser().getEmail() || '');
  if (!getConfig('DISTRICT_CODE')) setConfig('DISTRICT_CODE', CONFIG.DEFAULT_DISTRICT_CODE);
  if (!getConfig('DISTRICT_NAME')) setConfig('DISTRICT_NAME', CONFIG.DEFAULT_DISTRICT_NAME);
  if (!getConfig('SYSTEM_VERSION')) setConfig('SYSTEM_VERSION', 'DBS 3.0 Multi-District');

  // ★ 自動生成 API Key（只存 hash）
  var apiKeyPlain = generateApiKey_(ss);

  SpreadsheetApp.getUi().alert(
    'DBS 3.0 多區版初始化完成',
    '已建立基本工作表、最新 BadgeCodes、ExaminerMatrix 表頭及新手說明頁。\n\n'
    + '請照以下順序做：\n'
    + '1. 先到 README_新手必看 查看步驟\n'
    + '2. 去黃色 Config 填 DISTRICT_CODE / DISTRICT_NAME / STAFF_TOKEN / ADC_TOKEN\n'
    + '3. 去綠色 Groups 改成你區旅團資料\n'
    + '4. Deploy 為 Web App（Anyone）→ 複製 /exec URL\n'
    + '5. 到前端「申請接入」頁面，填入 /exec URL 和下面的 API Key\n'
    + '6. 等平台管理員開通',
    SpreadsheetApp.getUi().ButtonSet.OK
  );

  if (apiKeyPlain) {
    SpreadsheetApp.getUi().alert(
      '🔑 你的 API Key（只顯示一次）',
      '───────────────────────\n'
      + apiKeyPlain
      + '\n───────────────────────\n\n'
      + '⚠️ 複製時只取上下橫線之間的文字！\n'
      + 'Config 只存雜湊值，無法還原。\n'
      + '忘記了？到選單 → 重新生成 API Key。',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }


}

function setup() {
  setupSystem();
}

// Q. 主考申請（v3.2）
function apiSubmitExaminerApplication(data) {
  var required = ['name', 'email', 'phone', 'badges', 'qualifications'];
  for (var f = 0; f < required.length; f++) {
    if (!data[required[f]]) return { success: false, error: '缺少必填欄位: ' + required[f] };
  }
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('ExaminerAppointments');
  if (!sheet) return { success: false, error: '找不到 ExaminerAppointments 工作表' };

  var now = new Date();
  var appId = 'APT-' + Utilities.formatDate(now, 'Asia/Hong_Kong', 'yyMMdd') + '-' +
    Math.random().toString(36).substr(2, 4).toUpperCase();

  // ----- 證書附件上傳 -----
  var certFileUrls = [];
  if (data.certFiles && data.certFiles.length > 0) {
    try {
      var folderName = ''+ getDistrictName_() +'主考申請附件';
      var folders = DriveApp.getFoldersByName(folderName);
      var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
      for (var i = 0; i < data.certFiles.length; i++) {
        var cf = data.certFiles[i];
        if (cf.data && cf.name) {
          var parts = cf.data.split(',');
          var mimeMatch = parts[0].match(/:(.*?);/);
          var decoded = Utilities.base64Decode(parts[1]);
          var blob = Utilities.newBlob(decoded, mimeMatch ? mimeMatch[1] : 'application/octet-stream', appId + '_' + cf.name);
          var file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          certFileUrls.push(file.getUrl());
        }
      }
    } catch (e) { Logger.log('儲存附件失敗: ' + e.toString()); }
  }

  // ----- badge_scopes：申請人逐章自選 D / G -----
  var badgeScopesJson = '';
  if (data.badgeScopes) {
    badgeScopesJson = (typeof data.badgeScopes === 'string') ? data.badgeScopes : JSON.stringify(data.badgeScopes);
  }

  var notes = '姓名：' + data.name +
    ' | 電郵：' + data.email +
    ' | 電話：' + data.phone +
    ' | 旅團：' + (data.groupId || '') +
    ' | 職級：' + (data.rank || '') +
    ' | 年資：' + (data.yearsOfService || '') +
    ' | 資歷：' + data.qualifications +
    ' | badge_codes：' + (data.badgeCodes || '') +
    ' | badge_scopes：' + badgeScopesJson +
    ' | 證書附件：' + (certFileUrls.length > 0 ? certFileUrls.join(' ; ') : '無') +
    ' | 備註：' + (data.remarks || '') +
    ' | 提交時間：' + now.toISOString();

  // 欄序: appointment_id, examiner_id, badge_name, term_start, term_end,
  //       approved_by, approved_at, application_form_url, status, renewal_reminder_sent, notes
  sheet.appendRow([
    appId, '', data.badges, '', '', '', '',
    certFileUrls.length > 0 ? certFileUrls.join('\n') : '',
    'PENDING_ADC_APPROVAL', 'FALSE', notes
  ]);

  // ----- 通知 ADC（★ 收件人 = ADC_EMAIL，沒填才退回 dbs）-----
  var adcEmail = getConfig('ADC_EMAIL') || getEmailReplyTo_();
  var adcUrl = buildFrontendLink_('/adc');
  // 從 CERT_SIGNER_TITLE_CN 抓 ADC 名字，例「助理區總監(童軍) 楊德銘先生」→ 取最後的名字當稱呼
  var signer = getConfig('CERT_SIGNER_TITLE_CN') || '';
  var adcName = signer ? (signer.replace(/^.*[)）]\s*/, '').trim() || signer) : 'ADC';

  sendSystemEmail(adcEmail,
    '【'+ getDistrictName_() +'專科徽章】新主考委任申請 - ' + data.name,
    adcName + ' 您好：\n\n收到一份新的主考委任申請，請登入 ADC 後台審批。\n\n' +
    '申請編號：' + appId + '\n' +
    '申請人：' + data.name + '\n' +
    '電郵：' + data.email + '\n' +
    '電話：' + data.phone + '\n' +
    '所屬旅團：' + (data.groupId || '') + '\n' +
    '職級：' + (data.rank || '') + '\n' +
    '申請專章（含申請級別）：' + data.badges + '\n' +
    '資歷：' + data.qualifications + '\n' +
    (certFileUrls.length > 0 ? '📎 證書附件：\n' + certFileUrls.join('\n') + '\n' : '') +
    '\n👉 前往審批：' + adcUrl + '\n\n'+ getSystemLabel_() +'');

  // ----- 回條給申請人 -----
  sendSystemEmail(data.email,
    '【'+ getDistrictName_() +'專科徽章】已收到主考申請',
    data.name + ' 您好：\n\n我們已收到您的主考委任申請。\n\n' +
    '申請編號：' + appId + '\n' +
    '申請專章：' + data.badges + '\n\n' +
    '您可到「主考專區」用此申請編號查詢審批進度。\n' +
    'ADC（助理區總監）將審閱您的資歷，審批結果會以電郵通知。\n\n'+ getSystemLabel_() +'');

  addAuditLog('EXAMINER_APPLICATION_SUBMITTED', appId, data.email, '主考申請：' + data.name);
  return { success: true, appointmentId: appId, message: '主考申請已提交' };
}


function OLD_apiPartialApproveExaminer(data) {
  if (!data.staffToken || data.staffToken !== getConfig('STAFF_TOKEN')) return { success: false, error: '權限不足' };
  if (!data.appointmentId || !data.approvedBadgeCodes) return { success: false, error: '缺少必要參數' };
  var ss = getSpreadsheet();
  var aptSheet = ss.getSheetByName('ExaminerAppointments');
  var aptData = aptSheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < aptData.length; i++) { if (aptData[i][0] === data.appointmentId) { rowIndex = i; break; } }
  if (rowIndex === -1) return { success: false, error: '找不到該申請' };
  var notes = aptData[rowIndex][10] || '';
  var nowStr = new Date().toISOString();
  var nowDate = Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyyy-MM-dd');
  var termEnd = data.termEnd || getConfig('CURRENT_TERM_END') || '2027-03-31';
  var scope = data.scope || 'D';
  var nameMatch = notes.match(/姓名：([^|]+)/);
  var emailMatch = notes.match(/電郵：([^|]+)/);
  var phoneMatch = notes.match(/電話：([^|]+)/);
  var unitMatch = notes.match(/旅團：([^|]+)/);
  var examinerName = nameMatch ? nameMatch[1].trim() : (data.examinerName || '');
  var examinerEmail = emailMatch ? emailMatch[1].trim() : '';
  var examinerPhone = phoneMatch ? phoneMatch[1].trim() : '';
  var examinerUnit = unitMatch ? unitMatch[1].trim() : '';
  var exId = 'E-' + Math.random().toString(36).substr(2, 5).toUpperCase();
  aptSheet.getRange(rowIndex + 1, 2).setValue(exId);
  aptSheet.getRange(rowIndex + 1, 4).setValue(nowDate);
  aptSheet.getRange(rowIndex + 1, 5).setValue(termEnd);
  aptSheet.getRange(rowIndex + 1, 6).setValue(data.approvedBy || 'ADC');
  aptSheet.getRange(rowIndex + 1, 7).setValue(nowStr);
  aptSheet.getRange(rowIndex + 1, 9).setValue('APPROVED');
  var allBadgeCodes = notes.match(/badge_codes：([^|]+)/);
  var appliedCodes = allBadgeCodes ? allBadgeCodes[1].trim() : '';
  var approvedCodes = data.approvedBadgeCodes.trim();
  var exSheet = ss.getSheetByName('Examiners');
  if (!exSheet) { exSheet = ss.insertSheet('Examiners'); exSheet.appendRow(['examiner_id', 'name', 'unit', 'email', 'phone', 'district_badges', 'group_badges', 'term_start', 'term_end', 'status', 'current_load', 'max_load', 'updated_at']); exSheet.setFrozenRows(1); }
  var exData = exSheet.getDataRange().getValues();
  var exHeaders = exData[0];
  var existingRow = -1;
  for (var i = 1; i < exData.length; i++) { if (exData[i][exHeaders.indexOf('name')] === examinerName) { existingRow = i; break; } }
  if (existingRow >= 0) {
    var dCol = exHeaders.indexOf('district_badges'), gCol = exHeaders.indexOf('group_badges');
    if (scope === 'D') { exSheet.getRange(existingRow + 1, dCol + 1).setValue(mergeCommaSeparated(exData[existingRow][dCol] ? exData[existingRow][dCol].toString() : '', approvedCodes)); }
    else { exSheet.getRange(existingRow + 1, gCol + 1).setValue(mergeCommaSeparated(exData[existingRow][gCol] ? exData[existingRow][gCol].toString() : '', approvedCodes)); }
    exSheet.getRange(existingRow + 1, exHeaders.indexOf('updated_at') + 1).setValue(nowDate);
    exId = exData[existingRow][exHeaders.indexOf('examiner_id')];
  } else {
    exSheet.appendRow([exId, examinerName, examinerUnit, examinerEmail, examinerPhone, scope === 'D' ? approvedCodes : '', scope === 'G' ? approvedCodes : '', nowDate, termEnd, 'ACTIVE', 0, 5, nowDate]);
  }
  writeToExaminerMatrix(ss, examinerName, examinerUnit, approvedCodes.split(','), scope);
  var approvedList = approvedCodes.split(',');
  var appliedList = appliedCodes ? appliedCodes.split(',') : [];
  var rejectedList = appliedList.filter(function(c) { return approvedList.indexOf(c.trim()) === -1; });
  if (examinerEmail) {
    sendSystemEmail(examinerEmail, '【'+ getDistrictName_() +'專科徽章】主考申請審批結果',
      examinerName + ' 您好：\n\n您的主考申請（' + data.appointmentId + '）已獲審批。\n\n✅ 批准（' + approvedList.length + ' 項）：' + approvedCodes + '\n' + (rejectedList.length > 0 ? '❌ 未批准（' + rejectedList.length + ' 項）：' + rejectedList.join(',') + '\n' : '') + '\n主考編號：' + exId + '\n類別：' + (scope === 'D' ? '區主考' : '旅團主考') + '\n任期：' + nowDate + ' 至 ' + termEnd + '\n\n'+ getSystemLabel_() +'');
  }
  addAuditLog('EXAMINER_PARTIAL_APPROVED', data.appointmentId, data.approvedBy || 'ADC', '批准 ' + approvedList.length + ' 項：' + approvedCodes);
  return { success: true, examinerId: exId, approvedCount: approvedList.length, rejectedCount: rejectedList.length, message: '已批准並同步到 Examiners 和 ExaminerMatrix' };
}

function OLD_writeToExaminerMatrix(ss, examinerName, examinerUnit, badgeCodes, scope) {
  var matrixSheet = ss.getSheetByName('ExaminerMatrix');
  if (!matrixSheet) { Logger.log('找不到 ExaminerMatrix，跳過反向寫入'); return; }
  var data = matrixSheet.getDataRange().getValues();
  if (data.length < 4) return;
  var codeRow = data[0], headerRow = data[2];
  var codeToCol = {};
  for (var c = 2; c < headerRow.length; c++) { var code = codeRow[c] ? codeRow[c].toString().trim() : ''; if (code) codeToCol[code] = c; }
  var examinerRow = -1;
  for (var i = 3; i < data.length; i++) { if (data[i][0] && data[i][0].toString().trim() === examinerName) { examinerRow = i; break; } }
  if (examinerRow === -1) { examinerRow = data.length; matrixSheet.getRange(examinerRow + 1, 1).setValue(examinerName); matrixSheet.getRange(examinerRow + 1, 2).setValue(examinerUnit || ''); }
  var scopeChar = (scope === 'G') ? 'G' : 'D';
  for (var b = 0; b < badgeCodes.length; b++) { var code = badgeCodes[b].trim(); if (code && codeToCol[code] !== undefined) { matrixSheet.getRange(examinerRow + 1, codeToCol[code] + 1).setValue(scopeChar); } }
}

function mergeCommaSeparated(existing, newCodes) {
  var all = {};
  if (existing) { var parts = existing.split(','); for (var i = 0; i < parts.length; i++) { if (parts[i].trim()) all[parts[i].trim()] = true; } }
  if (newCodes) { var parts2 = newCodes.split(','); for (var j = 0; j < parts2.length; j++) { if (parts2[j].trim()) all[parts2[j].trim()] = true; } }
  return Object.keys(all).join(',');
}

// R. ExaminerMatrix → Examiners 同步 (修正版)
function syncExaminerMatrix() {
  var ss = getSpreadsheet();
  syncExaminerMatrixDirect(ss);
}

function syncExaminerMatrixDirect(ss) {
  var matrixSheet = ss.getSheetByName('ExaminerMatrix');
  if (!matrixSheet) return { success: false, error: '找不到 ExaminerMatrix' };
  var data = matrixSheet.getDataRange().getValues();
  if (data.length < 2) return { success: false, error: 'ExaminerMatrix 沒資料' };

  // ✅ 新版：Row 1 就是 full_title 表頭，A=姓名 B=單位 C+=full_title
  var headerRow = data[0];
  var badgeColumns = [];
  for (var c = 2; c < headerRow.length; c++) {
    var title = headerRow[c] ? headerRow[c].toString().trim().replace(/\n/g, '') : '';
    if (title) badgeColumns.push({ col: c, fullTitle: title });
  }
  if (badgeColumns.length === 0) return { success: false, error: '沒有專章欄位' };

  // 保留舊 Examiners 的 email/phone/term 等個人資料
  var exSheet = ss.getSheetByName('Examiners');
  var existingData = {};
  if (exSheet && exSheet.getLastRow() > 1) {
    var exDataOld = exSheet.getDataRange().getValues();
    var exH = exDataOld[0];
    for (var i = 1; i < exDataOld.length; i++) {
      var nc = exH.indexOf('name');
      if (nc >= 0 && exDataOld[i][nc]) {
        existingData[exDataOld[i][nc].toString().trim()] = {
          email: exH.indexOf('email') >= 0 ? (exDataOld[i][exH.indexOf('email')] || '') : '',
          phone: exH.indexOf('phone') >= 0 ? (exDataOld[i][exH.indexOf('phone')] || '') : '',
          termStart: exH.indexOf('term_start') >= 0 ? (exDataOld[i][exH.indexOf('term_start')] || '2025-04-01') : '2025-04-01',
          termEnd: exH.indexOf('term_end') >= 0 ? (exDataOld[i][exH.indexOf('term_end')] || '2027-03-31') : '2027-03-31',
          maxLoad: exH.indexOf('max_load') >= 0 ? (exDataOld[i][exH.indexOf('max_load')] || 5) : 5,
          currentLoad: exH.indexOf('current_load') >= 0 ? (exDataOld[i][exH.indexOf('current_load')] || 0) : 0
        };
      }
    }
  }

  // 從 Matrix Row 2 開始讀主考
  var examiners = [], seqId = 1;
  for (var i = 1; i < data.length; i++) {
    var name = data[i][0] ? data[i][0].toString().trim() : '';
    if (!name) continue;
    var unit = data[i][1] ? data[i][1].toString().trim() : '';
    var dList = [], gList = [];
    for (var b = 0; b < badgeColumns.length; b++) {
      var val = data[i][badgeColumns[b].col] ? data[i][badgeColumns[b].col].toString().trim().toUpperCase() : '';
      if (val === 'D') dList.push(badgeColumns[b].fullTitle);
      else if (val === 'G') gList.push(badgeColumns[b].fullTitle);
    }
    if (dList.length === 0 && gList.length === 0) continue;
    examiners.push({
      id: 'E-' + ('000' + seqId).slice(-3),
      name: name, unit: unit,
      dBadges: dList.join(','),   // ✅ 改存 full_title
      gBadges: gList.join(',')
    });
    seqId++;
  }
  if (examiners.length === 0) return { success: false, error: 'Matrix 沒有有效主考' };

  // 重寫 Examiners
  if (!exSheet) exSheet = ss.insertSheet('Examiners');
  exSheet.clear();
  exSheet.appendRow(['examiner_id','name','unit','email','phone','district_badges','group_badges','term_start','term_end','status','current_load','max_load','updated_at']);
  exSheet.setFrozenRows(1);

  var now = Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyyy-MM-dd');
  examiners.forEach(function(ex) {
    var old = existingData[ex.name] || {};
    exSheet.appendRow([
      ex.id, ex.name, ex.unit,
      old.email || '', old.phone || '',
      ex.dBadges, ex.gBadges,
      old.termStart || '2025-04-01', old.termEnd || '2027-03-31',
      'ACTIVE', old.currentLoad || 0, old.maxLoad || 5, now
    ]);
  });
  Logger.log('✅ 已同步 ' + examiners.length + ' 位主考（full_title 格式）');
  return { success: true, message: '已同步 ' + examiners.length + ' 位主考', syncedCount: examiners.length };
}

function lookupBadgeCodeFromSheet(ss, chineseName) {
  var sheet = ss.getSheetByName('BadgeCodes');
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === chineseName && (data[i][6] === '✔' || data[i][6] === true || data[i][6] === 'TRUE')) return data[i][1];
  }
  return null;
}

// S. 自訂選單
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🏕️ DBS 管理')
    .addItem('🚀 重新執行初始化提示', 'setupSystem')
    .addSeparator()
    .addItem('🔄 同步主考資料（ExaminerMatrix → Examiners）', 'syncExaminerMatrix')
    .addItem('✍️ 自動補 full_title（BadgeCodes 空白列）', 'autoComposeFullTitles')
    .addItem('🔧 重建 Matrix 表頭（依 BadgeCodes）', 'rebuildMatrixHeaderFromBadgeCodes')
    .addSeparator()
    .addItem('🔑 重新生成 API Key', 'regenerateApiKeyMenu')
    .addItem('👀 顯示進階工作表', 'showAdvancedSheets')
    .addItem('🙈 隱藏進階工作表', 'hideAdvancedSheets')
    .addItem('📊 查看同步狀態', 'showSyncStatus')
    .addToUi();
}


function showSyncStatus() {
  var ss = getSpreadsheet();
  var exCount = ss.getSheetByName('Examiners') ? Math.max(0, ss.getSheetByName('Examiners').getLastRow() - 1) : 0;
  var matrixCount = 0;
  var matrixSheet = ss.getSheetByName('ExaminerMatrix');
  if (matrixSheet) { var d = matrixSheet.getDataRange().getValues(); for (var i = 1; i < d.length; i++) { if (d[i][0] && d[i][0].toString().trim()) matrixCount++; } }
  SpreadsheetApp.getUi().alert('主考同步狀態', '📋 ExaminerMatrix：' + matrixCount + ' 位主考\n📊 Examiners：' + exCount + ' 位主考\n\n' + (exCount === matrixCount ? '✅ 已同步' : '⚠️ 數量不一致'), SpreadsheetApp.getUi().ButtonSet.OK);
}

// T. 新增：Web API 觸發同步
function apiSyncExaminers(data) {
  // 為了方便測試，如果 staffToken 為空，也可以嘗試運行（僅限開發階段，正式使用請取消註解檢查）
  // if (!data.staffToken || data.staffToken !== getConfig('STAFF_TOKEN')) 
  //   return { success: false, error: '權限不足' };
  
  try {
    var ss = getSpreadsheet();
    var result = syncExaminerMatrixDirect(ss);
    return result;
  } catch (e) {
    return { success: false, error: '同步失敗: ' + e.toString() };
  }
}
function recalculateAllExaminerLoads() {
  var ss = getSpreadsheet();
  var appSheet = ss.getSheetByName('Applications');
  var exSheet = ss.getSheetByName('Examiners');
  
  // 算每位主考的 in-progress 案件數
  var appData = appSheet.getDataRange().getValues();
  var appH = appData[0];
  var loadMap = {};  // examinerId → count
  
  // 「in-progress」= 已派但未完成
  var inProgressStatuses = [
    CONFIG.STATUS.PENDING_EXAMINER_ACCEPT,
    CONFIG.STATUS.ASSIGNED_EXAMINER
  ];
  
  for (var i = 1; i < appData.length; i++) {
    var status = getAppValue(appData[i], appH, 'status');
    var examinerId = getAppValue(appData[i], appH, 'assigned_examiner_id');
    if (examinerId && inProgressStatuses.indexOf(status) >= 0) {
      loadMap[examinerId] = (loadMap[examinerId] || 0) + 1;
    }
  }
  
  // 寫回 Examiners
  var exData = exSheet.getDataRange().getValues();
  var exH = exData[0];
  var loadCol = exH.indexOf('current_load') + 1;
  var idCol = exH.indexOf('examiner_id');
  
  var updated = 0;
  for (var i = 1; i < exData.length; i++) {
    var exId = exData[i][idCol];
    var newLoad = loadMap[exId] || 0;
    var oldLoad = exData[i][loadCol - 1];
    if (newLoad !== oldLoad) {
      exSheet.getRange(i + 1, loadCol).setValue(newLoad);
      Logger.log('主考 ' + exId + ': ' + oldLoad + ' → ' + newLoad);
      updated++;
    }
  }
  
  return { success: true, message: '已重算 ' + updated + ' 位主考的負荷' };
}

// 給 admin API 呼叫的包裝
function apiRecalculateLoads(data) {
  if (!data.staffToken || data.staffToken !== getConfig('STAFF_TOKEN')) {
    return { success: false, error: '權限不足' };
  }
  return recalculateAllExaminerLoads();
}

function diagnoseSheetAccess() {
  Logger.log('=== 診斷開始 ===');
  Logger.log('當前帳號: ' + Session.getActiveUser().getEmail());
  Logger.log('有效使用者: ' + Session.getEffectiveUser().getEmail());
  
  var sheetId = PropertiesService.getScriptProperties().getProperty('DBS_SHEET_ID') || '';
  Logger.log('嘗試打開 Sheet ID: ' + sheetId);
  
  try {
    var ss = SpreadsheetApp.openById(sheetId);
    Logger.log('✅ Sheet 打開成功');
    Logger.log('Sheet 名稱: ' + ss.getName());
    Logger.log('Sheet URL: ' + ss.getUrl());
    
    var sheets = ss.getSheets();
    Logger.log('共有 ' + sheets.length + ' 個工作表:');
    sheets.forEach(function(sh) {
      Logger.log('  - ' + sh.getName());
    });
    
    var badgeSheet = ss.getSheetByName('BadgeCodes');
    if (badgeSheet) {
      Logger.log('✅ BadgeCodes 工作表找到，共 ' + badgeSheet.getLastRow() + ' 列');
    } else {
      Logger.log('❌ 找不到名為「BadgeCodes」的工作表');
    }
  } catch (e) {
    Logger.log('❌ 打開 Sheet 失敗: ' + e.message);
    Logger.log('   完整錯誤: ' + e.stack);
  }
}

function debugYm() {
  var data = getSpreadsheet().getSheetByName('Applications').getDataRange().getValues();
  var headers = data[0];
  var ymCol = headers.indexOf('ym_number');
  var appCol = headers.indexOf('application_id');
  
  Logger.log('Applications 共 ' + (data.length - 1) + ' 筆資料');
  for (var i = 1; i < data.length; i++) {
    var ym = data[i][ymCol];
    var app = data[i][appCol];
    Logger.log('[' + i + '] appId="' + app + '" | ym=' + JSON.stringify(ym) + ' (type=' + typeof ym + ')');
  }
}
// ============================================================
// U. 列印同步 API (v3.11)
// ============================================================

/**
 * CertificatePrintList 排序 + 重編序號 + 生成證書編號
 * ★ 序號全域累加，不跨年重設
 */
function sortAndRenumberCertificates(ss) {
  var printSheet = ss.getSheetByName('CertificatePrintList');
  if (!printSheet || printSheet.getLastRow() <= 1) return;
  
  var lastRow = printSheet.getLastRow(), lastCol = printSheet.getLastColumn();
  var allData = printSheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = allData[0], rows = allData.slice(1);
  
  // 按考獲日期排序（欄位索引 1），同日期按 application_id 排序
  rows.sort(function(a, b) {
    var dateA = a[1] ? new Date(a[1]) : new Date('2099-12-31');
    var dateB = b[1] ? new Date(b[1]) : new Date('2099-12-31');
    if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
    return (a[16] || '').localeCompare(b[16] || '');
  });
  
  // ★★★ 全域累加序號：不跨年重設 ★★★
  var badgeSeq = {};  // { "SIN": 15, "SFA": 8, ... }
  
  // 先掃描所有已有證書編號，建立基底計數
  for (var k = 0; k < rows.length; k++) {
    var existingNum = rows[k][2];
    var bc = rows[k][12];
    if (existingNum && bc) {
      var parts = existingNum.toString().split('/');
      if (parts.length >= 5) {
        var seq = parseInt(parts[4]);
        if (!isNaN(seq) && seq > (badgeSeq[bc] || 0)) {
          badgeSeq[bc] = seq;
        }
      }
    }
  }
  
  // 重編 + 生成證書編號
  for (var i = 0; i < rows.length; i++) {
    rows[i][0] = i + 1;
    if (!rows[i][2] || rows[i][2].toString().trim() === '') {
      var badgeCode = rows[i][12] || 'GEN';
      badgeSeq[badgeCode] = (badgeSeq[badgeCode] || 0) + 1;
      var seq = badgeSeq[badgeCode];
      rows[i][2] = badgeCode + '/HKIR/' + new Date().getFullYear() + '/' + getDistrictCode_() + '/' + ('000' + seq).slice(-3);
    }
  }
  
  var newData = [headers].concat(rows);
  printSheet.clear();
  printSheet.getRange(1, 1, newData.length, newData[0].length).setValues(newData);
}

/**
 * 主考合格時：同步到 CertificatePrintList + 排序 + 重編證書編號
 */
function syncToPrintListOnPass(ss, appId, memberName, memberNameEn, groupId, badgeName, resultDate, examinerName, remarks) {
  var certQueue = ss.getSheetByName('CertificateQueue');
  var printSheet = ss.getSheetByName('CertificatePrintList');
  var appSheet = ss.getSheetByName('Applications');
  
  if (!printSheet) return;
  
  var appData = appSheet.getDataRange().getValues();
  var appHeaders = appData[0];
  var appRow = null;
  var appIdColApp = appHeaders.indexOf('application_id');
  for (var i = 1; i < appData.length; i++) {
    if (appData[i][appIdColApp] === appId) { appRow = appData[i]; break; }
  }
  if (!appRow) return;
  
  var groupInfo = getGroupFullData(groupId);
  var badgeInfo = getBadgeFullData(badgeName);
  
  printSheet.appendRow([
    0,
    resultDate.toString().split('T')[0],
    '',
    memberName,
    memberNameEn || '',
    groupInfo.groupNumber,
    groupInfo.groupNameCn,
    groupInfo.groupNameEn,
    badgeInfo.fullTitle,
    badgeInfo.category,
    badgeInfo.categoryEn,
    badgeInfo.badgeName,
    badgeInfo.badgeCode,
    badgeInfo.badgeNameEn,
    getConfig('CERT_SIGNER_TITLE_CN') || '楊德銘',
    getConfig('CERT_SIGNER_TITLE_EN') || 'Yeung Tak Ming',
    appId,
    'BATCH-' + Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyyyMMdd-HHmm'),
    new Date().toISOString(),
    0,
    ''
  ]);
  
  sortAndRenumberCertificates(ss);
  
  // 更新 CertificateQueue 的證書編號
  var certData = certQueue.getDataRange().getValues();
  var certHeaders = certData[0];
  var certIdCol = certHeaders.indexOf('certificate_id');
  var certNumCol = certHeaders.indexOf('certificate_number');
  
  if (certIdCol >= 0 && certNumCol >= 0) {
    var newPrintData = printSheet.getDataRange().getValues();
    var newPrintHeaders = newPrintData[0];
    var newAppIdCol = newPrintHeaders.indexOf('application_id');
    var newCertNumCol = newPrintHeaders.indexOf('證書編號');
    
    for (var i = 1; i < certData.length; i++) {
      if (certData[i][1] === appId && (!certData[i][certNumCol] || certData[i][certNumCol] === '')) {
        for (var j = 1; j < newPrintData.length; j++) {
          if (newPrintData[j][newAppIdCol] === appId) {
            certQueue.getRange(i + 1, certNumCol + 1).setValue(newPrintData[j][newCertNumCol]);
            break;
          }
        }
        break;
      }
    }
  }
  
  addAuditLog('PRINT_LIST_AUTO_SYNC', appId, examinerName || '主考', '合格自動同步: ' + badgeName);
}

/**
 * 列印時更新 CertificateQueue 的 print_status 和 printed_at
 */
function apiRecordPrintAction(data) {
  try {
    if (!data.staffToken || data.staffToken !== getConfig('STAFF_TOKEN')) {
      return { success: false, error: '權限不足' };
    }
    var ss = getSpreadsheet();
    var certSheet = ss.getSheetByName('CertificateQueue');
    var certData = certSheet.getDataRange().getValues();
    var certIdCol = certData[0].indexOf('certificate_id');
    var rowIndex = -1;
    for (var i = 1; i < certData.length; i++) {
      if (certData[i][certIdCol] === data.certificateId) { rowIndex = i; break; }
    }
    if (rowIndex === -1) return { success: false, error: '找不到證書記錄' };
    
    var headers = certData[0];
    var now = new Date().toISOString();
    var printStatusCol = headers.indexOf('print_status') + 1;
    var printedAtCol = headers.indexOf('printed_at') + 1;
    
    if (printStatusCol > 0) certSheet.getRange(rowIndex + 1, printStatusCol).setValue('PRINTED');
    if (printedAtCol > 0) certSheet.getRange(rowIndex + 1, printedAtCol).setValue(now);
    
    addAuditLog('PRINT_ACTION', data.certificateId, '秘書', '證書已列印');
    return { success: true, message: 'CertificateQueue 已更新', printedAt: now };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * 同步證書資料到 CertificatePrintList
 */
function apiSyncCertificatePrintList(data) {
  try {
    var ss = getSpreadsheet();
    var printSheet = ss.getSheetByName('CertificatePrintList');
    if (!printSheet) return { success: false, error: '找不到 CertificatePrintList' };
    
    var cert = data.certData || {};
    var appId = cert.applicationId || data.applicationId;
    
    var printData = printSheet.getDataRange().getValues();
    var printHeaders = printData[0];
    var appIdCol = printHeaders.indexOf('application_id');
    
    for (var i = 1; i < printData.length; i++) {
      if (appIdCol >= 0 && printData[i][appIdCol] === appId) {
        return { success: true, message: 'CertificatePrintList 已有此記錄', action: 'skipped' };
      }
    }
    
    var appSheet = ss.getSheetByName('Applications');
    var appData = appSheet.getDataRange().getValues();
    var appHeaders = appData[0];
    var appRow = null;
    if (appId) {
      var appIdColApp = appHeaders.indexOf('application_id');
      for (var i = 1; i < appData.length; i++) {
        if (appData[i][appIdColApp] === appId) { appRow = appData[i]; break; }
      }
    }
    
    var memberName = cert.memberName || (appRow ? getAppValue(appRow, appHeaders, 'member_name') : '');
    var memberNameEn = cert.memberNameEn || (appRow ? getAppValue(appRow, appHeaders, 'member_name_en') : '');
    var groupId = cert.groupId || (appRow ? getAppValue(appRow, appHeaders, 'group_id') : '');
    var badgeName = cert.badgeName || (appRow ? getAppValue(appRow, appHeaders, 'badge_name') : '');
    var resultDate = cert.resultDate || (appRow ? getAppValue(appRow, appHeaders, 'result_date') : '') || new Date().toISOString().split('T')[0];
    
    var badgeInfo = getBadgeFullData(badgeName);
    var groupInfo = getGroupFullData(groupId);
    var now = new Date();
    
    printSheet.appendRow([
      0,
      resultDate.toString().split('T')[0],
      cert.certificateNumber || '',
      memberName,
      memberNameEn,
      groupInfo.groupNumber,
      groupInfo.groupNameCn,
      groupInfo.groupNameEn,
      badgeInfo.fullTitle,
      badgeInfo.category,
      badgeInfo.categoryEn,
      badgeInfo.badgeName,
      badgeInfo.badgeCode,
      badgeInfo.badgeNameEn,
      getConfig('CERT_SIGNER_TITLE_CN') || '楊德銘',
      getConfig('CERT_SIGNER_TITLE_EN') || 'Yeung Tak Ming',
      appId,
      cert.printBatch || ('BATCH-' + Utilities.formatDate(now, 'Asia/Hong_Kong', 'yyyyMMdd-HHmm')),
      cert.addedTimestamp || now.toISOString(),
      cert.reprintCount || 0,
      cert.lastReprintAt || ''
    ]);
    
    sortAndRenumberCertificates(ss);
    
    if (appId) addAuditLog('PRINT_LIST_SYNC', appId, '系統', '已同步到 CertificatePrintList');
    return { success: true, message: '已新增到 CertificatePrintList', action: 'created' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/* ---------- ADC Token 驗證 ---------- */
function checkAdcToken_(token) {
  var t = getConfig('ADC_TOKEN');
  return !!t && String(token) === String(t);
}

function apiAdcVerify(data) {
  if (!checkAdcToken_(data.adcToken)) return { success: false, error: 'ADC 密鑰錯誤' };
  return { success: true };
}

/* ---------- 逗號清單工具（過濾雜訊 #N/A 等） ---------- */
function splitBadgeList_(raw) {
  return String(raw || '').split(',')
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s && s !== '#N/A' && s !== '#REF!' && s !== 'NULL'; });
}

/* ---------- 讀 BadgeCodes 全部 active 章的 full_title（依表內順序，逐字複製） ---------- */
function getActiveFullTitles_() {
  var sheet = getSpreadsheet().getSheetByName('BadgeCodes');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var H = data[0];
  var ftCol = H.indexOf('full_title'), acCol = H.indexOf('active');
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var active = data[i][acCol];
    if (!(active === '✔' || active === true || active === 'TRUE')) continue;
    var ft = data[i][ftCol] ? String(data[i][ftCol]).trim() : '';
    if (ft) out.push(ft);
  }
  return out;
}

function autoComposeFullTitles() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('BadgeCodes');
  if (!sheet) {
    try { SpreadsheetApp.getUi().alert('找不到 BadgeCodes'); } catch (e) {}
    return { success: false, error: '找不到 BadgeCodes' };
  }
  var data = sheet.getDataRange().getValues();
  var H = data[0];
  var nameCol = H.indexOf('badge_name'), catCol = H.indexOf('category'), ftCol = H.indexOf('full_title');
  var filled = 0, filledList = [];

  for (var i = 1; i < data.length; i++) {
    var name = data[i][nameCol] ? String(data[i][nameCol]).trim() : '';
    var cat = data[i][catCol] ? String(data[i][catCol]).trim() : '';
    var ft = data[i][ftCol] ? String(data[i][ftCol]).trim() : '';
    if (!ft && name) {
      var composed = cat ? (cat + ' - ' + name) : name;
      sheet.getRange(i + 1, ftCol + 1).setValue(composed);
      filled++; filledList.push(composed);
    }
  }

  var msg = '已自動補上 ' + filled + ' 個 full_title' + (filled ? '：\n' + filledList.join('\n') : '');
  try { SpreadsheetApp.getUi().alert('自動補 full_title', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
  return { success: true, filled: filled, list: filledList };
}

function rebuildMatrixHeaderFromBadgeCodes() {
  var ss = getSpreadsheet();

  // 1) 驗證 BadgeCodes
  var check = validateBadgeCodes_();
  if (!check.ok) {
    var emsg = '❌ BadgeCodes 有問題，請先修正：\n\n' + check.errors.join('\n');
    try { SpreadsheetApp.getUi().alert('重建失敗', emsg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
    return { success: false, errors: check.errors };
  }
  var titles = getActiveFullTitles_();   // 依 BadgeCodes 順序

  // 2) 讀現有 Matrix（保留主考資料）
  var sh = ss.getSheetByName('ExaminerMatrix');
  if (!sh) { sh = ss.insertSheet('ExaminerMatrix'); }
  var old = sh.getDataRange().getValues();
  var oldHeader = old.length > 0 ? old[0] : [];
  var oldTitleToCol = {};
  for (var c = 2; c < oldHeader.length; c++) {
    var t = oldHeader[c] ? String(oldHeader[c]).trim().replace(/\n/g, '') : '';
    if (t) oldTitleToCol[t] = c;
  }

  // 3) 重建：把舊主考列資料按新表頭順序重排
  var newHeader = ['姓名', '單位'].concat(titles);
  var newRows = [newHeader];
  for (var r = 1; r < old.length; r++) {
    var name = old[r][0] ? String(old[r][0]).trim() : '';
    if (!name) continue;
    var unit = old[r][1] ? String(old[r][1]).trim() : '';
    var row = [name, unit];
    for (var k = 0; k < titles.length; k++) {
      var oc = oldTitleToCol[titles[k]];
      var val = (oc !== undefined && old[r][oc]) ? String(old[r][oc]).trim().toUpperCase() : '';
      row.push(val === 'D' ? 'D' : (val === 'G' ? 'G' : ''));
    }
    newRows.push(row);
  }

  // 4) 寫回（清空後整批寫）
  sh.clear();
  sh.getRange(1, 1, newRows.length, newHeader.length).setValues(newRows);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(2);

  var msg = '✅ Matrix 表頭已依 BadgeCodes 重建。\n\n' +
    '專章欄數：' + titles.length + '\n' +
    '保留主考列：' + (newRows.length - 1) + '\n\n' +
    '現有主考的 D/G 已依 full_title 重新對位保留。';
  try { SpreadsheetApp.getUi().alert('重建完成', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
  return { success: true, badgeCount: titles.length, examinerCount: newRows.length - 1 };
}

/* ---------- BadgeCodes 驗證：active 章的 full_title 不可空白 / 不可重複 ---------- */
function validateBadgeCodes_() {
  var sheet = getSpreadsheet().getSheetByName('BadgeCodes');
  if (!sheet) return { ok: false, errors: ['找不到 BadgeCodes 工作表'] };
  var data = sheet.getDataRange().getValues();
  var H = data[0];
  var nameCol = H.indexOf('badge_name'), ftCol = H.indexOf('full_title'), acCol = H.indexOf('active');
  var errors = [], seen = {};
  for (var i = 1; i < data.length; i++) {
    var active = data[i][acCol];
    if (!(active === '✔' || active === true || active === 'TRUE')) continue;
    var name = data[i][nameCol] ? String(data[i][nameCol]).trim() : '';
    var ft = data[i][ftCol] ? String(data[i][ftCol]).trim() : '';
    if (!ft) {
      errors.push('第 ' + (i + 1) + ' 列「' + (name || '?') + '」full_title 空白（請先按「✍️ 自動補 full_title」或手動補上）');
      continue;
    }
    if (seen[ft]) {
      errors.push('full_title 重複：「' + ft + '」（第 ' + seen[ft] + ' 列 與 第 ' + (i + 1) + ' 列）— 細分章請加上不同細項，如 (英語)/(普通話)');
    } else {
      seen[ft] = (i + 1);
    }
  }
  return { ok: errors.length === 0, errors: errors };
}

function apiAdcGetPending(data) {
  if (!checkAdcToken_(data.adcToken)) return { success: false, error: 'ADC 密鑰錯誤' };
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('ExaminerAppointments');
  if (!sheet) return { success: false, error: '找不到 ExaminerAppointments 工作表' };
  var rows = sheet.getDataRange().getValues();

  var pick = function (notes, label) {
    var m = notes.match(new RegExp(label + '：([^|]*)'));
    return m ? m[1].trim() : '';
  };

  var list = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][8] !== 'PENDING_ADC_APPROVAL') continue;
    var notes = rows[i][10] || '';

    // 解析申請人逐章選的 D/G
    var badges = [];
    var scopesRaw = pick(notes, 'badge_scopes');
    if (scopesRaw) { try { badges = JSON.parse(scopesRaw); } catch (e) { badges = []; } }
    // 後備：舊資料沒 badge_scopes，就用 badge_name 欄拆，全部當 G
    if (!badges || badges.length === 0) {
      var bn = String(rows[i][2] || '');
      badges = bn.split(',').map(function (s) {
        return { code: '', fullTitle: s.replace(/\s*\(.*?\)\s*$/, '').trim(), scope: 'G' };
      }).filter(function (b) { return b.fullTitle; });
    }

    list.push({
      appointmentId: rows[i][0],
      name: pick(notes, '姓名'),
      email: pick(notes, '電郵'),
      phone: pick(notes, '電話'),
      groupId: pick(notes, '旅團'),
      rank: pick(notes, '職級'),
      yearsOfService: pick(notes, '年資'),
      qualifications: pick(notes, '資歷'),
      submittedAt: pick(notes, '提交時間'),
      certFileUrls: String(rows[i][7] || '').split('\n').filter(function (u) { return u; }),
      badges: badges
    });
  }
  return { success: true, applications: list };
}

function apiAdcApprove(data) {
  if (!checkAdcToken_(data.adcToken)) return { success: false, error: 'ADC 密鑰錯誤' };
  if (!data.appointmentId) return { success: false, error: '缺少 appointmentId' };
  var approved = data.approvedBadges || [];

  var ss = getSpreadsheet();
  var aptSheet = ss.getSheetByName('ExaminerAppointments');
  var aptData = aptSheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < aptData.length; i++) {
    if (aptData[i][0] === data.appointmentId) { rowIndex = i; break; }
  }
  if (rowIndex === -1) return { success: false, error: '找不到該申請' };

  var notes = aptData[rowIndex][10] || '';
  var pick = function (label) { var m = notes.match(new RegExp(label + '：([^|]*)')); return m ? m[1].trim() : ''; };
  var examinerName = pick('姓名');
  var examinerEmail = pick('電郵');
  var examinerPhone = pick('電話');
  var examinerUnit = normalizeUnit_(pick('旅團'));   // ★ 例如 G-082 → 第82旅

  var appliedBadges = [];
  var scopesRaw = pick('badge_scopes');
  if (scopesRaw) { try { appliedBadges = JSON.parse(scopesRaw); } catch (e) {} }

  var nowDate = Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyyy-MM-dd');
  var nowStr = new Date().toISOString();
  var termStart = getConfig('CURRENT_TERM_START') || '2025-04-01';
  var termEnd = data.termEnd || getConfig('CURRENT_TERM_END') || '2027-03-31';

  // ----- 寫入 Examiners（統一 full_title，增量 + 覆寫）-----
  var exSheet = ss.getSheetByName('Examiners');
  if (!exSheet) {
    exSheet = ss.insertSheet('Examiners');
    exSheet.appendRow(['examiner_id', 'name', 'unit', 'email', 'phone', 'district_badges', 'group_badges', 'term_start', 'term_end', 'status', 'current_load', 'max_load', 'updated_at']);
    exSheet.setFrozenRows(1);
  }
  var exData = exSheet.getDataRange().getValues();
  var EH = exData[0];
  var nameCol = EH.indexOf('name'), dCol = EH.indexOf('district_badges'),
      gCol = EH.indexOf('group_badges'), idCol = EH.indexOf('examiner_id');

  var exRow = -1;
  for (var r = 1; r < exData.length; r++) {
    if (String(exData[r][nameCol]).trim() === examinerName) { exRow = r; break; }
  }

  var examinerId, dList, gList;
  if (exRow >= 0) {
    examinerId = exData[exRow][idCol];
    dList = splitBadgeList_(exData[exRow][dCol]);
    gList = splitBadgeList_(exData[exRow][gCol]);
  } else {
    examinerId = 'E-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    dList = []; gList = [];
  }

  // 逐章套用，記錄動作（add / override / skip）
  var resultActions = [];
  approved.forEach(function (b) {
    var ft = b.fullTitle, scope = (b.scope === 'D') ? 'D' : 'G';
    var inD = dList.indexOf(ft) >= 0, inG = gList.indexOf(ft) >= 0;
    var action;
    if (scope === 'D') {
      if (inD) action = 'skip';
      else { if (inG) { gList = gList.filter(function (x) { return x !== ft; }); action = 'override'; } else action = 'add'; dList.push(ft); }
    } else {
      if (inG) action = 'skip';
      else { if (inD) { dList = dList.filter(function (x) { return x !== ft; }); action = 'override'; } else action = 'add'; gList.push(ft); }
    }
    resultActions.push({ fullTitle: ft, scope: scope, action: action });
  });

  if (exRow >= 0) {
    exSheet.getRange(exRow + 1, dCol + 1).setValue(dList.join(','));
    exSheet.getRange(exRow + 1, gCol + 1).setValue(gList.join(','));
    exSheet.getRange(exRow + 1, EH.indexOf('updated_at') + 1).setValue(nowDate);
    if (!exData[exRow][EH.indexOf('email')] && examinerEmail) exSheet.getRange(exRow + 1, EH.indexOf('email') + 1).setValue(examinerEmail);
    if (!exData[exRow][EH.indexOf('phone')] && examinerPhone) exSheet.getRange(exRow + 1, EH.indexOf('phone') + 1).setValue(examinerPhone);
    // 補單位（若原本空白）
    if (!exData[exRow][EH.indexOf('unit')] && examinerUnit) exSheet.getRange(exRow + 1, EH.indexOf('unit') + 1).setValue(examinerUnit);
  } else {
    exSheet.appendRow([
      examinerId, examinerName, examinerUnit, examinerEmail, examinerPhone,
      dList.join(','), gList.join(','),
      termStart, termEnd, 'ACTIVE', 0, 5, nowDate
    ]);
  }

  // ----- 寫入 ExaminerMatrix（缺欄自動補）-----
  writeBadgesToMatrix_(ss, examinerName, examinerUnit,
    approved.map(function (b) { return { fullTitle: b.fullTitle, scope: (b.scope === 'D') ? 'D' : 'G' }; }));

  // ----- 更新 Appointment 狀態 -----
  var appliedCount = appliedBadges.length || approved.length;
  var newStatus = (approved.length === 0) ? 'REJECTED'
    : (approved.length < appliedCount ? 'PARTIALLY_APPROVED' : 'APPROVED');
  aptSheet.getRange(rowIndex + 1, 2).setValue(examinerId);
  aptSheet.getRange(rowIndex + 1, 4).setValue(termStart);
  aptSheet.getRange(rowIndex + 1, 5).setValue(termEnd);
  aptSheet.getRange(rowIndex + 1, 6).setValue(data.approvedBy || 'ADC');
  aptSheet.getRange(rowIndex + 1, 7).setValue(nowStr);
  aptSheet.getRange(rowIndex + 1, 9).setValue(newStatus);

  // ----- 算被否決的章 -----
  var approvedKeys = {};
  approved.forEach(function (b) { approvedKeys[b.fullTitle + '|' + b.scope] = true; });
  var rejectedList = appliedBadges.filter(function (b) {
    return !approvedKeys[b.fullTitle + '|' + ((b.scope === 'D') ? 'D' : 'G')];
  });

  // ----- 回信給申請人 -----
  if (examinerEmail) {
    var label = function (s) { return s === 'D' ? '區主考(D)' : '旅團主考(G)'; };
    var grantedLines = resultActions.filter(function (a) { return a.action !== 'skip'; })
      .map(function (a) { return '　• ' + a.fullTitle + '　→　' + label(a.scope) + (a.action === 'override' ? '（已由原級別更新）' : ''); });
    var skipLines = resultActions.filter(function (a) { return a.action === 'skip'; })
      .map(function (a) { return '　• ' + a.fullTitle + '（您已是此章 ' + label(a.scope) + '，無需重複）'; });
    var rejLines = rejectedList.map(function (b) {
      return '　• ' + b.fullTitle + '　（' + label((b.scope === 'D') ? 'D' : 'G') + '）';
    });

    var body = examinerName + ' 您好：\n\n您的主考委任申請（' + data.appointmentId + '）已完成審批。\n\n' +
      '主考編號：' + examinerId + '\n' +
      '任期：' + termStart + ' 至 ' + termEnd + '\n\n' +
      (grantedLines.length ? '✅ 已獲委任（' + grantedLines.length + ' 項）：\n' + grantedLines.join('\n') + '\n\n' : '') +
      (skipLines.length ? 'ℹ️ 原已具備（' + skipLines.length + ' 項）：\n' + skipLines.join('\n') + '\n\n' : '') +
      (rejLines.length ? '❌ 未獲批准（' + rejLines.length + ' 項）：\n' + rejLines.join('\n') + '\n\n' : '') +
      '您現可在系統中接受相關專章的考核指派。\n\n'+ getSystemLabel_() +'';
    sendSystemEmail(examinerEmail, '【'+ getDistrictName_() +'專科徽章】主考申請審批結果', body);
  }

  // ----- ★ 批核後自動同步（Matrix → Examiners），DBS 不用手動 -----
  var syncMsg = '';
  try {
    var syncRes = syncExaminerMatrixDirect(ss);
    syncMsg = (syncRes && syncRes.success) ? ('已自動同步，目前主考 ' + (syncRes.syncedCount || '?') + ' 位') : ('自動同步未完成：' + (syncRes && syncRes.error ? syncRes.error : '未知'));
  } catch (e) {
    syncMsg = '自動同步發生錯誤：' + e.toString();
  }

  // ----- ★ 通知 DBS（含同步結果）-----
  var grantedCount = resultActions.filter(function (a) { return a.action !== 'skip'; }).length;
  sendSystemEmail(getEmailReplyTo_(),
    '【'+ getDistrictName_() +'專科徽章】主考委任已審批 - ' + examinerName,
    'DBS 您好：\n\nADC 已完成一筆主考委任審批，系統已自動同步。\n\n' +
    '申請編號：' + data.appointmentId + '\n' +
    '主考：' + examinerName + '（' + examinerId + '）\n' +
    '單位：' + examinerUnit + '\n' +
    '結果：' + newStatus + '（獲委任 ' + grantedCount + ' 項 / 否決 ' + rejectedList.length + ' 項）\n' +
    '🔄 同步狀態：' + syncMsg + '\n\n' +
    '※ 已自動執行 Matrix → Examiners 同步，一般情況下您無需再手動同步。\n' +
    '如名單有異常，可到試算表選單按「🔄 同步主考資料」再跑一次。\n\n'+ getSystemLabel_() +'');

  addAuditLog('EXAMINER_ADC_APPROVED', data.appointmentId, data.approvedBy || 'ADC',
    '批准 ' + approved.length + ' / 否決 ' + rejectedList.length + ' / ' + syncMsg);

  return {
    success: true, examinerId: examinerId, status: newStatus, actions: resultActions,
    approvedCount: grantedCount,
    skippedCount: resultActions.filter(function (a) { return a.action === 'skip'; }).length,
    rejectedCount: rejectedList.length,
    autoSync: syncMsg,
    message: '審批完成，已寫入並自動同步'
  };
}

function writeBadgesToMatrix_(ss, examinerName, examinerUnit, badges) {
  var sh = ss.getSheetByName('ExaminerMatrix');
  if (!sh) { sh = ss.insertSheet('ExaminerMatrix'); sh.getRange(1, 1, 1, 2).setValues([['姓名', '單位']]); }
  var data = sh.getDataRange().getValues();
  if (data.length < 1) { sh.getRange(1, 1, 1, 2).setValues([['姓名', '單位']]); data = sh.getDataRange().getValues(); }

  // 表頭：full_title -> 欄索引（0-based）
  var header = data[0];
  var titleToCol = {};
  for (var c = 2; c < header.length; c++) {
    var t = header[c] ? String(header[c]).trim().replace(/\n/g, '') : '';
    if (t) titleToCol[t] = c;
  }

  // 防呆：缺欄就自動補在最右
  badges.forEach(function (b) {
    if (titleToCol[b.fullTitle] === undefined) {
      var newCol = sh.getLastColumn() + 1;         // 1-based
      sh.getRange(1, newCol).setValue(b.fullTitle);
      titleToCol[b.fullTitle] = newCol - 1;        // 存 0-based
    }
  });

  // 找主考列（用 1-based 試算表列號，避免 off-by-one）
  var sheetRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && String(data[i][0]).trim() === examinerName) { sheetRow = i + 1; break; }
  }
  if (sheetRow === -1) {                            // 新主考 → 追加到最後一列之後
    sheetRow = sh.getLastRow() + 1;
    sh.getRange(sheetRow, 1).setValue(examinerName);
    sh.getRange(sheetRow, 2).setValue(examinerUnit || '');
  }

  // 逐章填 D/G
  badges.forEach(function (b) {
    var col0 = titleToCol[b.fullTitle];            // 0-based
    if (col0 !== undefined) sh.getRange(sheetRow, col0 + 1).setValue(b.scope === 'G' ? 'G' : 'D');
  });
}

function apiGetExaminerAppointmentStatus(data) {
  if (!data.appointmentId) return { success: false, error: '請輸入申請編號' };
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('ExaminerAppointments');
  if (!sheet) return { success: false, error: '找不到資料表' };
  var rows = sheet.getDataRange().getValues();

  var rowIndex = -1;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(data.appointmentId).trim()) { rowIndex = i; break; }
  }
  if (rowIndex === -1) return { success: false, error: '找不到此申請編號，請檢查是否輸入正確' };

  var row = rows[rowIndex];
  var notes = row[10] || '';
  var pick = function (label) { var m = notes.match(new RegExp(label + '：([^|]*)')); return m ? m[1].trim() : ''; };

  // 解析申請的章 + D/G
  var badges = [];
  var scopesRaw = pick('badge_scopes');
  if (scopesRaw) { try { badges = JSON.parse(scopesRaw); } catch (e) { badges = []; } }

  var rawStatus = row[8] || '';
  var statusMap = {
    'PENDING_ADC_APPROVAL': '待 ADC 審批',
    'APPROVED': '已批准（全部）',
    'PARTIALLY_APPROVED': '已批准（部分）',
    'REJECTED': '未獲批准'
  };

  return {
    success: true,
    appointmentId: row[0],
    applicantName: pick('姓名'),
    groupId: pick('旅團'),
    submittedAt: pick('提交時間'),
    statusCode: rawStatus,
    statusText: statusMap[rawStatus] || rawStatus || '處理中',
    examinerId: row[1] || '',
    approvedBy: row[5] || '',
    approvedAt: row[6] || '',
    termStart: row[3] || '',
    termEnd: row[4] || '',
    appliedBadges: badges
  };
}

function apiGetHealthCheck() {
  try {
    var ss = getSpreadsheet();
    var requiredSheets = ['Config', 'Groups', 'BadgeCodes', 'Applications', 'CertificateQueue', 'AuditLog', 'ExaminerAppointments'];
    var checks = {};
    requiredSheets.forEach(function(name) { checks[name] = !!ss.getSheetByName(name); });

    var districtCode = String(getConfig('DISTRICT_CODE') || '').trim();
    var districtName = String(getConfig('DISTRICT_NAME') || '').trim();
    var frontendUrl = String(getConfig('FRONTEND_URL') || '').trim();
    var staffToken = String(getConfig('STAFF_TOKEN') || '').trim();
    var adcToken = String(getConfig('ADC_TOKEN') || '').trim();
    var webAppUrlConfig = String(getConfig('WEB_APP_URL') || '').trim();
    var webAppUrl = webAppUrlConfig || String(ScriptApp.getService().getUrl() || '').trim();

    return {
      success: true,
      districtCode: districtCode,
      districtName: districtName,
      systemVersion: String(getConfig('SYSTEM_VERSION') || 'DBS 3.0 Multi-District'),
      frontendUrl: frontendUrl,
      webAppUrl: webAppUrl,
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      ready: !!(districtCode && districtName && frontendUrl && webAppUrlConfig && staffToken && adcToken),
      checks: {
        configSheet: checks.Config,
        groupsSheet: checks.Groups,
        badgeCodesSheet: checks.BadgeCodes,
        applicationsSheet: checks.Applications,
        certificateQueueSheet: checks.CertificateQueue,
        auditLogSheet: checks.AuditLog,
        examinerAppointmentsSheet: checks.ExaminerAppointments,
        districtCodeSet: !!districtCode,
        districtNameSet: !!districtName,
        frontendUrlSet: !!frontendUrl,
        webAppUrlSet: !!webAppUrlConfig,
        staffTokenSet: !!staffToken,
        adcTokenSet: !!adcToken
      }
    };
  } catch (e) {
    return { success: false, error: e.toString(), ready: false };
  }
}

function normalizeUnit_(groupIdOrName) {
  var raw = String(groupIdOrName || '').trim();
  if (!raw) return '';
  if (raw === 'DISTRICT') return '區職員';

  // 已經是中文短名就直接用
  if (raw.indexOf('第') === 0) return raw;

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Groups');
  if (!sheet) return raw;
  var data = sheet.getDataRange().getValues();
  // 欄位: group_id, group_number, group_name, ...
  for (var i = 1; i < data.length; i++) {
    var gid = String(data[i][0] || '').trim();          // G-082
    var gnum = String(data[i][1] || '').trim();         // 82
    if (gid === raw || gnum === raw) {
      return gnum ? ('第' + gnum + '旅') : (data[i][2] || raw);
    }
  }
  // 傳進來像 082 → 去前導零再試一次
  var stripped = raw.replace(/^0+/, '');
  for (var j = 1; j < data.length; j++) {
    var gnum2 = String(data[j][1] || '').trim();
    if (gnum2 === stripped) return '第' + gnum2 + '旅';
  }
  return raw;  // 真的找不到，原樣回傳，至少不丟失資料
}