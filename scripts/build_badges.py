"""由 2026 新版童軍訓練綱要（scoutsinfohub.org.hk/scout-training-scheme）
產生 BadgeCodes 預設資料，並取代 GS 模板內的 getDefaultBadgeCodesData_()。

規則：
- 保留舊版同章同分類的 badge_code（方便已發證書延續）
- 新章按分類前綴 + 英文縮寫給新 code
- 新綱要已取消的舊章 → 分類改為「舊」、active = FALSE（保留歷史記錄）
"""

# (中文, code, 英文, 分類, 英文分類)
BADGES = [
    # ── 興趣組 (Interest) ──
    ("釣魚", "IAN", "Angler", "興趣", "Interest"),
    ("射箭", "IAR", "Archery", "興趣", "Interest"),
    ("藝術", "IAT", "Artist", "興趣", "Interest"),
    ("運動", "IAH", "Athlete", "興趣", "Interest"),
    ("觀鳥", "IBW", "Birdwatcher", "興趣", "Interest"),
    ("抱石", "IBO", "Boulderer", "興趣", "Interest"),
    ("營地烹飪", "ICC", "Camp Cook", "興趣", "Interest"),
    ("營火", "ICF", "Campfire Host", "興趣", "Interest"),
    ("獨木舟", "ICA", "Canoeist", "興趣", "Interest"),
    ("搜集", "ICO", "Collector", "興趣", "Interest"),
    ("電腦", "ICP", "Computer", "興趣", "Interest"),
    ("單車", "ICY", "Cyclist", "興趣", "Interest"),
    ("龍舟", "IDB", "Dragon Boatman", "興趣", "Interest"),
    ("步操", "IFO", "Footdrill", "興趣", "Interest"),
    ("地質", "IGE", "Geologist", "興趣", "Interest"),
    ("騎術", "IHO", "Horseman", "興趣", "Interest"),
    ("風箏", "IKF", "Kite Flyer", "興趣", "Interest"),
    ("圖書管理", "ILI", "Librarian", "興趣", "Interest"),
    ("氣象", "IME", "Meteorologist", "興趣", "Interest"),
    ("模型製作", "IMM", "Model Maker", "興趣", "Interest"),
    ("音樂", "IMU", "Musician", "興趣", "Interest"),
    ("自然", "INA", "Naturalist", "興趣", "Interest"),
    ("公園定向", "IPO", "Park Orienteer", "興趣", "Interest"),
    ("動物飼養", "IPK", "Petkeeper", "興趣", "Interest"),
    ("攝影", "IPH", "Photographer", "興趣", "Interest"),
    ("划艇", "IRO", "Rowing Boatman", "興趣", "Interest"),
    ("風帆", "ISA", "Sailor", "興趣", "Interest"),
    ("農務", "ISM", "Smallholder", "興趣", "Interest"),
    ("立划板", "ISU", "Stand Up Paddleboarder", "興趣", "Interest"),
    ("立划板水球", "ISP", "Stand Up Paddling Polo", "興趣", "Interest"),
    ("游泳", "ISW", "Swimmer", "興趣", "Interest"),
    ("旅遊", "ITO", "Tourism", "興趣", "Interest"),
    ("滑浪風帆", "IWI", "Windsurfer", "興趣", "Interest"),

    # ── 技能組 (Pursuit) ──
    ("立體打印", "P3D", "3D Printing Technician", "技能", "Pursuit"),
    ("沿繩下降", "PAB", "Abseiler", "技能", "Pursuit"),
    ("射箭", "PAR", "Archery", "技能", "Pursuit"),
    ("天象", "PAS", "Astronomer", "技能", "Pursuit"),
    ("航空領航", "PAN", "Aviation Navigator", "技能", "Pursuit"),
    ("原野烹飪", "PBA", "Backwoods Cook", "技能", "Pursuit"),
    ("露營", "PCM", "Camper", "技能", "Pursuit"),
    ("獨木舟", "PCA", "Canoeist", "技能", "Pursuit"),
    ("獨木舟水球", "PCP", "Canoe Polo", "技能", "Pursuit"),
    ("攀登", "PCL", "Climber", "技能", "Pursuit"),
    ("通訊", "PCO", "Communicator", "技能", "Pursuit"),
    ("烹飪", "PCD", "Cook", "技能", "Pursuit"),
    ("手藝", "PCR", "Craftsman", "技能", "Pursuit"),
    ("數據分析", "PDA", "Data Analyst", "技能", "Pursuit"),
    ("電子", "PEL", "Electronics", "技能", "Pursuit"),
    ("探險", "PEX", "Explorer", "技能", "Pursuit"),
    ("模擬飛行", "PFS", "Flight Simulator", "技能", "Pursuit"),
    ("步操", "PFO", "Footdrill", "技能", "Pursuit"),
    ("地圖繪製", "PMM", "Map Maker", "技能", "Pursuit"),
    ("地圖閱讀", "PMR", "Map Reader", "技能", "Pursuit"),
    ("射擊", "PMS", "Marksman", "技能", "Pursuit"),
    ("技擊", "PMA", "Master-at-arms", "技能", "Pursuit"),
    ("機械", "PMC", "Mechanic", "技能", "Pursuit"),
    ("氣象", "PME", "Meteorologist", "技能", "Pursuit"),
    ("多媒體創作", "PMD", "Multimedia Designer", "技能", "Pursuit"),
    ("領航", "PNA", "Navigator", "技能", "Pursuit"),
    ("觀察", "POB", "Observer", "技能", "Pursuit"),
    ("野外定向", "POR", "Orienteer", "技能", "Pursuit"),
    ("先鋒工程", "PPI", "Pioneer", "技能", "Pursuit"),
    ("編程", "PPR", "Programmer", "技能", "Pursuit"),
    ("風帆", "PSA", "Sailor", "技能", "Pursuit"),
    ("徒手潛水", "PSD", "Skin Diver", "技能", "Pursuit"),
    ("艇長", "PBO", "Skipper", "技能", "Pursuit"),
    ("體育", "PSP", "Sportsman", "技能", "Pursuit"),
    ("樹木護理", "PTC", "Tree Carer", "技能", "Pursuit"),

    # ── 服務組 (Service) ──
    ("愛護動物", "SAC", "Animal Carer", "服務", "Service"),
    ("公民", "SCI", "Civics", "服務", "Service"),
    ("網絡安全", "SCY", "Cybersecurity Analyst", "服務", "Service"),
    ("多元共融", "SDI", "Diversity & Inclusion", "服務", "Service"),
    ("消防", "SFI", "Fireman", "服務", "Service"),
    ("急救", "SFA", "First Aider", "服務", "Service"),
    ("指引", "SGU", "Guide", "服務", "Service"),
    ("語言", "SIN", "Interpreter", "服務", "Service"),
    ("工藝", "SJO", "Jobman", "服務", "Service"),
    ("拯溺", "SLI", "Lifesaver", "服務", "Service"),
    ("精神健康", "SMH", "Mental Health Ambassador", "服務", "Service"),
    ("食物營養", "SNU", "Nutritionist", "服務", "Service"),
    ("領港", "SPI", "Pilot", "服務", "Service"),
    ("公共衞生", "SPH", "Public Health Ambassador", "服務", "Service"),
    ("物資管理", "SQU", "Quartermaster", "服務", "Service"),
    ("秘書", "SSE", "Secretary", "服務", "Service"),
    ("國際友誼", "SWF", "World Friendship Ambassador", "服務", "Service"),

    # ── 教導組 (Instructor) ──
    ("釣魚", "INAG", "Angler", "教導", "Instructor"),
    ("抱石", "INBO", "Boulderer", "教導", "Instructor"),
    ("營火", "INCF", "Campfire Host", "教導", "Instructor"),
    ("單車", "INCY", "Cyclist", "教導", "Instructor"),
    ("模型製作", "INMO", "Model Maker", "教導", "Instructor"),
    ("攝影", "INPH", "Photographer", "教導", "Instructor"),
    ("風帆", "INSA", "Sailor", "教導", "Instructor"),
    ("游泳", "INSW", "Swimmer", "教導", "Instructor"),
    ("天象", "INAS", "Astronomer", "教導", "Instructor"),
    ("原野烹飪", "INBA", "Backwoods Cook", "教導", "Instructor"),
    ("露營", "INCA", "Camper", "教導", "Instructor"),
    ("通訊", "INCM", "Communicator", "教導", "Instructor"),
    ("烹飪", "INCD", "Cook", "教導", "Instructor"),
    ("手藝", "INCR", "Craftsman", "教導", "Instructor"),
    ("模擬飛行", "INFS", "Flight Simulator", "教導", "Instructor"),
    ("地圖繪製", "INMM", "Map Maker", "教導", "Instructor"),
    ("地圖閱讀", "INMR", "Map Reader", "教導", "Instructor"),
    ("機械", "INMC", "Mechanic", "教導", "Instructor"),
    ("氣象", "INME", "Meteorologist", "教導", "Instructor"),
    ("多媒體創作", "INMD", "Multimedia Designer", "教導", "Instructor"),
    ("觀察", "INOB", "Observer", "教導", "Instructor"),
    ("野外定向", "INOR", "Orienteer", "教導", "Instructor"),
    ("先鋒工程", "INPI", "Pioneer", "教導", "Instructor"),
    ("編程", "INPR", "Programmer", "教導", "Instructor"),
    ("樹木護理", "INTC", "Tree Carer", "教導", "Instructor"),
    ("護養", "INCO", "Conservator", "教導", "Instructor"),
    ("拯溺", "INLI", "Lifesaver", "教導", "Instructor"),

    # ── 海上活動 (Sea) ──
    ("艇工", "SOA", "Oarsman", "海上", "Sea"),
    ("水手", "SBM", "Boatman", "海上", "Sea"),
    ("水手長", "SBW", "Boatswain", "海上", "Sea"),

    # ── 航空活動 (Air) ──
    ("初級航空活動", "BAA", "Basic Air Activity", "航空", "Air"),
    ("中級航空活動", "IAA", "Intermediate Air Activity", "航空", "Air"),
    ("高級航空活動", "AAA", "Advanced Air Activity", "航空", "Air"),

    # ── 其他獎章及徽章 (Others) ──
    ("和平使者章", "MOP", "Messengers of Peace", "其他", "Others"),
    ("走塑達人章", "PTT", "Plastic Tide Turners", "其他", "Others"),
    ("自然守護者章", "CFN", "Champions for Nature", "其他", "Others"),
    ("日光善用者章", "SGS", "Scouts Go Solar", "其他", "Others"),
    ("服務獎章", "SVF", "Service Flash", "其他", "Others"),
    ("領導才獎章", "LDA", "Leadership Award", "其他", "Others"),
    ("小隊活動巾圈", "PAW", "Patrol Activity Woggle", "其他", "Others"),
    ("宗教章", "SRB", "Religious Badge", "其他", "Others"),
    ("深資童軍先修章", "VSL", "Venture Scout Link Badge", "其他", "Others"),
    ("香港青年獎勵計劃", "AYP", "The Hong Kong Award for Young People", "其他", "Others"),
    ("防騙先鋒章", "ADB", "Anti-Deception Badge", "其他", "Others"),
    ("保護兒童章", "CPB", "Child Protection Badge", "其他", "Others"),
    ("禁毒章", "ATD", "Anti-Drug Badge", "其他", "Others"),
    ("社區應急先鋒章", "CER", "Community Emergency Responder Badge", "其他", "Others"),
    ("環保先鋒章", "GPB", "Green Pioneer Badge", "其他", "Others"),
]

