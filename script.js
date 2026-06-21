// ==================== إعدادات Firebase ====================
const firebaseConfig = {
    apiKey: "AIzaSyC_fQcf9PCrma1kGGq4BWh1JPfnP3zNrA0",
    authDomain: "khitmah-da90b.firebaseapp.com",
    projectId: "khitmah-da90b",
    storageBucket: "khitmah-da90b.firebasestorage.app",
    messagingSenderId: "515268042502",
    appId: "1:515268042502:web:5e663036c34e9a5dbc4887"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const messaging = firebase.messaging();

// ==================== المتغيرات العامة ====================
let currentUser = null;
let currentCircleId = null;
let currentMemberData = null;
let currentMemberId = null;
let isAdmin = false;
let pendingUserData = null;
let pendingCircleId = null;
let currentUserGender = null;
let idleTimer = null;
let juzChart = null;
let lastActivityTime = Date.now();
let deferredPrompt = null;
let todayReadJuz = null;

// ==================== متغيرات الصوت ====================
let audioPlayer = null;

// ==================== إعدادات GitHub ====================
const GITHUB_USERNAME = 'Usamekesmo';
const GITHUB_REPO = 'khitmahaudio';

// ==================== الثوابت ====================
const ADMIN_EMAIL = "admin@khitmah.com";
const ADMIN_PASSWORD = "Admin@123456";
let MAX_CIRCLE_MEMBERS = 30;
let MAX_EXTRA_JUZ_PER_DAY = 1;
let MAX_ABSENCE_DAYS = 3;
let TOTAL_JUZ = 30;
const IDLE_TIMEOUT = 30 * 60 * 1000;
const CACHE_TTL = 5 * 60 * 1000;
const QURAN_API_BASE = 'https://api.alquran.cloud/v1';

let currentQuranPages = [];
let currentPageIndex = 0;
let shareMessageText = '';

// ==================== دوال مساعدة للتواريخ ====================
function safeToDate(value) {
    if (!value) return null;
    if (value.toDate) return value.toDate();
    if (value instanceof Date) return value;
    return new Date(value);
}

function safeDateString(value) {
    const date = safeToDate(value);
    return date ? date.toDateString() : null;
}

function isToday(value) {
    const date = safeToDate(value);
    if (!date) return false;
    return date.toDateString() === getTodayString();
}

function formatDate(date) {
    if (!date) return '-';
    const d = safeToDate(date);
    if (!d) return '-';
    return d.toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getTodayString() {
    const now = new Date();
    return now.toDateString();
}

function isSameDay(date1, date2) {
    if (!date1 || !date2) return false;
    const d1 = safeToDate(date1);
    const d2 = safeToDate(date2);
    if (!d1 || !d2) return false;
    return d1.toDateString() === d2.toDateString();
}

// ==================== دوال مساعدة عامة ====================
function showMessage(el, msg, isError = true) {
    const d = document.getElementById(el);
    if (d) { d.textContent = msg; d.className = `message ${isError ? 'error' : 'success'}`; setTimeout(() => { d.textContent = ''; d.className = 'message'; }, 4000); }
}

function showToast(msg, isError = false, duration = 3000) {
    let t = document.querySelector('.notification-toast');
    if (t) t.remove();
    t = document.createElement('div');
    t.className = 'notification-toast';
    t.style.backgroundColor = isError ? '#ef4444' : '#1a4739';
    t.innerHTML = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), duration);
}

function showScreen(id) { 
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); 
    document.getElementById(id)?.classList.add('active'); 
}

function escapeHtml(s) { 
    if (!s) return ''; 
    return s.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : m === '>' ? '&gt;' : ''); 
}

function calcKhatmasFromParts(totalParts) {
    return Math.floor(totalParts / 30);
}

// ==================== دوال الاستماع ====================

function openAudioPlayer(juzNumber) {
    if (!juzNumber || juzNumber < 1 || juzNumber > 30) {
        showToast("رقم جزء غير صالح", true);
        return;
    }
    
    const modal = document.getElementById('audioPlayerModal');
    const audio = document.getElementById('quranAudio');
    const source = document.getElementById('audioSource');
    const status = document.getElementById('audioStatus');
    
    if (!audio || !source) {
        showToast("عناصر الصوت غير موجودة", true);
        return;
    }
    
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer = null;
    }
    
    audio.pause();
    audio.src = '';
    audio.removeAttribute('src');
    audio.load();
    
    document.getElementById('audioJuzNumber').textContent = juzNumber;
    status.textContent = '⏳ جاري تحميل الجزء...';
    status.style.color = '#666';
    
    const audioUrl = `https://${GITHUB_USERNAME}.github.io/${GITHUB_REPO}/audio/${juzNumber}.mp3`;
    console.log('🔊 تحميل من:', audioUrl);
    
    source.src = audioUrl;
    audio.load();
    
    audio.oncanplay = function() {
        status.textContent = '✅ الجزء جاهز للتشغيل';
        status.style.color = '#16a34a';
        audioPlayer = audio;
    };
    
    audio.onerror = function(e) {
        console.warn('⚠️ فشل التحميل:', e);
        status.textContent = '⚠️ فشل تحميل الصوت، حاول مرة أخرى';
        status.style.color = '#dc2626';
        showToast('فشل تحميل الصوت، تأكد من اتصال الإنترنت', true);
    };
    
    audio.onended = function() {
        status.textContent = '✅ انتهى تشغيل الجزء';
        status.style.color = '#16a34a';
    };
    
    modal.style.display = 'flex';
}

function stopAudioPlayback() {
    const audio = document.getElementById('quranAudio');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
    const status = document.getElementById('audioStatus');
    if (status) {
        status.textContent = '⏹️ تم الإيقاف';
        status.style.color = '#666';
    }
}

// ==================== دوال تصدير البيانات ====================

function exportUsersFullCSV() {
    showToast("⏳ جاري إنشاء التقرير...", false, 2000);
    db.collection('circleMembers').get().then(snap => {
        const data = [];
        const today = getTodayString();
        snap.forEach(d => {
            const m = d.data();
            if (m.isActive !== false) {
                const lastRead = safeDateString(m.lastReadDate);
                const hasReadToday = lastRead === today;
                const readTodayJuz = hasReadToday ? (m.readJuzList && m.readJuzList.length > 0 ? m.readJuzList[m.readJuzList.length - 1] : (m.currentJuz || m.selectedJuz || '')) : '-';
                
                const takenJuz = m.takenJuzList || [];
                const readJuz = m.readJuzList || [];
                const extraReadJuz = m.extraReadJuzList || [];
                const allReadJuz = [...new Set([...readJuz, ...extraReadJuz])].sort((a, b) => a - b);
                
                const row = {
                    'الاسم': m.userName || '',
                    'البريد الإلكتروني': m.userEmail || '',
                    'تاريخ الانضمام': formatDate(m.joinedAt),
                    'الحلقة': m.circleId || '',
                    'جزء يوم غد': m.currentJuz || m.selectedJuz || '',
                    'الجزء المقروء اليوم': readTodayJuz,
                    'حالة القراءة': hasReadToday ? '✅ قرأ اليوم' : '❌ لم يقرأ اليوم',
                    'إجمالي الأجزاء': (m.totalPartsRead || 0) + (m.totalExtraJuz || 0),
                    'عدد الختمات': calcKhatmasFromParts(m.totalPartsRead || 0),
                    'الأجزاء المأخوذة': (m.takenJuzList || []).join('، ') || 'لا يوجد',
                    'الأجزاء المقروءة': allReadJuz.length > 0 ? allReadJuz.join('، ') : 'لا يوجد',
                    'أيام الغياب': m.absenceCount || 0,
                    'الحالة': m.isActive ? 'نشط' : 'غير نشط'
                };
                data.push(row);
            }
        });
        
        if (data.length === 0) {
            showToast("لا توجد بيانات للتصدير", true);
            return;
        }
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'المستخدمين');
        XLSX.writeFile(wb, `تقرير_المستخدمين_${new Date().toLocaleDateString('ar')}.xlsx`);
        showToast(`✅ تم تصدير ${data.length} مستخدم بنجاح`, false);
    }).catch(e => {
        console.error(e);
        showToast("حدث خطأ أثناء التصدير", true);
    });
}

function exportUsersFullExcel() {
    exportUsersFullCSV();
}

function exportUsersSimpleCSV() {
    showToast("⏳ جاري إنشاء التقرير...", false, 2000);
    db.collection('circleMembers').get().then(snap => {
        const data = [];
        const today = getTodayString();
        snap.forEach(d => {
            const m = d.data();
            if (m.isActive !== false) {
                const lastRead = safeDateString(m.lastReadDate);
                const hasReadToday = lastRead === today;
                const readTodayJuz = hasReadToday ? (m.readJuzList && m.readJuzList.length > 0 ? m.readJuzList[m.readJuzList.length - 1] : (m.currentJuz || m.selectedJuz || '')) : '-';
                
                data.push({
                    'الاسم': m.userName || '',
                    'جزء الغد': m.currentJuz || m.selectedJuz || '',
                    'الجزء المقروء اليوم': readTodayJuz,
                    'حالة القراءة': hasReadToday ? '✅ قرأ' : '❌ لم يقرأ'
                });
            }
        });
        
        if (data.length === 0) {
            showToast("لا توجد بيانات للتصدير", true);
            return;
        }
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'المستخدمين_ملخص');
        XLSX.writeFile(wb, `ملخص_المستخدمين_${new Date().toLocaleDateString('ar')}.xlsx`);
        showToast(`✅ تم تصدير ${data.length} مستخدم بنجاح`, false);
    }).catch(e => {
        console.error(e);
        showToast("حدث خطأ أثناء التصدير", true);
    });
}

function exportUsersFullPDF() {
    showToast("⏳ جاري إنشاء PDF...", false, 2000);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(18);
    doc.text('تقرير المستخدمين - ختمتي', 14, 20);
    doc.setFontSize(10);
    doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar')}`, 14, 28);
    
    db.collection('circleMembers').get().then(snap => {
        const members = [];
        const today = getTodayString();
        snap.forEach(d => {
            const m = d.data();
            if (m.isActive !== false) {
                members.push(m);
            }
        });
        
        if (members.length === 0) {
            showToast("لا توجد بيانات للتصدير", true);
            return;
        }
        
        members.sort((a, b) => (a.userName || '').localeCompare(b.userName || ''));
        
        const headers = [
            ['#', 'الاسم', 'البريد', 'تاريخ الانضمام', 'جزء يوم غد', 
             'الجزء المقروء اليوم', 'حالة القراءة', 'إجمالي الأجزاء', 'الختمات', 
             'الأجزاء المقروءة', 'أيام الغياب', 'الحالة']
        ];
        
        const rows = members.map((m, idx) => {
            const lastRead = safeDateString(m.lastReadDate);
            const hasReadToday = lastRead === today;
            const readTodayJuz = hasReadToday ? (m.readJuzList && m.readJuzList.length > 0 ? m.readJuzList[m.readJuzList.length - 1] : (m.currentJuz || m.selectedJuz || '')) : '-';
            const readJuz = m.readJuzList || [];
            const extraReadJuz = m.extraReadJuzList || [];
            const allReadJuz = [...new Set([...readJuz, ...extraReadJuz])].sort((a, b) => a - b);
            return [
                idx + 1,
                m.userName || '',
                m.userEmail || '',
                formatDate(m.joinedAt),
                m.currentJuz || m.selectedJuz || '',
                readTodayJuz,
                hasReadToday ? '✅ قرأ اليوم' : '❌ لم يقرأ اليوم',
                (m.totalPartsRead || 0) + (m.totalExtraJuz || 0),
                calcKhatmasFromParts(m.totalPartsRead || 0),
                allReadJuz.join('، ') || '-',
                m.absenceCount || 0,
                m.isActive ? 'نشط' : 'غير نشط'
            ];
        });
        
        doc.autoTable({
            head: headers,
            body: rows,
            startY: 35,
            styles: { font: 'helvetica', fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [26, 71, 57], textColor: [255, 255, 255], fontSize: 8 },
            alternateRowStyles: { fillColor: [240, 245, 248] },
            columnStyles: {
                0: { cellWidth: 8 },
                1: { cellWidth: 22 },
                2: { cellWidth: 28 },
                3: { cellWidth: 20 },
                4: { cellWidth: 18 },
                5: { cellWidth: 18 },
                6: { cellWidth: 20 },
                7: { cellWidth: 18 },
                8: { cellWidth: 15 },
                9: { cellWidth: 30 },
                10: { cellWidth: 15 },
                11: { cellWidth: 15 }
            }
        });
        
        doc.save(`تقرير_المستخدمين_${new Date().toLocaleDateString('ar')}.pdf`);
        showToast(`✅ تم تصدير ${members.length} مستخدم بنجاح`, false);
    }).catch(e => {
        console.error(e);
        showToast("حدث خطأ أثناء التصدير", true);
    });
}

