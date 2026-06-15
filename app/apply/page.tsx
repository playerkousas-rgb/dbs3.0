'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useDistrict } from '@/lib/useDistrict';

interface BadgeInfo {
  badgeName: string;
  badgeCode: string;
  badgeNameEn: string;
  category: string;
  categoryEn: string;
  fullTitle: string;    // ✅ 確認有這欄（你 API 已經回傳）
}

interface GroupInfo {
  groupId: string;
  groupNumber: number;
  groupName: string;
  leaderName: string;
  leaderTitle: string;
  leaderEmail: string;
  hasLeader: boolean;
}

interface ExaminerInfo {
  name: string;
  unit: string;
  qualifiedBadges: { badgeName: string; scope: string; category: string }[];
  districtBadges: string[];
  groupBadges: string[];
}

interface FormState {
  memberName: string;
  memberNameEn: string;
  groupId: string;
  phone: string;
  email: string;
  parentName: string;
  parentEmail: string;
  ymNumber: string;
  badgeName: string;
  badgeCategory: string;
  examArrangementType: string;
  selfExaminerName: string;
  courseName: string;
  certNumber: string;
  certIssuer: string;
  remarks: string;
}

export default function ApplyPage() {
  const { withDistrict } = useDistrict();

  const [badges, setBadges] = useState<BadgeInfo[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [examiners, setExaminers] = useState<ExaminerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);

  const [form, setForm] = useState<FormState>({
    memberName: '',
    memberNameEn: '',
    groupId: '',
    phone: '',
    email: '',
    parentName: '',
    parentEmail: '',
    ymNumber: '',
    badgeName: '',
    badgeCategory: '',
    examArrangementType: 'SELF_APPLY',
    selfExaminerName: '',
    courseName: '',
    certNumber: '',
    certIssuer: '',
    remarks: ''
  });
  const [rememberProfile, setRememberProfile] = useState(true);

  // === 瀏覽器自動記住成員資料 ===
  const PROFILE_STORAGE_KEY = 'dbs_apply_profile_v1';
  const PROFILE_OPT_OUT_KEY = 'dbs_apply_profile_optout';

  // 載入已儲存的個人資料
  useEffect(() => {
    try {
      const optOut = localStorage.getItem(PROFILE_OPT_OUT_KEY);
      if (optOut === '1') {
        setRememberProfile(false);
        return;
      }
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) {
        const profile = JSON.parse(saved);
        setForm(prev => ({ ...prev, ...profile }));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自動儲存個人資料
  useEffect(() => {
    if (!rememberProfile) {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      localStorage.setItem(PROFILE_OPT_OUT_KEY, '1');
      return;
    }
    localStorage.removeItem(PROFILE_OPT_OUT_KEY);
    try {
      const profile = {
        memberName: form.memberName,
        memberNameEn: form.memberNameEn,
        groupId: form.groupId,
        phone: form.phone,
        email: form.email,
        parentName: form.parentName,
        parentEmail: form.parentEmail,
        ymNumber: form.ymNumber,
      };
      // 只有當有填寫內容時才存
      if (Object.values(profile).some(v => v)) {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      }
    } catch {}
  }, [form.memberName, form.memberNameEn, form.groupId, form.phone, form.email, form.parentName, form.parentEmail, form.ymNumber, rememberProfile]);

  const clearSavedProfile = () => {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(PROFILE_OPT_OUT_KEY);
    setForm(prev => ({
      ...prev,
      memberName: '',
      memberNameEn: '',
      groupId: '',
      phone: '',
      email: '',
      parentName: '',
      parentEmail: '',
      ymNumber: '',
    }));
    setRememberProfile(true);
    alert('已清除此瀏覽器儲存的個人資料');
  };

  useEffect(() => {
    setDataLoading(true);
    Promise.all([
      api.getBadgeCodes().catch(() => ({ success: false })),
      api.getGroups().catch(() => ({ success: false })),
      api.getActiveExaminers().catch(() => ({ success: false }))
    ]).then(([badgeRes, groupRes, examinerRes]) => {
      if (badgeRes.success) setBadges(badgeRes.badges || []);
      if (groupRes.success) setGroups(groupRes.groups || []);
      if (examinerRes.success) setExaminers(examinerRes.examiners || []);
      setDataLoading(false);
    });
  }, []);

  const updateForm = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const selectedGroup = groups.find(g => g.groupId === form.groupId);
const selectedBadge = badges.find(b => b.fullTitle === form.badgeName);
  const badgeCategories = [...new Set(badges.map(b => b.category).filter(Boolean))];
  const filteredBadges = form.badgeCategory
    ? badges.filter(b => b.category === form.badgeCategory)
    : badges;

  const availableExaminers = form.badgeName
    ? examiners.filter(ex =>
       ex.qualifiedBadges.some(qb => qb.badgeName === form.badgeName)  // qb.badgeName 已是 full_title
      ).map(ex => {
        const qual = ex.qualifiedBadges.find(qb => qb.badgeName === form.badgeName);
        return {
          ...ex,
          scope: qual?.scope || '',
          scopeLabel: qual?.scope === 'D' ? '區主考（接受區內所有旅團）' : '旅團主考（只限本旅）'
        };
      })
    : [];

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showCertExchange && !certFile) {
      setError('證書換專章需要上傳證書副本');
      return;
    }
    if (certFile && certFile.size > 5 * 1024 * 1024) {
      setError('檔案大小不能超過 5MB');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let certFileData = '';
      let certFileName = '';
      if (certFile) {
        certFileData = await fileToBase64(certFile);
        certFileName = certFile.name;
      }
      const res = await api.submitApplication({
        memberName: form.memberName,
        memberNameEn: form.memberNameEn,
        groupId: form.groupId,
        phone: form.phone,
        email: form.email,
        parentName: form.parentName,
        parentEmail: form.parentEmail,
        ymNumber: form.ymNumber,
        badgeName: form.badgeName,
        badgeCategory: selectedBadge?.category || form.badgeCategory,
        examArrangementType: form.examArrangementType,
        selfExaminerName: form.selfExaminerName,
        courseName: form.courseName,
        certNumber: form.certNumber,
        certIssuer: form.certIssuer,
        certFileName: certFileName,
        certFileData: certFileData,
        remarks: form.remarks
      });
      if (res.success) {
        setSubmitted(true);
        setResult(res);
      } else {
        setError(res.error || '提交失敗');
      }
    } catch (err: any) {
      setError('網絡錯誤，請稍後重試');
    }
    setLoading(false);
  };

  if (submitted && result) {
    return (
      <div style={{ background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
        <h2 style={{ color: '#2e7d32' }}>✅ 申請已成功提交</h2>
        <p style={{ fontSize: '18px', margin: '16px 0' }}>
          申請編號：<strong style={{ color: '#003366' }}>{result.applicationId}</strong>
        </p>

        <div style={{ background: '#e8f5e9', padding: '16px', borderRadius: '8px', margin: '16px 0', textAlign: 'left' }}>
          <h4 style={{ margin: '0 0 8px', color: '#2e7d32' }}>📧 下一步：家長確認</h4>
          <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>
            系統已發送確認電郵至家長 <strong>{form.parentEmail}</strong>。<br/>
            家長點擊確認後，系統會自動通知團長進行第二步確認。
          </p>
        </div>

        <div style={{ background: '#e3f2fd', padding: '16px', borderRadius: '8px', margin: '16px 0', textAlign: 'left' }}>
          <h4 style={{ margin: '0 0 8px', color: '#003366' }}>📋 流程說明</h4>
          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#333' }}>
            <li><strong>待家長確認</strong> ← 目前狀態</li>
            <li>待團長確認</li>
            <li>待區會批核</li>
            <li>已派主考進行考核</li>
            <li>考核完成 → 製作證書 → 領取</li>
          </ol>
        </div>

        {selectedGroup && !selectedGroup.hasLeader && (
          <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '8px', marginTop: '16px', fontSize: '14px', textAlign: 'left' }}>
            <strong>⚠️ 提示：</strong>您的旅團目前沒有登記團長，團長確認通知將發送至旅團公用電郵，
            由{selectedGroup.groupName}負責領袖處理。
          </div>
        )}

        <p style={{ marginTop: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
          查詢驗證碼：<strong>{result.queryCode}</strong><br/>
          <a href={withDistrict(`/status?appId=${result.applicationId}`)} style={{ color: '#003366', wordBreak: 'break-all' }}>
            點擊查詢進度 →
          </a>
        </p>
      </div>
    );
  }

  const arrangementOptions = [
    { value: 'SELF_APPLY', label: '童軍成員自行報考' },
    { value: 'APPROVED_COURSE', label: '認可訓練班' },
    { value: 'EXAM_DAY', label: '專章考驗日' },
    { value: 'OTHER_ARRANGEMENT', label: '其他安排' },
    { value: 'CERTIFICATE_EXCHANGE', label: '證書換專章' }
  ];

  const showSelfExaminer = form.examArrangementType === 'SELF_APPLY';
  const showCourseName = ['APPROVED_COURSE', 'EXAM_DAY', 'OTHER_ARRANGEMENT'].includes(form.examArrangementType);
  const showCertExchange = form.examArrangementType === 'CERTIFICATE_EXCHANGE';

  if (dataLoading) {
    return (
      <div style={{ background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
        <p style={{ color: '#666', fontSize: '16px' }}>⏳ 載入系統資料中...</p>
        <p style={{ color: '#999', fontSize: '14px' }}>正在從伺服器讀取專章代碼、旅團及主考資料</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', padding: '32px', borderRadius: '12px' }}>
      <h2 style={{ color: '#003366', marginTop: 0 }}>📝 專科徽章報考申請</h2>
      
      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ===== 成員資料 ===== */}
        <Section title="成員資料">
          <Row>
            <Input label="中文姓名" value={form.memberName} onChange={(v: string) => updateForm('memberName', v)} required autoComplete="name" name="memberName" id="memberName" />
            <Input label="英文姓名" value={form.memberNameEn} onChange={(v: string) => updateForm('memberNameEn', v)} autoComplete="name" name="memberNameEn" id="memberNameEn" />
          </Row>
          <Row>
            <div>
              <label style={labelStyle}>所屬旅團 <span style={{ color: '#c62828' }}>*</span></label>
              <select
                value={form.groupId}
                required
                onChange={e => updateForm('groupId', e.target.value)}
                style={selectStyle}
              >
                <option value="">請選擇...</option>
                {groups.map(g => (
                  <option key={g.groupId} value={g.groupId}>
                    {g.groupName} ({g.groupNumber}th){!g.hasLeader ? ' ⚠️' : ''}
                  </option>
                ))}
              </select>
              {selectedGroup && !selectedGroup.hasLeader && (
                <p style={{ fontSize: '12px', color: '#ff9800', marginTop: '4px' }}>
                  ⚠️ 此旅團目前沒有登記團長，確認通知將發送至旅團公用電郵。
                </p>
              )}
              {selectedGroup && selectedGroup.hasLeader && (
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>團長：{selectedGroup.leaderTitle}</p>
              )}
            </div>
            <Input label="YMIS 童軍成員編號" value={form.ymNumber} onChange={(v: string) => updateForm('ymNumber', v)} required autoComplete="off" name="ymNumber" id="ymNumber" />
          </Row>
          <Row>
            <Input label="聯絡電話" value={form.phone} onChange={(v: string) => updateForm('phone', v)} required type="tel" autoComplete="tel" name="phone" id="phone" />
            <Input label="成員電郵" value={form.email} onChange={(v: string) => updateForm('email', v)} type="email" required autoComplete="email" name="email" id="email" />
          </Row>
          <div style={{ background: '#f9fbe7', padding: '12px', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={rememberProfile}
                onChange={e => setRememberProfile(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              💾 記住我的個人資料（下次自動填寫）
            </label>
            <button
              type="button"
              onClick={clearSavedProfile}
              style={{ fontSize: '12px', padding: '6px 12px', background: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', color: '#666' }}
            >
              清除已儲存資料
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
            資料只會儲存在此瀏覽器本機，不會上傳伺服器。公用電腦請勿勾選。
          </p>
        </Section>

        {/* ===== 家長資料 ===== */}
        <Section title="家長 / 監護人資料">
          <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            <strong>📌 重要：</strong>根據 PT03 規定，報考專章需要家長/監護人同意。
            提交後系統將自動發送確認電郵給家長，家長確認後才會通知團長。
          </div>
          <Row>
            <Input label="家長姓名" value={form.parentName} onChange={(v: string) => updateForm('parentName', v)} required placeholder="例如：陳大文" autoComplete="name" name="parentName" id="parentName" />
            <Input label="家長電郵" value={form.parentEmail} onChange={(v: string) => updateForm('parentEmail', v)} type="email" required placeholder="家長用來確認的電郵地址" autoComplete="email" name="parentEmail" id="parentEmail" />
          </Row>
        </Section>

        {/* ===== 專章資料 ===== */}
        <Section title="專科徽章資料">
          <Row>
            <div>
              <label style={labelStyle}>專章類別（篩選用）</label>
              <select
                value={form.badgeCategory}
                onChange={e => { updateForm('badgeCategory', e.target.value); updateForm('badgeName', ''); }}
                style={selectStyle}
              >
                <option value="">全部類別</option>
                {badgeCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>專章名稱 <span style={{ color: '#c62828' }}>*</span></label>
             <select
  value={form.badgeName}
  required
  onChange={e => {
    const sel = badges.find(b => b.fullTitle === e.target.value);  // 👈 改 fullTitle
    updateForm('badgeName', e.target.value);
    if (sel && !form.badgeCategory) updateForm('badgeCategory', sel.category);
    updateForm('selfExaminerName', '');
  }}
  style={selectStyle}
>
  <option value="">請選擇專章...</option>
  {filteredBadges.map(b => (
    <option key={b.fullTitle} value={b.fullTitle}>  {/* 👈 key/value 都改 fullTitle */}
      {b.fullTitle || b.badgeName} ({b.badgeCode})
    </option>
  ))}
</select>
              {selectedBadge && (
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {selectedBadge.badgeNameEn} · 代碼：{selectedBadge.badgeCode}
                </p>
              )}
            </div>
          </Row>
        </Section>

        {/* ===== 考驗安排 ===== */}
        <Section title="考驗安排（依據 P120A1-09）">
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>考驗安排 *</label>
            {arrangementOptions.map(mode => (
              <label key={mode.value} style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
                <input
                  type="radio" name="arrangement" value={mode.value}
                  checked={form.examArrangementType === mode.value}
                  onChange={() => { setForm(prev => ({ ...prev, examArrangementType: mode.value, selfExaminerName: '', courseName: '', certNumber: '', certIssuer: '' })); setCertFile(null); }}
                  style={{ marginRight: '8px' }}
                />
                {mode.label}
              </label>
            ))}
          </div>

          {showSelfExaminer && (
            <div style={{ marginBottom: '16px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                選擇主考 {form.badgeName ? `（可考「${form.badgeName}」的主考）` : ''}
              </label>
              
              {form.badgeName && availableExaminers.length > 0 ? (
                <div>
                  <select
                    value={form.selfExaminerName}
                    onChange={e => updateForm('selfExaminerName', e.target.value)}
                    style={{ ...selectStyle, marginBottom: '8px' }}
                  >
                    <option value="">請選擇主考...</option>
                    {availableExaminers.map((ex, idx) => {
                      const isGroupOnly = ex.scope === 'G';
                      const selectedGroupNum = groups.find(g => g.groupId === form.groupId)?.groupNumber?.toString() || '___';
                      const sameGroup = isGroupOnly && ex.unit && new RegExp('第' + selectedGroupNum + '旅').test(ex.unit);
                      const disabled = isGroupOnly && !sameGroup;
                      return (
                        <option key={idx} value={ex.name} disabled={disabled}>
                          {ex.name} [{ex.unit || '區'}] — {ex.scopeLabel}
                          {disabled ? ' (非本旅，不可選)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
                    <strong>可選主考：</strong>
                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                      {availableExaminers.map((ex, idx) => (
                        <li key={idx} style={{ marginBottom: '2px' }}>
                          <span style={{
                            display: 'inline-block', padding: '1px 6px', borderRadius: '3px',
                            fontSize: '11px', fontWeight: 600,
                            background: ex.scope === 'D' ? '#e3f2fd' : '#fff3e0',
                            color: ex.scope === 'D' ? '#1565c0' : '#e65100',
                            marginRight: '6px'
                          }}>
                            {ex.scope === 'D' ? '區主考' : '旅團主考'}
                          </span>
                          {ex.name} ({ex.unit || '—'})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : form.badgeName ? (
                <div style={{ padding: '12px', background: '#fff3e0', borderRadius: '6px', fontSize: '14px' }}>
                  <strong>⚠️</strong> 目前沒有已登記的主考可考核「{form.badgeName}」。
                  您可以改選其他考驗安排。
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: '#999' }}>請先選擇專章，系統將自動顯示可選主考。</p>
              )}
            </div>
          )}

          {showCourseName && (
            <div style={{ marginBottom: '16px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
              <Input
                label={form.examArrangementType === 'APPROVED_COURSE' ? '訓練班名稱 / 主辦單位' : form.examArrangementType === 'EXAM_DAY' ? '考驗日名稱 / 主辦單位' : '詳細資料'}
                value={form.courseName}
                onChange={(v: string) => updateForm('courseName', v)}
                placeholder="請填寫名稱及主辦單位"
                autoComplete="off"
              />
            </div>
          )}

          {showCertExchange && (
            <div style={{ marginBottom: '16px', padding: '16px', background: '#e8f5e9', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 12px', color: '#2e7d32' }}>📄 證書換專章資料</h4>
              <Row>
                <Input
                  label="證書編號"
                  value={form.certNumber}
                  onChange={(v: string) => updateForm('certNumber', v)}
                  required
                  placeholder="例如：FA-2024-001"
                  autoComplete="off"
                />
                <Input
                  label="發證機構"
                  value={form.certIssuer}
                  onChange={(v: string) => updateForm('certIssuer', v)}
                  required
                  placeholder="例如：香港聖約翰救護機構"
                  autoComplete="off"
                />
              </Row>
              <div style={{ marginTop: '8px' }}>
                <label style={labelStyle}>
                  上傳證書副本 <span style={{ color: '#c62828' }}>*</span>
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  required={showCertExchange}
                  onChange={e => setCertFile(e.target.files?.[0] || null)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  請上傳證書照片或掃描檔（JPG / PNG / PDF），檔案大小上限 5MB
                </p>
                {certFile && (
                  <p style={{ fontSize: '12px', color: '#2e7d32', marginTop: '4px' }}>
                    ✅ 已選擇：{certFile.name} ({(certFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
          )}
        </Section>

        {/* ===== 備註 ===== */}
        <Section title="備註">
          <textarea
            value={form.remarks}
            onChange={e => updateForm('remarks', e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', minHeight: '80px', boxSizing: 'border-box' }}
            placeholder="如有特殊情況請在此說明"
          />
        </Section>

        {/* ===== 流程提醒 ===== */}
        <div style={{ background: '#e8f5e9', padding: '16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          <strong>📋 提交後流程：</strong><br/>
          提交 → <strong>家長電郵確認</strong> → 團長電郵確認 → 區會審批 → 派發主考 → 考核 → 證書
        </div>

        <div style={{ background: '#fff3e0', padding: '16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          <strong>⚠️ 重要提醒：</strong><br/>
          1. 每人同一時間最多報考兩項專科徽章。<br/>
          2. 考核須於獲批核後三個月內完成。<br/>
          3. 提交後系統將自動發送確認電郵給家長，家長確認後才通知團長。
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '14px', background: loading ? '#ccc' : '#003366',
            color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px',
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '提交中...' : '提交申請'}
        </button>
      </form>
    </div>
  );
}

// ===== Shared styles & components =====
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600 };
const selectStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', boxSizing: 'border-box' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #eee' }}>
      <h3 style={{ color: '#003366', fontSize: '16px', marginBottom: '16px' }}>{title}</h3>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, required, type = 'text', placeholder, autoComplete, name, id }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string; autoComplete?: string; name?: string; id?: string }) {
  return (
    <div>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: '#c62828' }}>*</span>}
      </label>
      <input
        type={type} value={value} required={required} placeholder={placeholder}
        autoComplete={autoComplete} name={name} id={id}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
      />
    </div>
  );
}