# 2026 新綱要已取消（保留記錄，active = FALSE）
RETIRED = [
    ("愛護動物", "IAC", "Animal Care", "舊", "Legacy", "已改為服務組「愛護動物 Animal Carer」"),
    ("國際友誼", "PWF", "World Friendship", "舊", "Legacy", "已改為服務組「國際友誼 World Friendship Ambassador」"),
    ("獨木舟國際賽艇", "PIR", "International Racing Kayak", "舊", "Legacy", "2026 綱要已取消"),
    ("風帆賽艇舵手", "PRH", "Race Helmsman", "舊", "Legacy", "2026 綱要已取消"),
    ("營地管理", "SCW", "Camp Warden", "舊", "Legacy", "2026 綱要已取消"),
    ("獨木舟救生", "SCR", "Canoe Rescuer", "舊", "Legacy", "2026 綱要已取消"),
    ("共融", "SDA", "Disability Awareness", "舊", "Legacy", "已改為服務組「多元共融」"),
    ("環境保護", "SEP", "Environmental Protection", "舊", "Legacy", "已改為其他組「環保先鋒章」"),
    ("林務", "INFO", "Forester", "舊", "Legacy", "2026 綱要已取消"),
    ("社區參與章", "CIB", "Community Involvement Badge", "舊", "Legacy", "2026 綱要已取消"),
    ("繩結", "SKC", "Knotting", "舊", "Legacy", "2026 綱要已取消"),
    ("領導才", "SLTC", "Leadership Training", "舊", "Legacy", "已改為其他組「領導才獎章」"),
    ("維護自然世界章", "WCB", "World Conservation Badge", "舊", "Legacy", "2026 綱要已取消"),
    ("世界童軍環境章", "WSE", "World Scout Environment Badge", "舊", "Legacy", "2026 綱要已取消"),
]