function exportUsersAsImage() {
    showToast("⏳ جاري إنشاء الصورة...", false, 2000);
    const container = document.createElement('div');
    container.style.cssText = 'padding:30px; background:white; direction:rtl; font-family:Arial; max-width:1200px;';
    container.innerHTML = `
        <h2 style="color:#1a4739; text-align:center;">📖 تقرير المستخدمين - ختمتي</h2>
        <p style="text-align:center; color:#666;">${new Date().toLocaleDateString('ar')}</p>
        <div id="imageTableContainer" style="margin-top:20px; overflow-x:auto;"></div>
    `;
    
    db.collection('circleMembers').get().then(snap => {
        const members = [];
        const today = getTodayString();
        snap.forEach(d => {
            const m = d.data();
            if (m.isActive !== false) {
                members.push(m);
            }
        });
        
        if (members.length === 0) {
            showToast("لا توجد بيانات للتصدير", true);
            document.body.removeChild(container);
            return;
        }
        
        members.sort((a, b) => (a.userName || '').localeCompare(b.userName || ''));
        
        let tableHtml = `<table style="width:100%; border-collapse:collapse; font-size:10px;">
            <thead>
                <tr style="background:#1a4739; color:white;">
                    <th style="padding:6px; border:1px solid #ddd;">#</th>
                    <th style="padding:6px; border:1px solid #ddd;">الاسم</th>
                    <th style="padding:6px; border:1px solid #ddd;">جزء يوم غد</th>
                    <th style="padding:6px; border:1px solid #ddd;">الجزء المقروء اليوم</th>
                    <th style="padding:6px; border:1px solid #ddd;">حالة القراءة</th>
                    <th style="padding:6px; border:1px solid #ddd;">إجمالي الأجزاء</th>
                    <th style="padding:6px; border:1px solid #ddd;">الختمات</th>
                    <th style="padding:6px; border:1px solid #ddd;">أيام الغياب</th>
                </tr>
            </thead>
            <tbody>`;
        
        members.forEach((m, idx) => {
            const bgColor = idx % 2 === 0 ? '#f8fafc' : 'white';
            const lastRead = safeDateString(m.lastReadDate);
            const hasReadToday = lastRead === today;
            const readTodayJuz = hasReadToday ? (m.readJuzList && m.readJuzList.length > 0 ? m.readJuzList[m.readJuzList.length - 1] : (m.currentJuz || m.selectedJuz || '')) : '-';
            tableHtml += `<tr style="background:${bgColor};">
                <td style="padding:6px; border:1px solid #ddd; text-align:center;">${idx + 1}</td>
                <td style="padding:6px; border:1px solid #ddd;">${escapeHtml(m.userName || '')}</td>
                <td style="padding:6px; border:1px solid #ddd; text-align:center;">${m.currentJuz || m.selectedJuz || '-'}</td>
                <td style="padding:6px; border:1px solid #ddd; text-align:center;">${readTodayJuz}</td>
                <td style="padding:6px; border:1px solid #ddd; text-align:center; ${hasReadToday ? 'color:#16a34a;' : 'color:#dc2626;'}">${hasReadToday ? '✅ قرأ' : '❌ لم يقرأ'}</td>
                <td style="padding:6px; border:1px solid #ddd; text-align:center;">${(m.totalPartsRead || 0) + (m.totalExtraJuz || 0)}</td>
                <td style="padding:6px; border:1px solid #ddd; text-align:center;">${calcKhatmasFromParts(m.totalPartsRead || 0)}</td>
                <td style="padding:6px; border:1px solid #ddd; text-align:center;">${m.absenceCount || 0}</td>
            </tr>`;
        });
        
        tableHtml += '</tbody></table>';
        container.querySelector('#imageTableContainer').innerHTML = tableHtml;
        
        document.body.appendChild(container);
        
        html2canvas(container, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `تقرير_المستخدمين_${new Date().toLocaleDateString('ar')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            document.body.removeChild(container);
            showToast("✅ تم تصدير الصورة بنجاح", false);
        }).catch(err => {
            console.error(err);
            document.body.removeChild(container);
            showToast("حدث خطأ أثناء تصدير الصورة", true);
        });
    }).catch(e => {
        console.error(e);
        showToast("حدث خطأ أثناء التصدير", true);
    });
}

// ==================== دوال تصدير القوائم للمدير ====================
async function getActiveUsers() {
    const members = [];
    const snap = await db.collection('circleMembers').where('isActive', '==', true).get();
    snap.forEach(d => members.push({ id: d.id, ...d.data() }));
    return members;
}

function buildUserListMessage(users, isActive) {
    const today = getTodayString();
    let message = isActive ? '📊 قائمة الأعضاء النشطاء (قرأوا اليوم):\n\n' : '📊 قائمة الأعضاء الغائبين (لم يقرأوا اليوم):\n\n';
    users.forEach((u, i) => {
        const totalParts = (u.totalPartsRead || 0) + (u.totalExtraJuz || 0);
        const lastRead = safeDateString(u.lastReadDate);
        const status = lastRead === today ? '✅' : '❌';
        const readJuz = u.readJuzList || [];
        const extraReadJuz = u.extraReadJuzList || [];
        const allReadJuz = [...new Set([...readJuz, ...extraReadJuz])].sort((a, b) => a - b);
        const readToday = lastRead === today ? (readJuz.length > 0 ? readJuz[readJuz.length - 1] : (u.currentJuz || u.selectedJuz || '-')) : '-';
        
        message += `${i+1}. ${u.userName} | جزء الغد: ${u.currentJuz || u.selectedJuz} | الجزء المقروء اليوم: ${readToday} | الأجزاء المقروءة: ${allReadJuz.length > 0 ? allReadJuz.join(', ') : 'لا يوجد'} | ${status}\n`;
    });
    message += `\n📅 التاريخ: ${new Date().toLocaleDateString('ar')}`;
    return message;
}

async function exportActiveUsersToWhatsApp() {
    const allUsers = await getActiveUsers();
    const today = getTodayString();
    const activeUsers = allUsers.filter(u => {
        const lastRead = safeDateString(u.lastReadDate);
        return lastRead === today;
    });
    if (activeUsers.length === 0) {
        showToast("لا يوجد أعضاء نشطاء اليوم", true);
        return;
    }
    const message = buildUserListMessage(activeUsers, true);
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

async function exportInactiveUsersToWhatsApp() {
    const allUsers = await getActiveUsers();
    const today = getTodayString();
    const inactiveUsers = allUsers.filter(u => {
        const lastRead = safeDateString(u.lastReadDate);
        return lastRead !== today;
    });
    if (inactiveUsers.length === 0) {
        showToast("لا يوجد أعضاء غائبون اليوم", true);
        return;
    }
    const message = buildUserListMessage(inactiveUsers, false);
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

// ==================== دوال المخزون العام ====================
async function initializeGlobalExtraJuz() {
    const poolRef = db.collection('globalExtraJuz').doc('globalPool');
    const doc = await poolRef.get();
    if (!doc.exists) {
        await poolRef.set({
            availableJuz: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],
            takenJuz: {},
            lastRefillDate: new Date(),
            refillCount: 0
        });
    }
}

async function showExtraJuzModal() {
    if (!currentMemberData) {
        showToast("يرجى تسجيل الدخول أولاً", true);
        return;
    }
    
    const todayAdded = (currentMemberData.extraReadingsPlan || []).filter(p => {
        const addedDate = p.addedAt ? safeDateString(p.addedAt) : null;
        return addedDate === getTodayString();
    });
    
    if (todayAdded.length >= MAX_EXTRA_JUZ_PER_DAY) {
        showToast(`⚠️ مسموح فقط بـ ${MAX_EXTRA_JUZ_PER_DAY} جزء إضافي يومياً.`, true);
        return;
    }
    
    const poolRef = db.collection('globalExtraJuz').doc('globalPool');
    const poolDoc = await poolRef.get();
    if (!poolDoc.exists) {
        showToast("المخزون العام غير متاح حالياً", true);
        return;
    }
    
    const availableJuz = poolDoc.data().availableJuz || [];
    if (availableJuz.length === 0) {
        showToast("❗ لا توجد أجزاء متاحة في المخزون العام حالياً. تواصل مع المدير لتجديد المخزون.", true);
        return;
    }
    
    const modal = document.getElementById('extraJuzModal');
    const grid = document.getElementById('extraJuzGrid');
    const msgSpan = document.getElementById('availableExtraCountMsg');
    msgSpan.innerHTML = `📦 الأجزاء المتاحة حالياً: ${availableJuz.length} جزء | الحد اليومي: ${MAX_EXTRA_JUZ_PER_DAY} جزء`;
    
    grid.innerHTML = '';
    for (let i = 1; i <= 30; i++) {
        const isAvailable = availableJuz.includes(i);
        const btn = document.createElement('button');
        btn.className = `juz-btn ${!isAvailable ? 'disabled' : ''}`;
        btn.textContent = i;
        btn.disabled = !isAvailable;
        if (isAvailable) {
            btn.onclick = () => reserveExtraJuzFromPool(i);
        }
        grid.appendChild(btn);
    }
    
    modal.style.display = 'flex';
}

async function reserveExtraJuzFromPool(juz) {
    const modal = document.getElementById('extraJuzModal');
    const poolRef = db.collection('globalExtraJuz').doc('globalPool');
    
    try {
        await db.runTransaction(async t => {
            const poolDoc = await t.get(poolRef);
            if (!poolDoc.exists) throw new Error('المخزون غير موجود');
            const data = poolDoc.data();
            const available = data.availableJuz || [];
            const taken = data.takenJuz || {};
            
            if (!available.includes(juz)) {
                throw new Error('الجزء غير متاح حالياً');
            }
            if (taken[juz]) {
                throw new Error('الجزء محجوز مسبقاً');
            }
            
            const newAvailable = available.filter(j => j !== juz);
            const newTaken = { ...taken, [juz]: currentUser.uid };
            t.update(poolRef, { availableJuz: newAvailable, takenJuz: newTaken });
        });
        
        const memberRef = db.collection('circleMembers').doc(currentMemberId);
        const currentPlan = currentMemberData.extraReadingsPlan || [];
        const newPlan = [...currentPlan, {
            juz: juz,
            status: 'pending',
            addedAt: new Date()
        }];
        await memberRef.update({
            extraReadingsPlan: newPlan
        });
        
        currentMemberData.extraReadingsPlan = newPlan;
        
        modal.style.display = 'none';
        showToast(`✅ تم إضافة الجزء ${juz} من المخزون العام إلى خطتك`, false);
        await loadExtraProgress();
        
    } catch (error) {
        console.error(error);
        showToast(error.message || 'حدث خطأ أثناء حجز الجزء', true);
    }
}

async function completeExtraJuz(juz) {
    const plan = currentMemberData.extraReadingsPlan || [];
    const item = plan.find(p => p.juz === juz && p.status === 'pending');
    if (!item) {
        showToast("⚠️ هذا الجزء غير موجود أو تم إكماله مسبقاً", true);
        return;
    }
    
    const memberRef = db.collection('circleMembers').doc(currentMemberId);
    const updatedPlan = plan.map(p => {
        if (p.juz === juz && p.status === 'pending') {
            return { ...p, status: 'completed', completedAt: new Date() };
        }
        return p;
    });
    const newTotalExtra = (currentMemberData.totalExtraJuz || 0) + 1;
    const extraReadJuzList = currentMemberData.extraReadJuzList || [];
    if (!extraReadJuzList.includes(juz)) {
        extraReadJuzList.push(juz);
    }
    
    await memberRef.update({
        extraReadingsPlan: updatedPlan,
        totalExtraJuz: newTotalExtra,
        extraReadJuzList: extraReadJuzList
    });
    
    currentMemberData.extraReadingsPlan = updatedPlan;
    currentMemberData.totalExtraJuz = newTotalExtra;
    currentMemberData.extraReadJuzList = extraReadJuzList;
    
    showToast(`✅ الجزء ${juz} من المخزون`, false);
    await loadExtraProgress();
    await updateUI();
}

async function loadExtraProgress() {
    const cont = document.getElementById('extraProgressList');
    if (!cont) return;
    if (!currentMemberData) { 
        cont.innerHTML = '<div class="empty-plan">لا توجد بيانات</div>'; 
        return; 
    }
    
    const plan = currentMemberData.extraReadingsPlan || [];
    const today = getTodayString();
    
    if (plan.length === 0) {
        cont.innerHTML = '<div class="empty-plan">📝 لا توجد أجزاء إضافية في خطتك اليوم. اضغط على "أضف جزءاً من المخزون"</div>';
        return;
    }
    
    const todayPlan = plan.filter(p => {
        const addedDate = p.addedAt ? safeDateString(p.addedAt) : null;
        return addedDate === today;
    });
    
    if (todayPlan.length === 0) {
        cont.innerHTML = '<div class="empty-plan">📝 لا توجد أجزاء إضافية اليوم</div>';
        return;
    }
    
    todayPlan.sort((a, b) => a.juz - b.juz);
    cont.innerHTML = '';
    for (let item of todayPlan) {
        const isComp = item.status === 'completed';
        const div = document.createElement('div');
        div.className = `progress-item ${isComp ? 'completed' : 'pending'}`;
        div.innerHTML = `<div><span>📖 الجزء ${item.juz} (من المخزون العام)</span><span>${isComp ? '✅ تم' : '⏳ في الانتظار'}</span></div><div>${!isComp ? `<button class="complete-extra-btn" onclick="completeExtraJuz(${item.juz})">📌 أنهيت</button>` : `<span class="points-earned">✅ مكتمل</span>`}</div>`;
        cont.appendChild(div);
    }
}

async function refreshExtraPoolStats() {
    const poolRef = db.collection('globalExtraJuz').doc('globalPool');
    const doc = await poolRef.get();
    if (doc.exists) {
        const data = doc.data();
        const availableCount = data.availableJuz?.length || 0;
        const takenCount = Object.keys(data.takenJuz || {}).length;
        document.getElementById('availableExtraJuzCount').textContent = availableCount;
        document.getElementById('takenExtraJuzCount').textContent = takenCount;
        const lastDate = data.lastRefillDate ? safeToDate(data.lastRefillDate) : null;
        document.getElementById('lastRefillDate').textContent = lastDate ? lastDate.toLocaleDateString('ar') : '-';
        
        const takenList = document.getElementById('takenExtraJuzList');
        takenList.innerHTML = '';
        for (const [juz, userId] of Object.entries(data.takenJuz || {})) {
            const userSnap = await db.collection('users').doc(userId).get();
            const userName = userSnap.exists ? userSnap.data().username : 'مستخدم غير معروف';
            takenList.innerHTML += `<div class="admin-list-item"><div><strong>الجزء ${juz}</strong><br><small>📖 مقروء من قبل: ${escapeHtml(userName)}</small></div></div>`;
        }
        if (takenList.innerHTML === '') takenList.innerHTML = '<div class="empty-plan">لا توجد أجزاء مأخوذة حالياً</div>';
    }
}

async function refillGlobalExtraJuz() {
    if (!confirm('⚠️ هل أنت متأكد من تجديد المخزون العام؟ سيتم إعادة تعيين جميع الأجزاء (30 جزءاً) ومسح سجل الأجزاء المأخوذة.')) return;
    const poolRef = db.collection('globalExtraJuz').doc('globalPool');
    await poolRef.set({
        availableJuz: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],
        takenJuz: {},
        lastRefillDate: new Date(),
        refillCount: firebase.firestore.FieldValue.increment(1)
    });
    showToast("✅ تم تجديد المخزون العام بنجاح", false);
    await refreshExtraPoolStats();
}

// ==================== دوال إدارة الإعدادات العامة ====================
async function initializeAppSettings() {
    const settingsRef = db.collection('appSettings').doc('config');
    const doc = await settingsRef.get();
    if (!doc.exists) {
        await settingsRef.set({
            maxExtraPerDay: 1,
            maxCircleMembers: 30,
            maxAbsenceDays: 3,
            updatedAt: new Date()
        });
        MAX_CIRCLE_MEMBERS = 30;
        MAX_EXTRA_JUZ_PER_DAY = 1;
        MAX_ABSENCE_DAYS = 3;
    } else {
        const data = doc.data();
        MAX_CIRCLE_MEMBERS = data.maxCircleMembers || 30;
        MAX_EXTRA_JUZ_PER_DAY = data.maxExtraPerDay || 1;
        MAX_ABSENCE_DAYS = data.maxAbsenceDays || 3;
    }
    localStorage.setItem('maxCircleMembers', MAX_CIRCLE_MEMBERS);
    localStorage.setItem('maxExtraPerDay', MAX_EXTRA_JUZ_PER_DAY);
    localStorage.setItem('maxAbsenceDays', MAX_ABSENCE_DAYS);
}

function updateExtraLimitBadge() {
    const badge = document.getElementById('extraLimitBadge');
    if(badge) badge.innerText = `(الحد الأقصى: ${MAX_EXTRA_JUZ_PER_DAY} جزء/يوم)`;
}

// ==================== دوال تعديل اسم المستخدم ====================
let editNameTimeout;
async function checkEditUsername(username) {
    const div = document.getElementById('editNameAvailability');
    if (!username || username.length < 3) { if (div) { div.innerHTML = ''; div.className = 'name-availability'; } return false; }
    if (username === currentMemberData?.userName) { if (div) { div.innerHTML = '✅ هذا هو اسمك الحالي'; div.className = 'name-availability available'; } return true; }
    try {
        const users = await db.collection('users').where('username', '==', username).get();
        const members = await db.collection('circleMembers').where('userName', '==', username).get();
        const taken = !users.empty || !members.empty;
        if (div) { if (taken) { div.innerHTML = '❌ هذا الاسم مستخدم'; div.className = 'name-availability unavailable'; } else { div.innerHTML = '✅ هذا الاسم متاح'; div.className = 'name-availability available'; } }
        return !taken;
    } catch (e) { return true; }
}

async function updateUserName(newName) {
    if (!currentUser || !currentMemberData) return false;
    const memberRef = db.collection('circleMembers').doc(currentMemberId);
    const userRef = db.collection('users').doc(currentUser.uid);
    
    try {
        await memberRef.update({ userName: newName });
        await userRef.update({ username: newName, name: newName });
        currentMemberData.userName = newName;
        await updateUI();
        showToast("✅ تم تحديث اسم المستخدم بنجاح");
        return true;
    } catch (error) {
        console.error(error);
        showToast("حدث خطأ أثناء تحديث الاسم", true);
        return false;
    }
}

// ==================== دوال إكمال الورد اليومي ====================
async function completeDaily() {
    if (!currentUser || !currentMemberData) return;
    
    const today = getTodayString();
    const lastRead = safeDateString(currentMemberData.lastReadDate);
    
    if (lastRead === today) { 
        showToast("⚠️ أتممت اليوم بالفعل", true); 
        return; 
    }
    
    const btn = document.getElementById('completeDailyJuzBtn');
    const orig = btn?.textContent;
    if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري...'; }
    
    try {
        const q = await db.collection('circleMembers').where('userId', '==', currentUser.uid).get();
        if (q.empty) throw new Error();
        const ref = q.docs[0].ref;
        
        const readJuzToday = currentMemberData.currentJuz || currentMemberData.selectedJuz || 1;
        todayReadJuz = readJuzToday;
        localStorage.setItem('todayReadJuz', readJuzToday);
        localStorage.setItem('todayReadDate', today);
        
        const currentJuz = currentMemberData.currentJuz;
        const newJuz = (currentJuz % 30) + 1;
        const newTotalParts = (currentMemberData.totalPartsRead || 0) + 1;
        const newKhatmas = Math.floor(newTotalParts / 30);
        const oldKhatmas = Math.floor((currentMemberData.totalPartsRead || 0) / 30);
        
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        let newStreak = (currentMemberData.streakDays || 0) + 1;
        if (lastRead !== yesterday && lastRead !== null) newStreak = 1;
        
        const readJuzList = currentMemberData.readJuzList || [];
        if (!readJuzList.includes(readJuzToday)) {
            readJuzList.push(readJuzToday);
        }
        
        await ref.update({ 
            currentJuz: newJuz,
            totalPartsRead: newTotalParts,
            lastReadDate: new Date(),
            streakDays: newStreak,
            absenceCount: 0,
            readJuzList: readJuzList
        });
        
        currentMemberData.currentJuz = newJuz;
        currentMemberData.totalPartsRead = newTotalParts;
        currentMemberData.lastReadDate = new Date();
        currentMemberData.streakDays = newStreak;
        currentMemberData.absenceCount = 0;
        currentMemberData.readJuzList = readJuzList;
        
        showToast(`✅ تم تسجيل وردك - الجزء ${readJuzToday}`, false);
        
        if (newKhatmas > oldKhatmas) {
            showToast(`🎉 ختمة جديدة! رقم ${newKhatmas}`, false);
            addNotification(currentUser.uid, "🎉 ختمة", `ختمة رقم ${newKhatmas}`, 'achievement');
        }
        
        await updateUI(); 
        await loadExtraProgress(); 
        updateJuzProgressChart();
        await loadMyJuzList();
        await loadAchievements();
        
        if (btn) { btn.disabled = false; btn.textContent = orig; }
        
    } catch (e) { 
        showToast("حدث خطأ", true); 
        if (btn) { btn.disabled = false; btn.textContent = orig; } 
    }
}

// ==================== دوال عرض أجزاء المستخدم ====================
async function loadMyJuzList() {
    const cont = document.getElementById('myJuzList');
    if (!cont || !currentMemberData) return;
    
    const takenJuz = currentMemberData.takenJuzList || [];
    const readJuz = currentMemberData.readJuzList || [];
    const extraReadJuz = currentMemberData.extraReadJuzList || [];
    const allReadJuz = [...new Set([...readJuz, ...extraReadJuz])].sort((a, b) => a - b);
    
    const today = getTodayString();
    const lastRead = safeDateString(currentMemberData.lastReadDate);
    const readToday = lastRead === today ? (readJuz.length > 0 ? readJuz[readJuz.length - 1] : '-') : '-';
    
    let html = `
        <div class="juz-summary">
            <div class="juz-summary-item">
                <span>📖 الجزء المقروء اليوم:</span>
                <strong style="color:#16a34a;">${readToday !== '-' ? `الجزء ${readToday}` : 'لم تقرأ اليوم'}</strong>
            </div>
            <div class="juz-summary-item">
                <span>📦 الأجزاء المأخوذة:</span>
                <strong>${takenJuz.length > 0 ? takenJuz.join(', ') : 'لا يوجد'}</strong>
            </div>
            <div class="juz-summary-item">
                <span>📖 جميع الأجزاء المقروءة:</span>
                <strong>${allReadJuz.length > 0 ? allReadJuz.join(', ') : 'لا يوجد'}</strong>
            </div>
            <div class="juz-summary-item">
                <span>📊 إجمالي الأجزاء المقروءة:</span>
                <strong>${(currentMemberData.totalPartsRead || 0) + (currentMemberData.totalExtraJuz || 0)}</strong>
            </div>
            <div class="juz-summary-item">
                <span>🏆 عدد الختمات:</span>
                <strong>${calcKhatmasFromParts(currentMemberData.totalPartsRead || 0)}</strong>
            </div>
            <div class="juz-summary-item">
                <span>📅 تاريخ الانضمام:</span>
                <strong>${formatDate(currentMemberData.joinedAt)}</strong>
            </div>
        </div>
    `;
    
    html += `<div class="juz-details"><h4>📋 تفاصيل الأجزاء المأخوذة:</h4><div class="juz-details-grid">`;
    
    for (let juz of takenJuz) {
        const isRead = allReadJuz.includes(juz);
        const isExtra = extraReadJuz.includes(juz);
        let status = '⏳ في الانتظار';
        let statusClass = 'pending';
        if (isRead && isExtra) {
            status = '✅ مقروء (إضافي)';
            statusClass = 'extra-completed';
        } else if (isRead) {
            status = '✅ مقروء (أساسي)';
            statusClass = 'completed';
        }
        html += `
            <div class="juz-detail-item ${statusClass}">
                <span class="juz-number-small">الجزء ${juz}</span>
                <span class="juz-status">${status}</span>
            </div>
        `;
    }
    
    html += `</div></div>`;
    cont.innerHTML = html;
}

// ==================== دوال الإنجازات ====================
async function loadAchievements() {
    const container = document.getElementById('achievementsList');
    if (!container || !currentMemberData) return;
    
    const totalParts = (currentMemberData.totalPartsRead || 0) + (currentMemberData.totalExtraJuz || 0);
    const khatmas = calcKhatmasFromParts(currentMemberData.totalPartsRead || 0);
    const streak = currentMemberData.streakDays || 0;
    const readJuz = currentMemberData.readJuzList || [];
    const extraReadJuz = currentMemberData.extraReadJuzList || [];
    const allReadJuz = [...new Set([...readJuz, ...extraReadJuz])];
    
    const achievements = [
        { id: 'first_read', icon: '📖', name: 'أول قراءة', desc: 'قرأت أول جزء', condition: totalParts >= 1 },
        { id: 'five_read', icon: '📚', name: 'خمسة أجزاء', desc: 'قرأت 5 أجزاء', condition: totalParts >= 5 },
        { id: 'ten_read', icon: '📚', name: 'عشرة أجزاء', desc: 'قرأت 10 أجزاء', condition: totalParts >= 10 },
        { id: 'twenty_read', icon: '📚', name: 'عشرون جزءاً', desc: 'قرأت 20 جزءاً', condition: totalParts >= 20 },
        { id: 'thirty_read', icon: '📚', name: 'ثلاثون جزءاً', desc: 'أكملت الختمة الأولى', condition: totalParts >= 30 },
        { id: 'first_khatma', icon: '🏆', name: 'أول ختمة', desc: 'أتممت ختمة كاملة', condition: khatmas >= 1 },
        { id: 'five_khatma', icon: '🏆', name: 'خمس ختمات', desc: 'أتممت 5 ختمات', condition: khatmas >= 5 },
        { id: 'ten_khatma', icon: '🏆', name: 'عشر ختمات', desc: 'أتممت 10 ختمات', condition: khatmas >= 10 },
        { id: 'streak_7', icon: '🔥', name: 'أسبوع متواصل', desc: 'قرأت 7 أيام متتالية', condition: streak >= 7 },
        { id: 'streak_30', icon: '🔥', name: 'شهر متواصل', desc: 'قرأت 30 يوم متتالية', condition: streak >= 30 },
        { id: 'streak_100', icon: '🔥', name: '100 يوم متواصل', desc: 'قرأت 100 يوم متتالية', condition: streak >= 100 },
        { id: 'all_juz', icon: '🌟', name: 'ختمة كاملة', desc: 'قرأت جميع الأجزاء الـ 30', condition: allReadJuz.length >= 30 },
    ];
    
    container.innerHTML = '';
    for (const ach of achievements) {
        const earned = ach.condition;
        const div = document.createElement('div');
        div.className = `achievement-card ${earned ? 'earned' : ''}`;
        div.innerHTML = `
            <div class="achievement-icon">${ach.icon}</div>
            <div class="achievement-name">${ach.name}</div>
            <div class="achievement-desc">${ach.desc}</div>
            <div class="achievement-status">${earned ? '✅ مكتمل' : '⏳ قيد الإنجاز'}</div>
        `;
        container.appendChild(div);
    }
}

// ==================== دوال التقارير ====================

/**
 * إنشاء تقرير كامل
 */
window.generateFullReport = async function() {
    const cont = document.getElementById('reportContent');
    if (!cont) {
        showToast("عنصر التقرير غير موجود", true);
        return;
    }
    
    showToast("⏳ جاري إنشاء التقرير...", false, 2000);
    cont.innerHTML = '<div style="text-align:center; padding:40px;"><div class="loading-spinner" style="margin:0 auto;"></div><br>جاري تحميل البيانات...</div>';
    
    try {
        const usersSnap = await db.collection('circleMembers').get();
        const users = [];
        usersSnap.forEach(d => { if (d.data().isActive === true) users.push({ id: d.id, ...d.data() }); });
        
        const circles = await db.collection('circles').get();
        const today = getTodayString();
        
        let totalParts = 0, totalKhat = 0, totalExtra = 0;
        let readToday = 0;
        let usersTableRows = '';
        
        for (const u of users) {
            const total = (u.totalPartsRead || 0) + (u.totalExtraJuz || 0);
            const khatmas = calcKhatmasFromParts(u.totalPartsRead || 0);
            totalParts += total;
            totalKhat += khatmas;
            totalExtra += u.totalExtraJuz || 0;
            
            const lastRead = safeDateString(u.lastReadDate);
            const hasReadToday = lastRead === today;
            if (hasReadToday) readToday++;
            
            const mainParts = u.totalPartsRead || 0;
            const extraParts = u.extraReadingsPlan?.filter(p => p.status === 'completed').map(p => p.juz) || [];
            const takenJuz = u.takenJuzList || [];
            const readJuz = u.readJuzList || [];
            const extraReadJuz = u.extraReadJuzList || [];
            const allReadJuz = [...new Set([...readJuz, ...extraReadJuz])].sort((a, b) => a - b);
            const readTodayJuz = hasReadToday ? (readJuz.length > 0 ? readJuz[readJuz.length - 1] : (u.currentJuz || u.selectedJuz || '-')) : '-';
            
            usersTableRows += `
                <tr style="border-bottom:1px solid #ddd; ${hasReadToday ? 'background:#dcfce7;' : 'background:#fee2e2;'}">
                    <td style="padding:8px; font-size:12px;">${escapeHtml(u.userName)}</td>
                    <td style="padding:8px; font-size:12px;">${u.userEmail || '-'}</td>
                    <td style="padding:8px; font-size:12px;">${formatDate(u.joinedAt)}</td>
                    <td style="padding:8px; font-size:12px;">${u.currentJuz || u.selectedJuz}</td>
                    <td style="padding:8px; font-size:12px;">${readTodayJuz}</td>
                    <td style="padding:8px; font-size:12px;">${hasReadToday ? '✅ قرأ اليوم' : '❌ لم يقرأ اليوم'}</td>
                    <td style="padding:8px; font-size:12px;">${total}</td>
                    <td style="padding:8px; font-size:12px;">${khatmas}</td>
                    <td style="padding:8px; font-size:12px;">${mainParts}</td>
                    <td style="padding:8px; font-size:12px;">${extraParts.length > 0 ? extraParts.join(', ') : 'لا يوجد'}</td>
                    <td style="padding:8px; font-size:12px;">${takenJuz.length > 0 ? takenJuz.join(', ') : 'لا يوجد'}</td>
                    <td style="padding:8px; font-size:12px;">${allReadJuz.length > 0 ? allReadJuz.join(', ') : 'لا يوجد'}</td>
                    <td style="padding:8px; font-size:12px;">${u.totalExtraJuz || 0}</td>
                    <td style="padding:8px; font-size:12px;">${u.absenceCount || 0}</td>
                </tr>
            `;
        }
        
        if (users.length === 0) {
            cont.innerHTML = `<div class="report-section">
                <h4>📊 تقرير شامل</h4>
                <div class="report-stats">
                    <div class="report-stat"><div class="label">👥 إجمالي المستخدمين</div><div class="value">0</div></div>
                </div>
                <p style="text-align:center; padding:20px; color:#666;">لا يوجد مستخدمين نشطين لعرض التقرير</p>
            </div>`;
            return;
        }
        
        cont.innerHTML = `
            <div class="report-section">
                <h4>📊 تقرير شامل</h4>
                <div class="report-stats" style="display:flex; flex-wrap:wrap; gap:15px; margin-top:10px;">
                    <div class="report-stat" style="background:white; padding:12px 18px; border-radius:12px; min-width:120px; flex:1;">
                        <div class="label" style="font-size:12px; color:#666;">👥 إجمالي المستخدمين</div>
                        <div class="value" style="font-size:20px; font-weight:bold; color:#1a4739;">${users.length}</div>
                    </div>
                    <div class="report-stat" style="background:white; padding:12px 18px; border-radius:12px; min-width:120px; flex:1;">
                        <div class="label" style="font-size:12px; color:#666;">✅ قرأوا اليوم</div>
                        <div class="value" style="font-size:20px; font-weight:bold; color:#16a34a;">${readToday}</div>
                    </div>
                    <div class="report-stat" style="background:white; padding:12px 18px; border-radius:12px; min-width:120px; flex:1;">
                        <div class="label" style="font-size:12px; color:#666;">❌ لم يقرأوا اليوم</div>
                        <div class="value" style="font-size:20px; font-weight:bold; color:#dc2626;">${users.length - readToday}</div>
                    </div>
                    <div class="report-stat" style="background:white; padding:12px 18px; border-radius:12px; min-width:120px; flex:1;">
                        <div class="label" style="font-size:12px; color:#666;">🔄 الحلقات</div>
                        <div class="value" style="font-size:20px; font-weight:bold; color:#1a4739;">${circles.size}</div>
                    </div>
                    <div class="report-stat" style="background:white; padding:12px 18px; border-radius:12px; min-width:120px; flex:1;">
                        <div class="label" style="font-size:12px; color:#666;">📖 إجمالي الأجزاء المقروءة</div>
                        <div class="value" style="font-size:20px; font-weight:bold; color:#1a4739;">${totalParts}</div>
                    </div>
                    <div class="report-stat" style="background:white; padding:12px 18px; border-radius:12px; min-width:120px; flex:1;">
                        <div class="label" style="font-size:12px; color:#666;">🏆 إجمالي الختمات</div>
                        <div class="value" style="font-size:20px; font-weight:bold; color:#1a4739;">${totalKhat}</div>
                    </div>
                    <div class="report-stat" style="background:white; padding:12px 18px; border-radius:12px; min-width:120px; flex:1;">
                        <div class="label" style="font-size:12px; color:#666;">📦 الأجزاء الإضافية</div>
                        <div class="value" style="font-size:20px; font-weight:bold; color:#1a4739;">${totalExtra}</div>
                    </div>
                </div>
            </div>
            <div class="report-section" style="margin-top:20px;">
                <h4>📋 تفاصيل المستخدمين</h4>
                <div style="overflow-x: auto; margin-top:10px;">
                    <table style="width:100%; border-collapse:collapse; font-size:12px;">
                        <thead>
                            <tr style="background:#1a4739; color:white;">
                                <th style="text-align:right; padding:8px;">الاسم</th>
                                <th style="text-align:right; padding:8px;">البريد الإلكتروني</th>
                                <th style="text-align:right; padding:8px;">تاريخ الانضمام</th>
                                <th style="text-align:right; padding:8px;">جزء يوم غد</th>
                                <th style="text-align:right; padding:8px;">الجزء المقروء اليوم</th>
                                <th style="text-align:right; padding:8px;">حالة القراءة اليوم</th>
                                <th style="text-align:right; padding:8px;">إجمالي الأجزاء</th>
                                <th style="text-align:right; padding:8px;">الختمات</th>
                                <th style="text-align:right; padding:8px;">الأجزاء الأساسية</th>
                                <th style="text-align:right; padding:8px;">الأجزاء الإضافية المقروءة</th>
                                <th style="text-align:right; padding:8px;">الأجزاء المأخوذة</th>
                                <th style="text-align:right; padding:8px;">جميع الأجزاء المقروءة</th>
                                <th style="text-align:right; padding:8px;">عدد الإضافية</th>
                                <th style="text-align:right; padding:8px;">أيام الغياب</th>
                            </tr>
                        </thead>
                        <tbody>${usersTableRows}</tbody>
                    </table>
                </div>
            </div>
        `;
        
        showToast(`✅ تم إنشاء التقرير (${users.length} مستخدم)`, false);
        
    } catch (error) {
        console.error('خطأ في إنشاء التقرير:', error);
        cont.innerHTML = `<div class="report-section">
            <h4>⚠️ حدث خطأ</h4>
            <p style="color:#dc2626; padding:20px;">${error.message || 'حدث خطأ أثناء إنشاء التقرير'}</p>
        </div>`;
        showToast('حدث خطأ أثناء إنشاء التقرير', true);
    }
};

/**
 * تصدير التقرير كـ PDF
 */
window.downloadReportAsPDF = function() {
    const content = document.getElementById('reportContent');
    if (!content || !content.innerHTML || content.innerHTML.trim() === '' || content.innerHTML.includes('جاري تحميل البيانات')) {
        showToast('⚠️ لا توجد بيانات للتصدير. قم بإنشاء تقرير أولاً.', true);
        return;
    }
    
    try {
        showToast('⏳ جاري إنشاء PDF...', false, 2000);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        doc.setFontSize(18);
        doc.text('تقرير ختمتي - تفصيلي', 14, 20);
        doc.setFontSize(10);
        doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar')}`, 14, 28);
        
        const text = content.innerText || content.textContent;
        const lines = doc.splitTextToSize(text, 180);
        doc.text(lines, 14, 40);
        
        doc.save(`تقرير_ختمتي_${new Date().toLocaleDateString('ar')}.pdf`);
        showToast('✅ تم تصدير PDF بنجاح', false);
        
    } catch (error) {
        console.error('خطأ في تصدير PDF:', error);
        showToast('حدث خطأ أثناء تصدير PDF', true);
    }
};

/**
 * تصدير التقرير كـ Excel
 */
window.exportReportToExcel = function() {
    const content = document.getElementById('reportContent');
    if (!content || !content.innerHTML || content.innerHTML.trim() === '' || content.innerHTML.includes('جاري تحميل البيانات')) {
        showToast('⚠️ لا توجد بيانات للتصدير. قم بإنشاء تقرير أولاً.', true);
        return;
    }
    
    try {
        showToast('⏳ جاري تصدير Excel...', false, 2000);
        const tables = content.querySelectorAll('table');
        if (tables.length === 0) {
            showToast('⚠️ لا توجد بيانات جدول للتصدير', true);
            return;
        }
        
        const stats = content.querySelectorAll('.report-stat');
        const summaryData = [];
        stats.forEach(stat => {
            const label = stat.querySelector('.label')?.innerText || '';
            const value = stat.querySelector('.value')?.innerText || '';
            if (label && value) {
                summaryData.push({ 'الإحصائية': label, 'القيمة': value });
            }
        });
        
        const table = tables[0];
        const rows = table.querySelectorAll('tr');
        const tableData = [];
        let headers = [];
        
        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('th, td');
            const rowData = {};
            cells.forEach((cell, cellIndex) => {
                if (rowIndex === 0) {
                    headers[cellIndex] = cell.textContent.trim();
                } else {
                    rowData[headers[cellIndex] || `عمود ${cellIndex + 1}`] = cell.textContent.trim();
                }
            });
            if (rowIndex > 0 && Object.keys(rowData).length > 0) {
                tableData.push(rowData);
            }
        });
        
        const wsData = [
            ['تقرير ختمتي'],
            [`تاريخ التقرير: ${new Date().toLocaleDateString('ar')}`],
            [],
            ['الإحصائيات العامة'],
            ...summaryData.map(row => [row['الإحصائية'], row['القيمة']]),
            [],
            ['تفاصيل المستخدمين'],
            [],
            headers,
            ...tableData.map(row => headers.map(h => row[h] || ''))
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'تقرير ختمتي');
        ws['!cols'] = headers.map(() => ({ wch: 15 }));
        XLSX.writeFile(wb, `تقرير_ختمتي_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.xlsx`);
        showToast('✅ تم تصدير Excel بنجاح', false);
        
    } catch (error) {
        console.error('خطأ في تصدير Excel:', error);
        showToast('حدث خطأ أثناء تصدير Excel', true);
    }
};