# 原有已淘汰項目（保留）
LEGACY_KEEP = [
    ("航空", "SAM", "Airman", "舊", "Legacy", ""),
    ("高級航空", "SSA", "Senior Airman", "舊", "Legacy", ""),
    ("優異航空", "SMA", "Master Airman", "舊", "Legacy", ""),
    ("副舵手", "SCM", "Coxswain's Mate", "舊", "Legacy", ""),
    ("舵手", "SCO", "Coxswain", "舊", "Legacy", ""),
]


def row(name, code, en, cat, cat_en, active="TRUE", remark=""):
    full = f"{cat} - {name}"
    dup = "1"
    esc = remark.replace('"', '\\"')
    return f'    ["{name}", "{code}", "{en}", "{cat}", "{cat_en}", "{full}", "{active}", "{dup}", "{esc}"],'


lines = ["function getDefaultBadgeCodesData_() {", "  return ["]
lines.append("    // ═══ 2026 新訓練綱要（資料來源：scoutsinfohub.org.hk/scout-training-scheme）═══")
cur = None
for name, code, en, cat, cat_en in BADGES:
    if cat != cur:
        cur = cat
        lines.append(f"    // ── {cat}組（{cat_en}）──")
    lines.append(row(name, code, en, cat, cat_en))
lines.append("    // ═══ 舊版獎章（保留記錄，不影響新報考）═══")
for name, code, en, cat, cat_en, remark in RETIRED:
    lines.append(row(name, code, en, cat, cat_en, "FALSE", remark))