// ==================== دوال المشاركة ====================
async function loadShareMessage() {
    try {
        const doc = await db.collection('appSettings').doc('shareMessage').get();
        if (doc.exists) {
            shareMessageText = doc.data().message || '';
        } else {
            shareMessageText = '📖 أنا أقرأ الجزء {juz} من القرآن الكريم في تطبيق ختمتي! 🕌\n\nانضم إلينا وشارك في الختمة الجماعية 📚\n\n#ختمتي #القرآن_الكريم';
            await db.collection('appSettings').doc('shareMessage').set({
                message: shareMessageText,
                updatedAt: new Date()
            });
        }
        const textarea = document.getElementById('shareMessageText');
        if (textarea) textarea.value = shareMessageText;
        updateSharePreview();
    } catch (error) {
        console.error('خطأ في تحميل رسالة المشاركة:', error);
    }
}

async function saveShareMessage() {
    const text = document.getElementById('shareMessageText').value;
    if (!text) {
        showToast('⚠️ أدخل نص الرسالة', true);
        return;
    }
    try {
        await db.collection('appSettings').doc('shareMessage').set({
            message: text,
            updatedAt: new Date()
        });
        shareMessageText = text;
        showToast('✅ تم حفظ رسالة المشاركة', false);
        updateSharePreview();
    } catch (error) {
        console.error(error);
        showToast('حدث خطأ أثناء حفظ الرسالة', true);
    }
}

function updateSharePreview() {
    const preview = document.getElementById('shareMessagePreview');
    if (!preview) return;
    const text = document.getElementById('shareMessageText')?.value || shareMessageText;
    const previewText = text.replace(/{juz}/g, '10').replace(/{readJuz}/g, '10');
    preview.innerHTML = previewText.replace(/\n/g, '<br>');
}

function getShareText(juzNumber, readJuz = null) {
    const juzToShow = readJuz || juzNumber;
    const text = shareMessageText || '📖 أنا أقرأ الجزء {juz} من القرآن الكريم في تطبيق ختمتي! 🕌\n\nانضم إلينا وشارك في الختمة الجماعية 📚\n\n#ختمتي #القرآن_الكريم';
    
    // جلب بيانات المستخدم
    const userName = currentMemberData?.userName || 'مستخدم';
    const totalParts = (currentMemberData?.totalPartsRead || 0) + (currentMemberData?.totalExtraJuz || 0);
    const khatmas = calcKhatmasFromParts(currentMemberData?.totalPartsRead || 0);
    const streak = currentMemberData?.streakDays || 0;
    const points = Math.floor(currentMemberData?.points || 0);
    const circleName = getCircleName(); // دالة جديدة لجلب اسم الحلقة
    
    // استبدال جميع المتغيرات
    let finalText = text
        .replace(/{juz}/g, juzToShow)
        .replace(/{readJuz}/g, juzToShow)
        .replace(/{userName}/g, userName)
        .replace(/{name}/g, userName)
        .replace(/{totalParts}/g, totalParts)
        .replace(/{khatmas}/g, khatmas)
        .replace(/{streak}/g, streak)
        .replace(/{points}/g, points)
        .replace(/{circle}/g, circleName)
        .replace(/{circleId}/g, currentCircleId || '');
    
    return finalText;
}

// دالة مساعدة لجلب اسم الحلقة
function getCircleName() {
    if (!currentCircleId) return 'حلقة عامة';
    // جلب اسم الحلقة من التخزين المحلي أو من Firestore
    const cached = localStorage.getItem(`circle_${currentCircleId}`);
    if (cached) return cached;
    return 'حلقة رقم ' + currentCircleId.substring(0, 8);
}

function openShareModal() {
    if (!currentMemberData) {
        showToast('⚠️ يرجى تسجيل الدخول أولاً', true);
        return;
    }
    
    const today = getTodayString();
    const lastRead = safeDateString(currentMemberData.lastReadDate);
    const hasReadToday = lastRead === today;
    const readJuz = currentMemberData.readJuzList || [];
    const readToday = hasReadToday && readJuz.length > 0 ? readJuz[readJuz.length - 1] : null;
    const juzNum = readToday || currentMemberData.currentJuz || currentMemberData.selectedJuz || 1;
    
    // استخدام الدالة المحسنة
    const shareText = getShareText(juzNum, readToday);
    
    // عرض النص في المودال
    const display = document.getElementById('shareMessageDisplay');
    if (display) {
        display.textContent = shareText;
    }
    
    // إظهار المودال
    document.getElementById('shareModal').style.display = 'flex';
}
function shareToWhatsApp() {
    const text = document.getElementById('shareMessageDisplay').textContent;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

function shareToTelegram() {
    const text = document.getElementById('shareMessageDisplay').textContent;
    const encoded = encodeURIComponent(text);
    window.open(`https://t.me/share/url?url=&text=${encoded}`, '_blank');
}

function shareToTwitter() {
    const text = document.getElementById('shareMessageDisplay').textContent;
    const encoded = encodeURIComponent(text);
    window.open(`https://twitter.com/intent/tweet?text=${encoded}`, '_blank');
}

function copyShareText() {
    const text = document.getElementById('shareMessageDisplay').textContent;
    navigator.clipboard.writeText(text).then(() => {
        showToast('✅ تم نسخ النص', false);
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('✅ تم نسخ النص', false);
    });
}

// ==================== دوال تسجيل الدخول و Google ====================
async function initFCM() {
    if (!currentUser || currentUser.email === ADMIN_EMAIL) return;
    try {
        const token = await messaging.getToken({ vapidKey: 'BGpXqZ5kQ9v3Ld2FgH7jK1mN4pR6sT8uVwXyZ2aBcDeFgHiJkLmNoPqRsTuVwXyZ' });
        await db.collection('users').doc(currentUser.uid).update({ fcmToken: token });
        messaging.onMessage((payload) => {
            showToast(payload.notification?.body || 'إشعار جديد');
        });
    } catch (err) {
        console.error('FCM error:', err);
    }
}

async function enableNotifications() {
    try {
        await messaging.requestPermission();
        const token = await messaging.getToken({ vapidKey: 'BGpXqZ5kQ9v3Ld2FgH7jK1mN4pR6sT8uVwXyZ2aBcDeFgHiJkLmNoPqRsTuVwXyZ' });
        await db.collection('users').doc(currentUser.uid).update({ fcmToken: token, notificationsEnabled: true });
        showToast('✅ تم تفعيل الإشعارات', false);
        document.getElementById('notificationPermissionModal').style.display = 'none';
        scheduleDailyReminder();
    } catch (err) {
        console.error('Error enabling notifications:', err);
        showToast('حدث خطأ في تفعيل الإشعارات', true);
    }
}

async function handleGoogleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            let username = user.displayName ? user.displayName.replace(/\s/g, '') : user.email.split('@')[0];
            let finalUsername = username;
            let counter = 1;
            while (true) {
                const existing = await db.collection('users').where('username', '==', finalUsername).get();
                if (existing.empty) break;
                finalUsername = `${username}_${counter}`;
                counter++;
            }
            await db.collection('users').doc(user.uid).set({
                name: finalUsername,
                username: finalUsername,
                email: user.email,
                gender: 'mixed',
                role: 'user',
                createdAt: new Date()
            });
        }
        
        currentUser = user;
        const udoc = await db.collection('users').doc(user.uid).get();
        currentUserGender = udoc.data().gender || 'mixed';
        
        const isAd = await checkIfAdmin(user);
        if (isAd) {
            await loadAdminData();
            showScreen('adminScreen');
        } else {
            await initFCM();
            await loadUserData();
        }
    } catch (error) {
        console.error(error);
        let errorMsg = "فشل الدخول عبر Google";
        if (error.code === 'auth/popup-blocked') errorMsg = "تم حظر النافذة المنبثقة، يرجى السماح بالنوافذ المنبثقة للموقع";
        else if (error.code === 'auth/unauthorized-domain') errorMsg = "النطاق غير مصرح به، أضف هذا النطاق في Firebase Console";
        showMessage('authMessage', errorMsg, true);
    }
}

let nameTimeout;
async function checkUsername(username) {
    const div = document.getElementById('nameAvailability');
    if (!username || username.length < 3) { if (div) { div.innerHTML = ''; div.className = 'name-availability'; } return false; }
    try {
        const users = await db.collection('users').where('username', '==', username).get();
        const members = await db.collection('circleMembers').where('userName', '==', username).get();
        const taken = !users.empty || !members.empty;
        if (div) { if (taken) { div.innerHTML = '❌ هذا الاسم مستخدم'; div.className = 'name-availability unavailable'; } else { div.innerHTML = '✅ هذا الاسم متاح'; div.className = 'name-availability available'; } }
        return !taken;
    } catch (e) { return true; }
}