for name, code, en, cat, cat_en, remark in LEGACY_KEEP:
    lines.append(row(name, code, en, cat, cat_en, "FALSE", remark))
lines.append("  ];")
lines.append("}")
new_fn = "\n".join(lines)

gs_path = "gs/DBS_3_0_MULTI_DISTRICT.gs"
src = open(gs_path, encoding="utf-8").read()
start = src.index("function getDefaultBadgeCodesData_() {")
# 找 function 結尾（下一個 "\n}\n" 之後）
end_marker = "\n}\n"
end = src.index(end_marker, start) + len(end_marker)
src = src[:start] + new_fn + "\n" + src[end:]
open(gs_path, "w", encoding="utf-8").write(src)

print(f"新增獎章 {len(BADGES)} 個（興趣/技能/服務/教導/海上/航空/其他）")
print(f"淘汰 {len(RETIRED)} 個 + 原有 {len(LEGACY_KEEP)} 個舊章保留")
print(f"總計 {len(BADGES) + len(RETIRED) + len(LEGACY_KEEP)} 行")

# 檢查 code 在同一分類有無意外重複
from collections import Counter, defaultdict
by_cat = defaultdict(list)
for name, code, en, cat, cat_en in BADGES:
    by_cat[cat].append(code)
for cat, codes in by_cat.items():
    dups = [c for c, n in Counter(codes).items() if n > 1]
    if dups:
        print(f"⚠️ {cat} 組代碼重複: {dups}")
print("各組數量:", {k: len(v) for k, v in by_cat.items()})