async function loginWithUsernameOrEmail(identifier, password) {
    const isEmail = identifier.includes('@');
    if (isEmail) return await auth.signInWithEmailAndPassword(identifier, password);
    const users = await db.collection('users').where('username', '==', identifier).get();
    if (users.empty) throw new Error('اسم المستخدم غير موجود');
    return await auth.signInWithEmailAndPassword(users.docs[0].data().email, password);
}

async function addNotification(userId, title, message, type = 'general') { 
    await db.collection('notifications').add({ userId, title, message, type, createdAt: new Date(), read: false }); 
}

function resetIdleTimer() {
    if (!currentUser || currentUser.email === ADMIN_EMAIL) return;
    lastActivityTime = Date.now();
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        if (Date.now() - lastActivityTime >= IDLE_TIMEOUT) {
            showToast("⚠️ تم تسجيل الخروج تلقائياً لعدم النشاط", true);
            auth.signOut();
        }
    }, IDLE_TIMEOUT);
}

async function checkEmailVerification(user) {
    if (!user || user.email === ADMIN_EMAIL) return true;
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists && userDoc.data().isGuest === true) return true;
    await user.reload();
    if (!user.emailVerified) {
        showToast("📧 يرجى تفعيل بريدك الإلكتروني أولاً. تحقق من بريدك الوارد.", true, 5000);
        await auth.signOut();
        return false;
    }
    return true;
}

function initDarkMode() {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        updateDarkModeButtons(true);
    } else {
        document.body.classList.remove('dark-mode');
        updateDarkModeButtons(false);
    }
}

function updateDarkModeButtons(isDark) {
    const btns = document.querySelectorAll('#darkModeToggleCircle, #darkModeToggleMain, #darkModeToggleAdmin');
    btns.forEach(btn => {
        if (btn) btn.textContent = isDark ? '☀️' : '🌙';
    });
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    updateDarkModeButtons(isDark);
}

function initFontSize() {
    const savedSize = localStorage.getItem('fontSize') || 'medium';
    document.body.classList.add(`font-${savedSize}`);
}

function setFontSize(size) {
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add(`font-${size}`);
    localStorage.setItem('fontSize', size);
}

function showFontSizeModal() {
    const modal = document.getElementById('fontSizeModal');
    if (modal) modal.style.display = 'flex';
}

function scheduleDailyReminder() {
    if (typeof Notification === "undefined") return;
    const reminderHour = parseInt(localStorage.getItem('reminderHour')) || 20;
    const now = new Date();
    let target = new Date();
    target.setHours(reminderHour, 0, 0, 0);
    if (now >= target) target.setDate(target.getDate() + 1);
    const delay = target - now;
    setTimeout(() => {
        if (currentUser && currentMemberData) {
            const last = safeDateString(currentMemberData.lastReadDate);
            if (last !== getTodayString()) {
                showToast("📖 تذكير: لم تقرأ وردك اليوم بعد!", false, 5000);
                if (Notification.permission === "granted") {
                    new Notification("📖 ختمتي - تذكير بالورد", { 
                        body: "لم تقرأ وردك اليوم بعد؟ لا تنسَ ختمتك!", 
                        icon: "/favicon.ico" 
                    });
                }
            }
        }
        scheduleDailyReminder();
    }, delay);
}

function showNotificationPermissionPrompt() {
    if (typeof Notification !== "undefined") {
        if (Notification.permission === "granted") {
            return;
        } else if (Notification.permission === "denied") {
            return;
        } else {
            document.getElementById('notificationPermissionModal').style.display = 'flex';
        }
    }
}

function updateJuzProgressChart() {
    if (!currentMemberData) return;
    const totalParts = currentMemberData.totalPartsRead || 0;
    const progressInCurrentKhatma = totalParts % 30;
    const percent = (progressInCurrentKhatma / 30) * 100;
    
    document.getElementById('juzProgressPercent').textContent = Math.round(percent) + '%';
    const canvas = document.getElementById('juzProgressChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (juzChart) juzChart.destroy();
    juzChart = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [percent, 100-percent], backgroundColor: ['#fbbf24', '#e5e7eb'], borderWidth: 0 }] },
        options: { cutout: '70%', plugins: { tooltip: { enabled: false }, legend: { display: false } } }
    });
}

async function ensureAdminExists() {
    try {
        await auth.signInWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        const doc = await db.collection('users').doc(auth.currentUser.uid).get();
        if (!doc.exists) await db.collection('users').doc(auth.currentUser.uid).set({ name: "المدير العام", username: "admin", email: ADMIN_EMAIL, role: "admin", gender: "male", createdAt: new Date() });
        await auth.signOut();
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            const uc = await auth.createUserWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
            await db.collection('users').doc(uc.user.uid).set({ name: "المدير العام", username: "admin", email: ADMIN_EMAIL, role: "admin", gender: "male", createdAt: new Date() });
            await auth.signOut();
        }
    }
}

async function checkIfAdmin(user) {
    if (!user) return false;
    const btn = document.getElementById('adminPanelBtn');
    if (user.email === ADMIN_EMAIL) { isAdmin = true; if (btn) btn.style.display = 'inline-block'; return true; }
    try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists && doc.data().role === 'admin') { isAdmin = true; if (btn) btn.style.display = 'inline-block'; return true; }
    } catch (e) { }
    isAdmin = false; if (btn) btn.style.display = 'none'; return false;
}

function exitToAuth() { auth.signOut().then(() => { showScreen('authScreen'); pendingUserData = null; currentUser = null; isAdmin = false; }); }

async function refreshCircles() { 
    if (pendingUserData) await showAvailableCircles(pendingUserData); 
    else if (currentUser) { 
        const ud = await db.collection('users').doc(currentUser.uid).get(); 
        if (ud.exists) await showAvailableCircles({ userId: currentUser.uid, email: currentUser.email, name: ud.data().username, gender: ud.data().gender }); 
    } 
}

// ==================== دوال عرض الحلقات ====================
async function showAvailableCircles(userData) {
    pendingUserData = userData;
    currentUserGender = userData.gender;
    
    const circles = await getCachedOrFetch('circles', async () => {
        const snap = await db.collection('circles').get();
        const result = [];
        for (const doc of snap.docs) {
            const c = doc.data();
            result.push({ 
                id: doc.id, 
                name: c.circleName, 
                inviteCode: c.inviteCode,
                memberCount: c.memberCount || 0, 
                gender: c.gender || 'mixed', 
                isFull: (c.memberCount || 0) >= MAX_CIRCLE_MEMBERS, 
                createdAt: c.createdAt 
            });
        }
        result.sort((a, b) => (a.createdAt?.toDate ? a.createdAt.toDate() : 0) - (b.createdAt?.toDate ? b.createdAt.toDate() : 0));
        return result;
    });
    filterCirclesUI(circles);
}

function filterCirclesUI(circles) {
    const searchTerm = document.getElementById('searchCircleInput')?.value.toLowerCase() || '';
    const activeFilter = document.querySelector('.filter-gender-btn.active');
    let filtered = circles;
    
    if (activeFilter) {
        const filterText = activeFilter.textContent;
        if (filterText.includes('نسائية')) {
            filtered = filtered.filter(c => c.gender === 'female' || c.gender === 'mixed');
        } else if (filterText.includes('رجالية')) {
            filtered = filtered.filter(c => c.gender === 'male' || c.gender === 'mixed');
        }
    }
    
    if (searchTerm) {
        filtered = filtered.filter(c => c.name.toLowerCase().includes(searchTerm) || c.inviteCode.toLowerCase().includes(searchTerm));
    }
    
    const container = document.getElementById('availableCirclesList');
    if (!container) return;
    container.innerHTML = '';
    if (filtered.length === 0) { 
        container.innerHTML = '<div class="circle-card"><h4>لا توجد حلقات متاحة</h4><p>يمكنك الانضمام برمز الحلقة من الأعلى</p><button onclick="refreshCircles()" class="refresh-btn">تحديث</button></div>'; 
        showScreen('selectCircleScreen'); 
        return; 
    }
    
    const uniqueCircles = [];
    const seenNames = new Set();
    for (const circle of filtered) {
        if (!seenNames.has(circle.name)) {
            seenNames.add(circle.name);
            uniqueCircles.push(circle);
        }
    }
    
    for (const circle of uniqueCircles) {
        const isActive = !circle.isFull;
        const card = document.createElement('div');
        card.className = `circle-card ${circle.gender === 'female' ? 'female-circle' : circle.gender === 'male' ? 'male-circle' : ''}`;
        const genderBadge = circle.gender === 'female' ? '<span class="circle-gender-badge female">👩 نسائي</span>' : circle.gender === 'male' ? '<span class="circle-gender-badge male">👨 رجالي</span>' : '<span class="circle-gender-badge mixed">👥 مختلط</span>';
        const btnHtml = circle.isFull ? '<button class="join-btn" disabled>❌ مكتملة</button>' : (isActive ? `<button class="join-btn" onclick="selectCircle('${circle.id}')">➕ انضم</button>` : '<button class="join-btn" disabled>⏳ انتظر دورك</button>');
        card.innerHTML = `<h4>🔄 ${escapeHtml(circle.name)}</h4><p>🔑 ${circle.inviteCode}</p><p>👥 ${circle.memberCount}/${MAX_CIRCLE_MEMBERS}</p>${genderBadge}${btnHtml}`;
        container.appendChild(card);
    }
    showScreen('selectCircleScreen');
}

// ==================== دوال الانضمام ====================
async function joinCircleByCode() {
    const codeInput = document.getElementById('circleCodeInput');
    const code = codeInput?.value?.trim().toUpperCase();
    if (!code) {
        showToast("⚠️ أدخل رمز الحلقة", true);
        return;
    }
    
    try {
        const snap = await db.collection('circles').where('inviteCode', '==', code).limit(1).get();
        if (snap.empty) {
            showToast("❌ رمز الحلقة غير صحيح", true);
            return;
        }
        
        const circleDoc = snap.docs[0];
        const circle = circleDoc.data();
        
        if ((circle.memberCount || 0) >= MAX_CIRCLE_MEMBERS) {
            showToast("❌ الحلقة مكتملة", true);
            return;
        }
        
        if (circle.gender !== 'mixed' && circle.gender !== currentUserGender) {
            if (!confirm(`⚠️ هذه الحلقة مخصصة لل${circle.gender === 'female' ? 'نساء' : 'رجال'}، هل تريد المتابعة؟`)) {
                return;
            }
        }
        
        if (confirm(`الانضمام إلى حلقة "${circle.circleName}"؟`)) {
            pendingCircleId = circleDoc.id;
            await showAvailableJuz(circleDoc.id);
        }
    } catch (error) {
        console.error(error);
        showToast("حدث خطأ أثناء البحث عن الحلقة", true);
    }
}

// ==================== دوال اختيار الجزء ====================
window.selectCircle = async function (id) { 
    pendingCircleId = id; 
    await showAvailableJuz(id); 
};

function goBackToCircles() {
    if (pendingUserData) {
        showAvailableCircles(pendingUserData);
    } else {
        showScreen('selectCircleScreen');
    }
}

async function showAvailableJuz(circleId) {
    const doc = await db.collection('circleAvailableJuz').doc(circleId).get();
    let taken = {}, avail = [];
    if (doc.exists) { avail = doc.data().availableJuz || []; taken = doc.data().takenJuz || {}; }
    else { 
        avail = Array.from({ length: 30 }, (_, i) => i + 1); 
        await db.collection('circleAvailableJuz').doc(circleId).set({ circleId, availableJuz: avail, takenJuz: taken, createdAt: new Date() }); 
    }
    const container = document.getElementById('juzGrid');
    container.innerHTML = '';
    
    for (let i = 1; i <= 30; i++) {
        const isTaken = taken[i] && taken[i] !== pendingUserData?.userId;
        const btn = document.createElement('button');
        btn.className = `juz-btn ${isTaken ? 'taken' : ''}`;
        btn.textContent = i;
        btn.disabled = isTaken;
        if (!isTaken) btn.onclick = () => selectJuz(circleId, i);
        container.appendChild(btn);
    }
    showScreen('selectJuzScreen');
}

async function selectJuz(circleId, juz) {
    if (!pendingUserData) {
        showMessage('juzSelectionMessage', 'خطأ: يرجى إعادة المحاولة', true);
        return;
    }
    const existingMemberCheck = await db.collection('circleMembers')
        .where('userId', '==', pendingUserData.userId)
        .where('isActive', '==', true)
        .get();
    if (!existingMemberCheck.empty) {
        showMessage('juzSelectionMessage', '⚠️ أنت بالفعل عضو في حلقة', true);
        return;
    }

    const userName = pendingUserData.name || pendingUserData.username || "مستخدم";
    const availRef = db.collection('circleAvailableJuz').doc(circleId);
    try {
        let takenJuzList = [];
        await db.runTransaction(async t => {
            const d = await t.get(availRef);
            const data = d.data() || { availableJuz: [], takenJuz: {} };
            if (data.takenJuz[juz] && data.takenJuz[juz] !== pendingUserData.userId) {
                throw new Error('الجزء مأخوذ');
            }
            const newTaken = { ...data.takenJuz, [juz]: pendingUserData.userId };
            const newAvail = data.availableJuz.filter(j => j !== juz);
            t.update(availRef, { takenJuz: newTaken, availableJuz: newAvail });
            
            takenJuzList = Object.keys(newTaken).map(Number);
        });

        const circleRef = db.collection('circles').doc(circleId);
        const cDoc = await circleRef.get();
        await circleRef.update({ memberCount: (cDoc.data().memberCount || 0) + 1 });

        const memberId = db.collection('circleMembers').doc().id;
        const memberDoc = {
            circleId, 
            userId: pendingUserData.userId, 
            userName, 
            userEmail: pendingUserData.email || "", 
            userGender: pendingUserData.gender || "mixed",
            joinedAt: new Date(),
            selectedJuz: juz, 
            currentJuz: juz,
            totalPartsRead: 0,
            completedKhatmas: 0,
            lastReadDate: null,
            absenceCount: 0,
            streakDays: 0, 
            isActive: true,
            extraReadingsPlan: [], 
            totalExtraJuz: 0,
            takenJuzList: takenJuzList,
            readJuzList: [],
            extraReadJuzList: []
        };
        await db.collection('circleMembers').doc(memberId).set(memberDoc);

        currentMemberData = memberDoc;
        currentMemberId = memberId;
        currentCircleId = circleId;

        showMessage('juzSelectionMessage', `✅ تم اختيار الجزء ${juz}`, false);

        await updateUI();
        await Promise.all([
            loadCircleInfo(),
            loadExtraProgress(),
            loadMyJuzList(),
            loadAchievements()
        ]);
        updateJuzProgressChart();
        showScreen('mainScreen');
        showToast("🎉 مرحباً بك في الحلقة!", false);

        pendingUserData = null;
        pendingCircleId = null;
    } catch (error) {
        console.error(error);
        showMessage('juzSelectionMessage', error.message || 'حدث خطأ', true);
    }
}

// ==================== دوال تحميل بيانات المستخدم ====================
async function loadUserData() {
    if (!currentUser || currentUser.email === ADMIN_EMAIL) return;
    const verified = await checkEmailVerification(currentUser);
    if (!verified) return;
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (!userDoc.exists) {
        await db.collection('users').doc(currentUser.uid).set({
            name: currentUser.displayName || currentUser.email.split('@')[0],
            username: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email,
            gender: 'mixed',
            role: 'user',
            createdAt: new Date()
        });
    }
    currentUserGender = userDoc.exists ? userDoc.data().gender : 'mixed';
    const members = await db.collection('circleMembers')
        .where('userId', '==', currentUser.uid)
        .where('isActive', '==', true)
        .get();
    if (members.empty) {
        await showAvailableCircles({
            userId: currentUser.uid,
            email: currentUser.email,
            name: userDoc.exists ? userDoc.data().username : currentUser.displayName || currentUser.email.split('@')[0],
            gender: currentUserGender
        });
        return;
    }
    const mDoc = members.docs[0];
    currentMemberData = mDoc.data();
    currentMemberId = mDoc.id;
    currentCircleId = currentMemberData.circleId;
    
    if (currentMemberData && !currentMemberData.lastReadDate) {
        await db.collection('circleMembers').doc(currentMemberId).update({
            absenceCount: 0
        });
        currentMemberData.absenceCount = 0;
    }
    
    if (!currentMemberData.selectedJuz) {
        await showAvailableCircles({
            userId: currentUser.uid,
            email: currentUser.email,
            name: userDoc.exists ? userDoc.data().username : currentUser.displayName || currentUser.email.split('@')[0],
            gender: currentUserGender
        });
        return;
    }
    await updateUI();
    await Promise.all([loadCircleInfo(), loadExtraProgress(), loadMyJuzList(), loadAchievements()]);
    updateJuzProgressChart();
    showScreen('mainScreen');
    showNotificationPermissionPrompt();
    resetIdleTimer();
    updateExtraLimitBadge();
}

// ==================== دوال تحديث الواجهة ====================
async function updateUI() {
    if (!currentMemberData) return;
    
    document.getElementById('userName').textContent = currentMemberData.userName || 'مستخدم';
    
    const totalParts = currentMemberData.totalPartsRead || 0;
    const currentJuzNum = currentMemberData.currentJuz || currentMemberData.selectedJuz || 1;
    const progressInKhatma = totalParts % 30;
    const currentKhatma = Math.floor(totalParts / 30) + 1;
    
    const today = getTodayString();
    const lastReadDate = safeToDate(currentMemberData.lastReadDate);
    const lastReadStr = lastReadDate ? lastReadDate.toDateString() : null;
    const hasReadToday = lastReadStr === today;
    
    const readJuz = currentMemberData.readJuzList || [];
    const readTodayJuz = hasReadToday && readJuz.length > 0 ? readJuz[readJuz.length - 1] : null;
    
    const displayJuz = readTodayJuz || currentJuzNum;
    
    document.getElementById('currentJuz').textContent = displayJuz;
    if (hasReadToday && readTodayJuz) {
        document.getElementById('juzStatus').innerHTML = `✅ قرأت اليوم الجزء ${readTodayJuz} | الختمة ${currentKhatma}`;
    } else {
        document.getElementById('juzStatus').innerHTML = `الختمة ${currentKhatma} - الجزء ${displayJuz} من 30`;
    }
    document.getElementById('khatmaProgress').style.width = (progressInKhatma / 30 * 100) + '%';
    document.getElementById('totalPartsCount').textContent = (currentMemberData.totalPartsRead || 0) + (currentMemberData.totalExtraJuz || 0);
    document.getElementById('khatmasCount').textContent = calcKhatmasFromParts(totalParts);
    document.getElementById('joinDateDisplay').textContent = formatDate(currentMemberData.joinedAt);
    
    const btn = document.getElementById('completeDailyJuzBtn');
    if (hasReadToday) { 
        btn.disabled = true; 
        btn.textContent = '✅ تم إكمال الورد'; 
        btn.style.background = '#9ca3af'; 
        btn.style.color = 'white';
    } else { 
        btn.disabled = false; 
        btn.textContent = '✅ أنهيت وردي اليوم'; 
        btn.style.background = '#fbbf24'; 
        btn.style.color = '#1a4739';
    }
    
    document.getElementById('userInfo').innerHTML = `
        📧 ${currentMemberData.userEmail || 'غير مسجل'} | 
        📅 انضم: ${formatDate(currentMemberData.joinedAt)} | 
        📊 ${(currentMemberData.totalPartsRead || 0) + (currentMemberData.totalExtraJuz || 0)} جزء
        ${hasReadToday && readTodayJuz ? ` | ✅ قرأت الجزء ${readTodayJuz}` : ' | ❌ لم تقرأ اليوم'}
    `;
    
    const warningDiv = document.getElementById('warningMessage');
    const absenceDays = currentMemberData.absenceCount || 0;
    
    if (absenceDays >= 1 && absenceDays < MAX_ABSENCE_DAYS) {
        warningDiv.style.display = 'block';
        warningDiv.innerHTML = `⚠️ أنت غائب عن القراءة منذ ${absenceDays} يوم! إذا وصلت إلى ${MAX_ABSENCE_DAYS} أيام، سيتم إخراجك من الحلقة.`;
        warningDiv.style.background = '#fef3c7';
        warningDiv.style.color = '#92400e';
    } else if (absenceDays >= MAX_ABSENCE_DAYS) {
        warningDiv.style.display = 'block';
        warningDiv.innerHTML = `🚫 تم إخراجك من الحلقة بسبب الغياب لمدة ${MAX_ABSENCE_DAYS} أيام متتالية.`;
        warningDiv.style.background = '#fee2e2';
        warningDiv.style.color = '#dc2626';
    } else {
        warningDiv.style.display = 'none';
    }
}

// ==================== دوال التحقق اليومي ====================
async function checkDaily() {
    if (!currentMemberData) return;
    
    if (!currentMemberData.lastReadDate) {
        return;
    }
    
    const today = getTodayString();
    const lastRead = safeDateString(currentMemberData.lastReadDate);
    
    if (lastRead === today) return;
    
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (lastRead !== yesterday) {
        const newAbsenceCount = (currentMemberData.absenceCount || 0) + 1;
        const memberRef = db.collection('circleMembers').doc(currentMemberId);
        await memberRef.update({ absenceCount: newAbsenceCount });
        currentMemberData.absenceCount = newAbsenceCount;
        
        if (newAbsenceCount >= MAX_ABSENCE_DAYS) {
            await kickUserFromCircle();
        } else if (newAbsenceCount === 1) {
            addNotification(currentUser.uid, "⚠️ تنبيه", `أنت غائب عن القراءة اليوم! لديك ${MAX_ABSENCE_DAYS - newAbsenceCount} أيام متبقية قبل الإخراج.`, 'warning');
            showToast(`⚠️ تنبيه: لديك ${MAX_ABSENCE_DAYS - newAbsenceCount} أيام متبقية قبل الإخراج`, true);
        }
    } else {
        if (currentMemberData.absenceCount > 0) {
            const memberRef = db.collection('circleMembers').doc(currentMemberId);
            await memberRef.update({ absenceCount: 0 });
            currentMemberData.absenceCount = 0;
        }
    }
}

async function kickUserFromCircle() {
    if (!currentMemberData) return;
    
    showToast(`🚫 تم إخراجك من الحلقة بسبب الغياب لمدة ${MAX_ABSENCE_DAYS} أيام متتالية`, true);
    addNotification(currentUser.uid, "🚫 تم إخراجك من الحلقة", `لم تقرأ وردك لمدة ${MAX_ABSENCE_DAYS} أيام متتالية، تم إخراجك من الحلقة. يرجى الانضمام إلى حلقة جديدة.`, 'warning');
    
    const availRef = db.collection('circleAvailableJuz').doc(currentCircleId);
    await db.runTransaction(async t => {
        const d = await t.get(availRef);
        const data = d.data();
        if (data) {
            const newTaken = { ...data.takenJuz };
            delete newTaken[currentMemberData.selectedJuz];
            const newAvail = [...data.availableJuz, currentMemberData.selectedJuz].sort((a, b) => a - b);
            t.update(availRef, { takenJuz: newTaken, availableJuz: newAvail });
        }
    });
    
    const circRef = db.collection('circles').doc(currentCircleId);
    const circDoc = await circRef.get();
    await circRef.update({ memberCount: (circDoc.data().memberCount || 1) - 1 });
    
    const memberRef = db.collection('circleMembers').doc(currentMemberId);
    await memberRef.update({ isActive: false, leftAt: new Date() });
    
    setTimeout(async () => {
        await auth.signOut();
        window.location.reload();
    }, 3000);
}

// ==================== دوال معلومات الحلقة ====================
async function loadCircleInfo() {
    const circ = await db.collection('circles').doc(currentCircleId).get();
    if (!circ.exists) return;
    const c = circ.data();
    const icon = c.gender === 'female' ? '👩' : c.gender === 'male' ? '👨' : '👥';
    document.getElementById('circleInfo').innerHTML = `<div class="stat-card"><h3>🔄 ${escapeHtml(c.circleName)} ${icon}</h3><p>🔑 ${c.inviteCode}</p><p>👥 ${c.memberCount || 0}/${MAX_CIRCLE_MEMBERS}</p><p>📖 جزئك: ${currentMemberData.selectedJuz}</p></div>`;
    document.getElementById('circleActions').innerHTML = `<button onclick="copyInviteCode()" style="background:#3b82f6; width:100%; padding:12px; border-radius:25px; color:white; margin-bottom:10px;">📋 نسخ الرمز</button><button onclick="leaveCircle()" style="background:#ef4444; width:100%; padding:12px; border-radius:25px; color:white;">🚪 مغادرة</button>`;
    
    const members = await db.collection('circleMembers').where('circleId', '==', currentCircleId).where('isActive', '==', true).get();
    const list = document.getElementById('circleMembersList');
    list.innerHTML = '<h4>👥 الأعضاء:</h4>';
    for (let d of members.docs) {
        const m = d.data();
        const totalParts = (m.totalPartsRead || 0) + (m.totalExtraJuz || 0);
        const readJuz = m.readJuzList || [];
        const extraReadJuz = m.extraReadJuzList || [];
        const allReadJuz = [...new Set([...readJuz, ...extraReadJuz])].sort((a, b) => a - b);
        const today = getTodayString();
        const lastRead = safeDateString(m.lastReadDate);
        const hasReadToday = lastRead === today;
        const readToday = hasReadToday && readJuz.length > 0 ? readJuz[readJuz.length - 1] : '-';
        list.innerHTML += `<div class="member-item" style="${hasReadToday ? 'border-right:4px solid #22c55e;' : 'border-right:4px solid #ef4444;'}">
            <span>${escapeHtml(m.userName)} ${m.userId === currentUser.uid ? '(أنت)' : ''}</span>
            <span>الجزء ${m.selectedJuz} | 📊 ${totalParts} جزء | ${hasReadToday ? `✅ قرأ الجزء ${readToday}` : '❌ لم يقرأ اليوم'}</span>
        </div>`;
    }
}

window.copyInviteCode = async function () { 
    const c = await db.collection('circles').doc(currentCircleId).get(); 
    await navigator.clipboard.writeText(c.data().inviteCode); 
    showToast("✅ تم نسخ الرمز"); 
};

window.leaveCircle = async function () {
    if (!confirm('⚠️ هل أنت متأكد من مغادرة الحلقة؟')) return;
    const q = await db.collection('circleMembers').where('userId', '==', currentUser.uid).where('isActive', '==', true).get();
    if (q.empty) return;
    const mem = q.docs[0], data = mem.data(), availRef = db.collection('circleAvailableJuz').doc(data.circleId);
    await db.runTransaction(async t => {
        const d = await t.get(availRef);
        const dt = d.data();
        if (dt) {
            const newTaken = { ...dt.takenJuz };
            delete newTaken[data.selectedJuz];
            const newAvail = [...dt.availableJuz, data.selectedJuz].sort((a, b) => a - b);
            t.update(availRef, { takenJuz: newTaken, availableJuz: newAvail });
        }
    });
    const circRef = db.collection('circles').doc(data.circleId);
    const circDoc = await circRef.get();
    await circRef.update({ memberCount: (circDoc.data().memberCount || 1) - 1 });
    await mem.ref.update({ isActive: false, leftAt: new Date() });
    showToast("✅ تم المغادرة");
    setTimeout(async () => { await auth.signOut(); window.location.reload(); }, 2000);
};

// ==================== دوال عرض نص الجزء ====================
async function showJuzText(juzNumber) {
    if (!juzNumber || juzNumber < 1 || juzNumber > 30) {
        showToast("رقم جزء غير صالح", true);
        return;
    }
    const viewer = document.getElementById('juzTextViewer');
    const contentDiv = document.getElementById('juzTextContent');
    const viewerJuzSpan = document.getElementById('viewerJuzNumber');

    viewerJuzSpan.innerText = juzNumber;
    contentDiv.innerHTML = '<div class="loading-indicator">📖 جاري تحميل النص...</div>';
    viewer.style.display = 'block';

    try {
        const response = await fetch(`${QURAN_API_BASE}/juz/${juzNumber}/quran-uthmani`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();

        if (result.code !== 200 || !result.data || !result.data.ayahs) {
            throw new Error('البيانات غير متاحة');
        }

        const ayahs = result.data.ayahs;
        const pagesMap = new Map();
        
        for (const ayah of ayahs) {
            const pageNum = ayah.page;
            if (!pagesMap.has(pageNum)) {
                pagesMap.set(pageNum, []);
            }
            pagesMap.get(pageNum).push(ayah);
        }
        
        const pages = Array.from(pagesMap.keys()).sort((a, b) => a - b);
        currentQuranPages = pages.map(pageNum => {
            const pageAyahs = pagesMap.get(pageNum);
            let pageHtml = `<div class="quran-page" data-page="${pageNum}"><h5>📄 الصفحة ${pageNum}</h5>`;
            for (const ayah of pageAyahs) {
                pageHtml += `<div class="ayah-with-number">
                    <span class="ayah-text">${ayah.text}</span>
                    <span class="ayah-number">${ayah.numberInSurah}</span>
                </div>`;
            }
            pageHtml += `</div>`;
            return pageHtml;
        });
        
        currentPageIndex = 0;
        updatePageDisplay();
        
        showToast(`✅ تم تحميل نص الجزء ${juzNumber} بنجاح`, false, 2000);
    } catch (error) {
        console.error('حدث خطأ في جلب نص الجزء:', error);
        contentDiv.innerHTML = `<p class="error-message">⚠️ حدث خطأ أثناء تحميل النص. الرجاء المحاولة لاحقاً.</p>`;
        showToast('فشل تحميل نص الجزء', true);
    }
}

function updatePageDisplay() {
    const contentDiv = document.getElementById('juzTextContent');
    const pageDisplay = document.getElementById('currentPageDisplay');
    if (currentQuranPages.length === 0) {
        contentDiv.innerHTML = '<p class="error-message">لا توجد صفحات لعرضها</p>';
        if(pageDisplay) pageDisplay.innerText = 'الصفحة 0 / 0';
        return;
    }
    contentDiv.innerHTML = currentQuranPages[currentPageIndex];
    if(pageDisplay) pageDisplay.innerText = `الصفحة ${currentPageIndex + 1} / ${currentQuranPages.length}`;
}

function nextPage() {
    if (currentQuranPages.length > 0 && currentPageIndex < currentQuranPages.length - 1) {
        currentPageIndex++;
        updatePageDisplay();
    } else {
        showToast("هذه آخر صفحة في الجزء", false, 1500);
    }
}

function prevPage() {
    if (currentQuranPages.length > 0 && currentPageIndex > 0) {
        currentPageIndex--;
        updatePageDisplay();
    } else {
        showToast("هذه أول صفحة في الجزء", false, 1500);
    }
}

// ==================== دوال المدير ====================
async function loadAdminData() {
    if (!isAdmin) return;
    await loadAdminCircles();
    await loadAdminUsers();
    await refreshExtraPoolStats();
    await loadSettings();
    await loadShareMessage();
}

async function loadAdminCircles() {
    const circles = await db.collection('circles').get();
    const cont = document.getElementById('circlesList');
    cont.innerHTML = '';
    for (let doc of circles.docs) {
        const c = doc.data();
        const membersSnap = await db.collection('circleMembers').get();
        let activeCount = 0;
        membersSnap.forEach(m => { if (m.data().circleId === doc.id && m.data().isActive === true) activeCount++; });
        cont.innerHTML += `<div class="admin-list-item"><div><strong>🔄 ${escapeHtml(c.circleName)} ${c.gender === 'female' ? '👩' : c.gender === 'male' ? '👨' : '👥'}</strong><br><small>🔑 ${c.inviteCode} | 👥 ${activeCount}/${MAX_CIRCLE_MEMBERS}</small><br><small>📅 تم الإنشاء: ${formatDate(c.createdAt)}</small></div><div><button onclick="editCircle('${doc.id}')" class="edit-btn">✏️</button><button onclick="deleteCircle('${doc.id}')" class="delete-btn">🗑️</button></div></div>`;
    }
}

async function loadAdminUsers() {
    const members = [];
    const snap = await db.collection('circleMembers').get();
    const today = getTodayString();
    snap.forEach(d => { if (d.data().isActive === true) members.push({ id: d.id, ...d.data() }); });
    const circleFilter = document.getElementById('filterCircle')?.value;
    const genderFilter = document.getElementById('filterGender')?.value;
    const search = document.getElementById('searchUser')?.value.toLowerCase();
    let filtered = members;
    if (circleFilter && circleFilter !== 'all') filtered = filtered.filter(m => m.circleId === circleFilter);
    if (genderFilter && genderFilter !== 'all') filtered = filtered.filter(m => m.userGender === genderFilter);
    if (search) filtered = filtered.filter(m => m.userName?.toLowerCase().includes(search) || m.userEmail?.toLowerCase().includes(search));
    filtered.sort((a, b) => ((b.totalPartsRead || 0) + (b.totalExtraJuz || 0)) - ((a.totalPartsRead || 0) + (a.totalExtraJuz || 0)));
    const cont = document.getElementById('usersList');
    cont.innerHTML = '';
    
    const readCount = filtered.filter(m => {
        const lastRead = safeDateString(m.lastReadDate);
        return lastRead === today;
    }).length;
    
    cont.innerHTML += `
        <div class="users-stats" style="display:flex; gap:15px; padding:15px; background:#f8fafc; border-radius:15px; margin-bottom:15px; flex-wrap:wrap;">
            <div style="flex:1; text-align:center;"><strong>👥 إجمالي المستخدمين</strong><br><span style="font-size:24px; color:#1a4739;">${filtered.length}</span></div>
            <div style="flex:1; text-align:center;"><strong>✅ قرأوا اليوم</strong><br><span style="font-size:24px; color:#16a34a;">${readCount}</span></div>
            <div style="flex:1; text-align:center;"><strong>❌ لم يقرأوا اليوم</strong><br><span style="font-size:24px; color:#dc2626;">${filtered.length - readCount}</span></div>
        </div>
    `;
    
    for (let m of filtered) {
        const total = (m.totalPartsRead || 0) + (m.totalExtraJuz || 0);
        const khatmas = calcKhatmasFromParts(m.totalPartsRead || 0);
        const takenJuz = m.takenJuzList || [];
        const readJuz = m.readJuzList || [];
        const extraReadJuz = m.extraReadJuzList || [];
        const allReadJuz = [...new Set([...readJuz, ...extraReadJuz])].sort((a, b) => a - b);
        const lastRead = safeDateString(m.lastReadDate);
        const hasReadToday = lastRead === today;
        const readToday = hasReadToday && readJuz.length > 0 ? readJuz[readJuz.length - 1] : '-';
        
        cont.innerHTML += `<div class="admin-list-item" style="${hasReadToday ? 'border-right:4px solid #22c55e;' : 'border-right:4px solid #ef4444;'}">
            <div>
                <strong>${escapeHtml(m.userName)}</strong>
                <span style="font-size:12px; ${hasReadToday ? 'color:#16a34a;' : 'color:#dc2626;'}">${hasReadToday ? `✅ قرأ الجزء ${readToday}` : '❌ لم يقرأ اليوم'}</span><br>
                <small>📧 ${m.userEmail || '-'} | ${m.userGender === 'female' ? '👩' : '👨'}</small><br>
                <small>📅 انضم: ${formatDate(m.joinedAt)}</small><br>
                <small>📖 جزء يوم غد: ${m.currentJuz || m.selectedJuz} | الجزء المقروء اليوم: ${readToday}</small><br>
                <small>📊 ${total} جزء | 🏆 ${khatmas} ختمة</small><br>
                <small>📦 الأجزاء المأخوذة: ${takenJuz.length > 0 ? takenJuz.join(', ') : 'لا يوجد'}</small><br>
                <small>📚 الأجزاء المقروءة: ${allReadJuz.length > 0 ? allReadJuz.join(', ') : 'لا يوجد'}</small><br>
                <small>⚠️ أيام الغياب: ${m.absenceCount || 0}</small>
            </div>
            <div>
                <button onclick="editUser('${m.id}')" class="edit-btn">✏️</button>
                <button onclick="deleteUser('${m.id}')" class="delete-btn">🗑️</button>
            </div>
        </div>`;
    }
    const circles = await db.collection('circles').get();
    const select = document.getElementById('filterCircle');
    if (select) select.innerHTML = '<option value="all">جميع الحلقات</option>' + circles.docs.map(d => `<option value="${d.id}">${escapeHtml(d.data().circleName)}</option>`).join('');
}

window.createCircle = async function () {
    const name = prompt("اسم الحلقة:", "حلقة جديدة");
    if (!name) return;
    const gender = prompt("نوع الحلقة (ذكر/أنثى/مختلط):", "مختلط");
    let g = 'mixed';
    if (gender === 'ذكر' || gender === 'male') g = 'male';
    else if (gender === 'أنثى' || gender === 'female') g = 'female';
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
        await db.collection('circles').add({ 
            circleName: name, 
            inviteCode: code, 
            gender: g, 
            createdBy: auth.currentUser?.uid, 
            createdAt: new Date(), 
            memberCount: 0 
        });
        await db.collection('circleAvailableJuz').doc().set({
            availableJuz: Array.from({ length: 30 }, (_, i) => i + 1),
            takenJuz: {},
            createdAt: new Date()
        });
        showToast("✅ تم إنشاء الحلقة");
        await loadAdminCircles();
        await loadAdminData();
    } catch (error) { console.error(error); showToast("حدث خطأ", true); }
};

window.editCircle = async function (id) {
    const c = (await db.collection('circles').doc(id).get()).data();
    const newName = prompt("الاسم الجديد:", c.circleName);
    if (newName && newName.trim()) { await db.collection('circles').doc(id).update({ circleName: newName.trim() }); await loadAdminCircles(); showToast("✅ تم التعديل"); }
};

window.deleteCircle = async function (id) {
    if (!confirm("⚠️ حذف الحلقة؟ سيتم حذف جميع الأعضاء والبيانات المرتبطة")) return;
    const members = await db.collection('circleMembers').where('circleId', '==', id).get();
    for (let m of members.docs) await m.ref.delete();
    await db.collection('circleAvailableJuz').doc(id).delete();
    await db.collection('circles').doc(id).delete();
    await loadAdminCircles(); await loadAdminData(); showToast("✅ تم الحذف");
};

window.editUser = async function (id) {
    const u = (await db.collection('circleMembers').doc(id).get()).data();
    const newName = prompt("الاسم الجديد:", u.userName);
    if (newName && newName.trim()) { await db.collection('circleMembers').doc(id).update({ userName: newName.trim() }); await loadAdminUsers(); showToast("✅ تم التعديل"); }
};

window.deleteUser = async function (id) {
    if (!confirm("⚠️ حذف المستخدم؟")) return;
    const u = (await db.collection('circleMembers').doc(id).get()).data();
    if (u) {
        const avail = db.collection('circleAvailableJuz').doc(u.circleId);
        const doc = await avail.get();
        if (doc.exists) {
            const data = doc.data();
            const newTaken = { ...data.takenJuz };
            delete newTaken[u.selectedJuz];
            const newAvail = [...data.availableJuz, u.selectedJuz].sort((a, b) => a - b);
            await avail.update({ takenJuz: newTaken, availableJuz: newAvail });
        }
    }
    await db.collection('circleMembers').doc(id).delete();
    await loadAdminUsers(); await loadAdminData(); showToast("✅ تم الحذف");
};

window.sendBroadcastNotification = async function () {
    const title = document.getElementById('notificationTitle')?.value;
    const msg = document.getElementById('notificationMessage')?.value;
    if (!title || !msg) { showToast("املأ البيانات", true); return; }
    const usersSnap = await db.collection('circleMembers').get();
    let count = 0;
    for (let d of usersSnap.docs) if (d.data().isActive === true) { await addNotification(d.data().userId, title, msg, 'broadcast'); count++; }
    showToast(`✅ تم الإرسال إلى ${count} مستخدم`);
    document.getElementById('notificationTitle').value = ''; document.getElementById('notificationMessage').value = '';
};

window.exportCirclesToExcel = function () {
    db.collection('circles').get().then(snap => {
        const data = [];
        snap.forEach(d => {
            const c = d.data();
            const membersSnap = db.collection('circleMembers').get();
            let activeCount = 0;
            membersSnap.forEach(m => { if (m.data().circleId === d.id && m.data().isActive === true) activeCount++; });
            data.push({
                'اسم الحلقة': c.circleName,
                'رمز الدعوة': c.inviteCode,
                'النوع': c.gender === 'female' ? 'نسائي' : c.gender === 'male' ? 'رجالي' : 'مختلط',
                'عدد الأعضاء': activeCount,
                'تاريخ الإنشاء': formatDate(c.createdAt)
            });
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'الحلقات');
        XLSX.writeFile(wb, `حلقات_ختمتي_${new Date().toLocaleDateString('ar')}.xlsx`);
        showToast("✅ تم تصدير بيانات الحلقات", false);
    }).catch(e => showToast("خطأ في التصدير", true));
};

// ==================== دوال إعدادات المدير ====================
async function loadSettings() {
    try {
        const settingsRef = db.collection('appSettings').doc('config');
        const doc = await settingsRef.get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('currentMaxCircleMembers').textContent = data.maxCircleMembers || 30;
            document.getElementById('currentMaxExtraPerDay').textContent = data.maxExtraPerDay || 1;
            document.getElementById('currentMaxAbsenceDays').textContent = data.maxAbsenceDays || 3;
            
            document.getElementById('maxCircleMembers').value = data.maxCircleMembers || 30;
            document.getElementById('maxExtraPerDay').value = data.maxExtraPerDay || 1;
            document.getElementById('maxAbsenceDays').value = data.maxAbsenceDays || 3;
        }
        
        const reminderHour = localStorage.getItem('reminderHour') || '20';
        document.getElementById('reminderHour').value = reminderHour;
        document.getElementById('currentReminderHour').textContent = reminderHour.padStart(2, '0') + ':00';
        
    } catch (error) {
        console.error('خطأ في تحميل الإعدادات:', error);
    }
}

async function updateSetting(settingKey) {
    const input = document.getElementById(settingKey);
    const value = parseInt(input.value);
    if (isNaN(value) || value < 1) {
        showToast('⚠️ أدخل قيمة صحيحة', true);
        return;
    }
    
    try {
        const settingsRef = db.collection('appSettings').doc('config');
        const updateData = {};
        updateData[settingKey] = value;
        updateData.updatedAt = new Date();
        await settingsRef.update(updateData);
        
        if (settingKey === 'maxCircleMembers') {
            MAX_CIRCLE_MEMBERS = value;
            localStorage.setItem('maxCircleMembers', value);
        } else if (settingKey === 'maxExtraPerDay') {
            MAX_EXTRA_JUZ_PER_DAY = value;
            localStorage.setItem('maxExtraPerDay', value);
            updateExtraLimitBadge();
        } else if (settingKey === 'maxAbsenceDays') {
            MAX_ABSENCE_DAYS = value;
            localStorage.setItem('maxAbsenceDays', value);
        }
        
        document.getElementById(`current${settingKey.charAt(0).toUpperCase() + settingKey.slice(1)}`).textContent = value;
        showToast('✅ تم تحديث الإعداد بنجاح', false);
        
    } catch (error) {
        console.error(error);
        showToast('حدث خطأ أثناء تحديث الإعداد', true);
    }
}

async function updateReminderTime() {
    const input = document.getElementById('reminderHour');
    const hour = parseInt(input.value);
    if (isNaN(hour) || hour < 0 || hour > 23) {
        showToast('⚠️ أدخل ساعة صحيحة (0-23)', true);
        return;
    }
    
    try {
        localStorage.setItem('reminderHour', hour.toString());
        document.getElementById('currentReminderHour').textContent = hour.toString().padStart(2, '0') + ':00';
        showToast('✅ تم تحديث وقت التذكير', false);
        scheduleDailyReminder();
        
    } catch (error) {
        console.error(error);
        showToast('حدث خطأ أثناء تحديث وقت التذكير', true);
    }
}

function confirmClearAllData() {
    if (!confirm('⚠️ تحذير: هذا الإجراء سيحذف جميع البيانات بما في ذلك المستخدمين والحلقات والأجزاء. هل أنت متأكد؟')) return;
    if (!confirm('⚠️ تأكيد نهائي: هل أنت متأكد تماماً من رغبتك في حذف جميع البيانات؟')) return;
    clearAllData();
}

async function clearAllData() {
    try {
        showToast('⏳ جاري مسح البيانات...', false, 5000);
        
        const usersSnap = await db.collection('circleMembers').get();
        for (const doc of usersSnap.docs) {
            await doc.ref.delete();
        }
        
        const circlesSnap = await db.collection('circles').get();
        for (const doc of circlesSnap.docs) {
            await doc.ref.delete();
        }
        
        const availSnap = await db.collection('circleAvailableJuz').get();
        for (const doc of availSnap.docs) {
            await doc.ref.delete();
        }
        
        await db.collection('globalExtraJuz').doc('globalPool').delete();
        
        const notifSnap = await db.collection('notifications').get();
        for (const doc of notifSnap.docs) {
            await doc.ref.delete();
        }
        
        const settingsRef = db.collection('appSettings').doc('config');
        await settingsRef.set({
            maxExtraPerDay: 1,
            maxCircleMembers: 30,
            maxAbsenceDays: 3,
            updatedAt: new Date()
        });
        
        MAX_CIRCLE_MEMBERS = 30;
        MAX_EXTRA_JUZ_PER_DAY = 1;
        MAX_ABSENCE_DAYS = 3;
        
        showToast('✅ تم مسح جميع البيانات بنجاح', false);
        await loadSettings();
        await loadAdminData();
        
    } catch (error) {
        console.error(error);
        showToast('حدث خطأ أثناء مسح البيانات', true);
    }
}

async function resetAllSettings() {
    if (!confirm('⚠️ هل أنت متأكد من إعادة ضبط جميع الإعدادات إلى القيم الافتراضية؟')) return;
    
    try {
        const settingsRef = db.collection('appSettings').doc('config');
        await settingsRef.set({
            maxExtraPerDay: 1,
            maxCircleMembers: 30,
            maxAbsenceDays: 3,
            updatedAt: new Date()
        });
        
        MAX_CIRCLE_MEMBERS = 30;
        MAX_EXTRA_JUZ_PER_DAY = 1;
        MAX_ABSENCE_DAYS = 3;
        
        localStorage.removeItem('reminderHour');
        localStorage.removeItem('maxCircleMembers');
        localStorage.removeItem('maxExtraPerDay');
        localStorage.removeItem('maxAbsenceDays');
        
        await loadSettings();
        updateExtraLimitBadge();
        showToast('✅ تم إعادة ضبط الإعدادات', false);
        
    } catch (error) {
        console.error(error);
        showToast('حدث خطأ أثناء إعادة الضبط', true);
    }
}

// ==================== أحداث النماذج ====================
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regName').value.trim(), email = document.getElementById('regEmail').value.trim(), gender = document.getElementById('regGender').value, pass = document.getElementById('regPassword').value, confirm = document.getElementById('regConfirmPassword').value;
    if (pass !== confirm) { showMessage('authMessage', 'كلمة السر غير متطابقة'); return; }
    if (pass.length < 6) { showMessage('authMessage', '6 أحرف على الأقل'); return; }
    if (username.length < 3) { showMessage('authMessage', 'اسم المستخدم 3 أحرف'); return; }
    if (!email.includes('@')) { showMessage('authMessage', 'بريد غير صحيح'); return; }
    if (!gender) { showMessage('authMessage', 'اختر الجنس'); return; }
    const avail = await checkUsername(username);
    if (!avail) { showMessage('authMessage', 'اسم المستخدم غير متاح'); return; }
    const btn = document.getElementById('registerBtn'), orig = btn.textContent;
    btn.textContent = '⏳ جاري...'; btn.disabled = true;
    try {
        const uc = await auth.createUserWithEmailAndPassword(email, pass);
        await uc.user.updateProfile({ displayName: username });
        await uc.user.sendEmailVerification();
        await db.collection('users').doc(uc.user.uid).set({ name: username, username, email, gender, role: 'user', createdAt: new Date() });
        showMessage('authMessage', '✅ تم التسجيل، يرجى تفعيل بريدك الإلكتروني', false);
        await auth.signOut();
    } catch (err) { let msg = 'حدث خطأ'; if (err.code === 'auth/email-already-in-use') msg = 'البريد مستخدم'; if (err.code === 'auth/weak-password') msg = 'كلمة سر ضعيفة'; showMessage('authMessage', msg); }
    finally { btn.textContent = orig; btn.disabled = false; }
});

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('loginUsername').value.trim(), pass = document.getElementById('loginPassword').value, btn = e.target.querySelector('button'), orig = btn.textContent;
    btn.textContent = '⏳ جاري...'; btn.disabled = true;
    try {
        const uc = await loginWithUsernameOrEmail(id, pass);
        currentUser = uc.user;
        const isAd = await checkIfAdmin(currentUser);
        if (isAd) { await loadAdminData(); showScreen('adminScreen'); }
        else { await initFCM(); await loadUserData(); }
    } catch (err) { showMessage('authMessage', 'اسم المستخدم أو كلمة السر غير صحيحة'); }
    finally { btn.textContent = orig; btn.disabled = false; }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => auth.signOut());
document.getElementById('adminLogoutBtn')?.addEventListener('click', () => auth.signOut());
document.getElementById('adminPanelBtn')?.addEventListener('click', async () => { await loadAdminData(); showScreen('adminScreen'); });
document.getElementById('backToUserBtn')?.addEventListener('click', () => showScreen('mainScreen'));
document.getElementById('completeDailyJuzBtn')?.addEventListener('click', completeDaily);
document.getElementById('createCircleBtn')?.addEventListener('click', createCircle);
document.getElementById('joinByCodeDirectBtn')?.addEventListener('click', joinCircleByCode);
document.getElementById('refreshCirclesBtn')?.addEventListener('click', refreshCircles);
document.getElementById('exitToAuthBtn')?.addEventListener('click', exitToAuth);
document.getElementById('filterCircle')?.addEventListener('change', () => loadAdminUsers());
document.getElementById('filterGender')?.addEventListener('change', () => loadAdminUsers());
document.getElementById('searchUser')?.addEventListener('input', () => loadAdminUsers());
document.getElementById('addExtraJuzBtn')?.addEventListener('click', showExtraJuzModal);
document.getElementById('refillExtraPoolBtn')?.addEventListener('click', refillGlobalExtraJuz);
document.getElementById('googleFullBtn')?.addEventListener('click', handleGoogleSignIn);
document.getElementById('viewJuzTextBtn')?.addEventListener('click', () => {
    const curJuz = currentMemberData?.currentJuz || 1;
    showJuzText(curJuz);
});
document.getElementById('closeTextViewer')?.addEventListener('click', () => {
    document.getElementById('juzTextViewer').style.display = 'none';
});
document.getElementById('prevPageBtn')?.addEventListener('click', prevPage);
document.getElementById('nextPageBtn')?.addEventListener('click', nextPage);

// ===== أحداث الاستماع والمشاركة =====
document.getElementById('listenJuzBtn')?.addEventListener('click', function() {
    const readJuz = currentMemberData?.readJuzList || [];
    const today = getTodayString();
    const lastRead = safeDateString(currentMemberData?.lastReadDate);
    const hasReadToday = lastRead === today;
    const juzNum = hasReadToday && readJuz.length > 0 ? readJuz[readJuz.length - 1] : (currentMemberData?.currentJuz || currentMemberData?.selectedJuz || 1);
    openAudioPlayer(juzNum);
});

document.getElementById('shareJuzBtn')?.addEventListener('click', openShareModal);

document.getElementById('backToCirclesBtn')?.addEventListener('click', function() {
    if (pendingUserData) {
        showAvailableCircles(pendingUserData);
    } else {
        showScreen('selectCircleScreen');
    }
});

document.getElementById('enableNotificationsBtn')?.addEventListener('click', enableNotifications);
document.getElementById('dismissNotificationsBtn')?.addEventListener('click', function() {
    document.getElementById('notificationPermissionModal').style.display = 'none';
});

// أحداث فلتر الحلقات
document.getElementById('filterAllCircles')?.addEventListener('click', function() {
    document.querySelectorAll('.filter-gender-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    if (pendingUserData) showAvailableCircles(pendingUserData);
});

document.getElementById('filterFemaleCircles')?.addEventListener('click', function() {
    document.querySelectorAll('.filter-gender-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    if (pendingUserData) {
        const circles = JSON.parse(localStorage.getItem('cache_circles') || '[]');
        const filtered = circles.filter(c => c.gender === 'female' || c.gender === 'mixed');
        filterCirclesUI(filtered);
    }
});

document.getElementById('filterMaleCircles')?.addEventListener('click', function() {
    document.querySelectorAll('.filter-gender-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    if (pendingUserData) {
        const circles = JSON.parse(localStorage.getItem('cache_circles') || '[]');
        const filtered = circles.filter(c => c.gender === 'male' || c.gender === 'mixed');
        filterCirclesUI(filtered);
    }
});

// تعديل اسم المستخدم
document.getElementById('editUserNameBtn')?.addEventListener('click', function() {
    const modal = document.getElementById('editNameModal');
    const input = document.getElementById('newUserName');
    input.value = currentMemberData?.userName || '';
    modal.style.display = 'flex';
});

document.getElementById('confirmEditNameBtn')?.addEventListener('click', async function() {
    const input = document.getElementById('newUserName');
    const newName = input.value.trim();
    
    if (!newName || newName.length < 3) {
        showToast('⚠️ اسم المستخدم يجب أن يكون 3 أحرف على الأقل', true);
        return;
    }
    
    if (newName === currentMemberData?.userName) {
        document.getElementById('editNameModal').style.display = 'none';
        return;
    }
    
    const available = await checkEditUsername(newName);
    if (!available) {
        showToast('❌ هذا الاسم مستخدم', true);
        return;
    }
    
    await updateUserName(newName);
    document.getElementById('editNameModal').style.display = 'none';
});

// حفظ رسالة المشاركة
document.getElementById('shareMessageText')?.addEventListener('input', updateSharePreview);

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installPwaBtn');
    if (installBtn) installBtn.style.display = 'inline-flex';
});

document.getElementById('installPwaBtn')?.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            const installBtn = document.getElementById('installPwaBtn');
            if (installBtn) installBtn.style.display = 'none';
        }
        deferredPrompt = null;
    }
});

document.querySelectorAll('.close-modal, .close').forEach(btn => {
    btn.addEventListener('click', () => { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); });
});

const resetModal = document.getElementById('resetModal');
document.getElementById('forgotPasswordLink')?.addEventListener('click', e => { e.preventDefault(); if (resetModal) resetModal.style.display = 'flex'; });

document.getElementById('sendResetBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('resetEmail').value.trim(), msg = document.getElementById('resetMessage');
    if (!email) { if (msg) msg.innerHTML = '⚠️ أدخل البريد'; return; }
    if (email === ADMIN_EMAIL) { if (msg) msg.innerHTML = '🔐 كلمة المدير: Admin@123456'; return; }
    try { await auth.sendPasswordResetEmail(email); if (msg) { msg.innerHTML = '✅ تم الإرسال'; msg.style.color = '#16a34a'; } setTimeout(() => { if (resetModal) resetModal.style.display = 'none'; }, 3000); } catch (e) { if (msg) { msg.innerHTML = '❌ البريد غير موجود'; msg.style.color = '#dc2626'; } }
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        document.getElementById(`${tab}Form`).classList.add('active');
    });
});

document.querySelectorAll('.main-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.main-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`${tab}Tab`).classList.add('active');
        if (tab === 'achievements') loadAchievements();
    });
});

document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.adminTab;
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`).classList.add('active');
        const sel = document.getElementById('adminTabSelect');
        if (sel) sel.value = tab;
        if (tab === 'extraPool') refreshExtraPoolStats();
        if (tab === 'settings') loadSettings();
        if (tab === 'shareMessage') loadShareMessage();
        if (tab === 'users') loadAdminUsers();
        if (tab === 'circles') loadAdminCircles();
    });
});

const adminSel = document.getElementById('adminTabSelect');
if (adminSel) {
    adminSel.addEventListener('change', e => {
        const tab = e.target.value;
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`).classList.add('active');
        const matching = document.querySelector(`.admin-tab-btn[data-admin-tab="${tab}"]`);
        if (matching) matching.classList.add('active');
        if (tab === 'extraPool') refreshExtraPoolStats();
        if (tab === 'settings') loadSettings();
        if (tab === 'shareMessage') loadShareMessage();
        if (tab === 'users') loadAdminUsers();
        if (tab === 'circles') loadAdminCircles();
    });
}

window.onclick = function (e) { document.querySelectorAll('.modal').forEach(m => { if (e.target === m) m.style.display = 'none'; }); };

// ==================== دوال مساعدة إضافية ====================
async function getCachedOrFetch(key, fetchFn, ttl = CACHE_TTL) {
    const cached = localStorage.getItem(`cache_${key}`);
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < ttl) return data;
    }
    const fresh = await fetchFn();
    localStorage.setItem(`cache_${key}`, JSON.stringify({ data: fresh, timestamp: Date.now() }));
    return fresh;
}

// ==================== تهيئة الإعدادات ====================
document.addEventListener('DOMContentLoaded', async () => {
    await initializeAppSettings();
    initDarkMode();
    initFontSize();
    document.getElementById('darkModeToggleCircle')?.addEventListener('click', toggleDarkMode);
    document.getElementById('darkModeToggleMain')?.addEventListener('click', toggleDarkMode);
    document.getElementById('darkModeToggleAdmin')?.addEventListener('click', toggleDarkMode);
    document.getElementById('fontSizeBtn')?.addEventListener('click', showFontSizeModal);
    
    document.querySelectorAll('#fontSizeModal .font-size-options button').forEach(btn => {
        btn.addEventListener('click', () => {
            setFontSize(btn.dataset.size);
            document.getElementById('fontSizeModal').style.display = 'none';
        });
    });
    document.getElementById('searchCircleInput')?.addEventListener('input', () => { if (pendingUserData) showAvailableCircles(pendingUserData); });
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => console.log('SW registered', reg)).catch(err => console.error('SW error', err));
    }
});

(async function init() {
    try { await ensureAdminExists(); await initializeGlobalExtraJuz(); await initializeAppSettings(); } catch (e) { console.error(e); }
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            const isAd = await checkIfAdmin(user);
            if (isAd) { await loadAdminData(); showScreen('adminScreen'); }
            else { await initFCM(); await loadUserData(); }
        } else { showScreen('authScreen'); }
    });
})();

// ==================== تصدير الدوال للاستخدام في HTML ====================
window.exportUsersFullCSV = exportUsersFullCSV;
window.exportUsersFullExcel = exportUsersFullExcel;
window.exportUsersSimpleCSV = exportUsersSimpleCSV;
window.exportUsersFullPDF = exportUsersFullPDF;
window.exportUsersAsImage = exportUsersAsImage;
window.exportActiveUsersToWhatsApp = exportActiveUsersToWhatsApp;
window.exportInactiveUsersToWhatsApp = exportInactiveUsersToWhatsApp;
window.generateFullReport = generateFullReport;
window.exportReportToExcel = exportReportToExcel;
window.downloadReportAsPDF = downloadReportAsPDF;
window.exportCirclesToExcel = exportCirclesToExcel;
window.completeExtraJuz = completeExtraJuz;
window.createCircle = createCircle;
window.editCircle = editCircle;
window.deleteCircle = deleteCircle;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.joinCircleByCode = joinCircleByCode;
window.selectCircle = selectCircle;
window.refreshCircles = refreshCircles;
window.exitToAuth = exitToAuth;
window.leaveCircle = leaveCircle;
window.goBackToCircles = goBackToCircles;
window.updateSetting = updateSetting;
window.updateReminderTime = updateReminderTime;
window.confirmClearAllData = confirmClearAllData;
window.resetAllSettings = resetAllSettings;
window.copyInviteCode = copyInviteCode;
window.openAudioPlayer = openAudioPlayer;
window.stopAudioPlayback = stopAudioPlayback;
window.openShareModal = openShareModal;
window.shareToWhatsApp = shareToWhatsApp;
window.shareToTelegram = shareToTelegram;
window.shareToTwitter = shareToTwitter;
window.copyShareText = copyShareText;
window.saveShareMessage = saveShareMessage;
window.loadShareMessage = loadShareMessage;
window.showJuzText = showJuzText;
window.enableNotifications = enableNotifications;

console.log('✅ تم تحميل تطبيق ختمتي بنجاح!');