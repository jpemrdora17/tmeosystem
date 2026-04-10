/* enforcer.js — Enforcer Dashboard Logic */
let currentSession = null;
let cameraStream   = null;
let gpsWatchId     = null;
let currentCoords  = null;

document.addEventListener('DOMContentLoaded', () => {
  currentSession = requireAuth('Enforcer');
  if (!currentSession) return;
  populateTopbarUser(currentSession);
  showPage('dashboard');
  seedDefaultAccounts();
});

function showPage(pageId) {
  document.querySelectorAll('.page-section').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) page.style.display = 'block';
  const nav = document.querySelector(`[data-page="${pageId}"]`);
  if (nav) nav.classList.add('active');
  switch (pageId) {
    case 'dashboard':     loadEnforcerDashboard(); break;
    case 'camera':        loadCapturedPhotos();     break;
    case 'gps':           /* GPS auto-starts when user clicks button */ break;
    case 'submit':        initSubmitForm();         break;
    case 'my-violations': loadMyViolations();       break;
  }
  closeSidebar();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

/* ===== DASHBOARD ===== */
function loadEnforcerDashboard() {
  const violations = Storage.getViolations();
  const today = todayStr();
  const mine  = violations.filter(v => v.enforcer === currentSession.id);
  const today_mine = mine.filter(v => v.date === today);

  document.getElementById('enforcerDashStats').innerHTML = `
    <div class="stat-card"><div class="stat-card-top"><div><div class="stat-card-label">My Total Reports</div></div><div class="stat-card-icon icon-blue">📋</div></div><div class="stat-card-value">${mine.length}</div></div>
    <div class="stat-card"><div class="stat-card-top"><div><div class="stat-card-label">Today's Reports</div></div><div class="stat-card-icon icon-red">📝</div></div><div class="stat-card-value">${today_mine.length}</div></div>
    <div class="stat-card"><div class="stat-card-top"><div><div class="stat-card-label">Pending</div></div><div class="stat-card-icon icon-yellow">⏳</div></div><div class="stat-card-value">${mine.filter(v=>v.status==='Pending').length}</div></div>
    <div class="stat-card"><div class="stat-card-top"><div><div class="stat-card-label">Approved</div></div><div class="stat-card-icon icon-green">✅</div></div><div class="stat-card-value">${mine.filter(v=>v.status==='Approved').length}</div></div>
  `;

  const tbody = document.getElementById('enforcerTodayBody');
  tbody.innerHTML = today_mine.length ? today_mine.reverse().map(v => `
    <tr>
      <td style="font-weight:600;color:var(--primary);">${v.id}</td>
      <td>${v.violatorName}</td>
      <td>${v.plateNumber}</td>
      <td>${v.violationType}</td>
      <td>${v.time}</td>
      <td><span class="badge ${v.status==='Pending'?'badge-warning':v.status==='Approved'?'badge-info':'badge-success'}">${v.status}</span></td>
    </tr>
  `).join('') : `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-light);">No reports today yet.</td></tr>`;
}

/* ===== CAMERA ===== */
async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    const video = document.getElementById('cameraPreview');
    video.srcObject = cameraStream;
    document.getElementById('captureBtn').disabled = false;
    document.getElementById('cameraStatus').textContent = '✅ Camera active – press Capture to take a photo.';
    document.getElementById('cameraStatus').style.color = 'var(--success)';
  } catch (err) {
    document.getElementById('cameraStatus').textContent = '❌ Camera access denied or not available. Please allow camera permission.';
    document.getElementById('cameraStatus').style.color = 'var(--danger)';
  }
}

function capturePhoto() {
  const video  = document.getElementById('cameraPreview');
  const canvas = document.getElementById('captureCanvas');
  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

  // Save to localStorage
  const capture = {
    id: 'CAP-' + Date.now(),
    dataUrl,
    timestamp: new Date().toISOString(),
    enforcerId: currentSession.id
  };
  Storage.addCapture(capture);
  loadCapturedPhotos();
  showToast('Photo captured and saved!', 'success');
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
    document.getElementById('cameraPreview').srcObject = null;
    document.getElementById('captureBtn').disabled = true;
    document.getElementById('cameraStatus').textContent = 'Camera stopped.';
    document.getElementById('cameraStatus').style.color = 'var(--text-light)';
  }
}

function loadCapturedPhotos() {
  const captures = Storage.getCaptures().filter(c => c.enforcerId === currentSession.id);
  const container = document.getElementById('capturedPhotos');
  if (!captures.length) {
    container.innerHTML = '<div style="color:var(--text-light);font-size:13px;">No photos captured yet.</div>';
    return;
  }
  container.innerHTML = captures.reverse().slice(0, 20).map(c => `
    <div style="position:relative;">
      <img src="${c.dataUrl}" class="capture-thumb" title="${new Date(c.timestamp).toLocaleString()}" onclick="viewCaptureFullscreen('${c.id}')"/>
      <div style="font-size:10px;color:var(--text-light);text-align:center;margin-top:3px;">${new Date(c.timestamp).toLocaleTimeString()}</div>
    </div>
  `).join('');
}

function viewCaptureFullscreen(id) {
  const capture = Storage.getCaptures().find(c => c.id === id);
  if (!capture) return;
  const w = window.open('');
  w.document.write(`<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh;">
    <img src="${capture.dataUrl}" style="max-width:100%;max-height:100vh;"/>
  </body></html>`);
}

/* ===== GPS ===== */
function startGPS() {
  if (!navigator.geolocation) {
    document.getElementById('gpsStatus').textContent = '❌ Geolocation not supported on this device.';
    return;
  }
  document.getElementById('gpsStatus').textContent = '📡 Acquiring GPS signal...';

  gpsWatchId = navigator.geolocation.watchPosition(
    (position) => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      const acc = Math.round(position.coords.accuracy) + 'm';

      currentCoords = { lat, lng };

      document.getElementById('gpsLat').textContent = lat;
      document.getElementById('gpsLng').textContent = lng;
      document.getElementById('gpsAcc').textContent = acc;
      document.getElementById('gpsStatus').textContent = '✅ GPS tracking active.';
      document.getElementById('gpsStatus').style.color = 'var(--success)';
      document.getElementById('gpsAddress').innerHTML = `📍 Coordinates: ${lat}, ${lng} (±${acc}) — Lucena City area`;
      document.getElementById('mapCoordsLabel').textContent = `Lat: ${lat} | Lng: ${lng}`;

      // Store coordinates for submit form
      localStorage.setItem('tmeo_last_coords', JSON.stringify({ lat, lng }));
    },
    (err) => {
      document.getElementById('gpsStatus').textContent = `❌ GPS Error: ${err.message}`;
      document.getElementById('gpsStatus').style.color = 'var(--danger)';
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
  );
}

function stopGPS() {
  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
    document.getElementById('gpsStatus').textContent = 'GPS tracking stopped.';
    document.getElementById('gpsStatus').style.color = 'var(--text-light)';
  }
}

function useGPSLocation() {
  const coords = JSON.parse(localStorage.getItem('tmeo_last_coords') || 'null');
  if (coords) {
    document.getElementById('srLocation').value = `Lucena City (${coords.lat}, ${coords.lng})`;
    showToast('GPS location applied!', 'success');
  } else {
    showToast('No GPS coordinates yet. Go to GPS Tracking first.', 'error');
  }
}

/* ===== SUBMIT REPORT ===== */
function initSubmitForm() {
  const types = Storage.getViolationTypes();
  const typeEl = document.getElementById('srType');
  typeEl.innerHTML = types.map(t =>
    `<option value="${t.name}" data-penalty="${t.penalty}">${t.name} – ₱${t.penalty}</option>`
  ).join('');
  srAutoFillPenalty();

  document.getElementById('srDate').value = todayStr();
  document.getElementById('srTime').value = currentTime();

  // Show recent captures as selectable evidence
  const captures = Storage.getCaptures().filter(c => c.enforcerId === currentSession.id);
  const photoList = document.getElementById('srPhotoList');
  photoList.innerHTML = captures.slice(-5).reverse().map(c => `
    <img src="${c.dataUrl}" class="capture-thumb" title="${new Date(c.timestamp).toLocaleString()}" style="cursor:pointer;opacity:0.7;" onclick="toggleEvidencePhoto(this,'${c.id}')"/>
  `).join('') || '<span style="font-size:12px;color:var(--text-light);">No photos captured yet.</span>';
}

function toggleEvidencePhoto(el, id) {
  el.style.opacity = el.style.opacity === '1' ? '0.7' : '1';
  el.style.border  = el.style.opacity === '1' ? '2px solid var(--primary)' : '2px solid #e2e8f0';
}

function srAutoFillPenalty() {
  const typeEl = document.getElementById('srType');
  if (!typeEl) return;
  const penalty = typeEl.selectedOptions[0]?.dataset.penalty || '';
  document.getElementById('srPenalty').value = penalty;
}

function submitReport() {
  const name    = document.getElementById('srName').value.trim();
  const license = document.getElementById('srLicense').value.trim();
  const plate   = document.getElementById('srPlate').value.trim();
  const vehicle = document.getElementById('srVehicle').value;
  const type    = document.getElementById('srType').value;
  const penalty = parseFloat(document.getElementById('srPenalty').value) || 0;
  const date    = document.getElementById('srDate').value;
  const time    = document.getElementById('srTime').value;
  const location= document.getElementById('srLocation').value.trim();
  const notes   = document.getElementById('srNotes').value.trim();
  const errorEl = document.getElementById('submitError');

  errorEl.style.display = 'none';

  if (!name || !license || !plate || !location) {
    errorEl.textContent = 'Please fill in all required fields (*).';
    errorEl.style.display = 'block';
    return;
  }

  const violation = {
    id: generateViolationId(),
    violatorName: name,
    licenseNo: license,
    plateNumber: plate,
    vehicleType: vehicle,
    violationType: type,
    penalty,
    date, time, location, notes,
    enforcer: currentSession.id,
    enforcerName: currentSession.name,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  Storage.addViolation(violation);
  showToast('Violation report submitted successfully!', 'success');
  clearSubmitForm();

  // Simulate notification
  console.log('[REPORT SUBMITTED]', violation);
  setTimeout(() => {
    if (confirm('✅ Report submitted!\n\nWould you like to view your submitted reports?')) {
      showPage('my-violations');
    }
  }, 500);
}

function clearSubmitForm() {
  ['srName','srLicense','srPlate','srLocation','srNotes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('srDate').value = todayStr();
  document.getElementById('srTime').value = currentTime();
  document.getElementById('submitError').style.display = 'none';
  srAutoFillPenalty();
}

/* ===== MY VIOLATIONS ===== */
function loadMyViolations() {
  const violations = Storage.getViolations().filter(v => v.enforcer === currentSession.id);
  const tbody = document.getElementById('myViolationsBody');
  tbody.innerHTML = violations.length ? violations.reverse().map(v => `
    <tr>
      <td style="font-weight:600;color:var(--primary);">${v.id}</td>
      <td>${v.violatorName}</td>
      <td>${v.plateNumber}</td>
      <td>${v.violationType}</td>
      <td>${v.date}</td>
      <td><span class="badge ${v.status==='Pending'?'badge-warning':v.status==='Approved'?'badge-info':'badge-success'}">${v.status}</span></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="printMyReceipt('${v.id}')">🖨 Receipt</button>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-light);">No reports submitted yet.</td></tr>`;
}

function printMyReceipt(id) {
  const v = Storage.getViolationById(id);
  if (!v) return;
  const w = window.open('', '_blank');
  w.document.write(`
    <!DOCTYPE html><html><head><title>Receipt ${v.id}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;padding:32px;max-width:580px;margin:auto;}.header{text-align:center;border-bottom:2px solid #1a1a2e;padding-bottom:16px;margin-bottom:20px;}h1{font-size:15px;font-weight:700;color:#1a1a2e;}h2{font-size:12px;color:#555;margin-top:4px;}.receipt-id{font-size:20px;font-weight:900;color:#2d4a8a;margin:10px 0;}.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eee;font-size:13px;}.label{color:#666;font-weight:600;}.val{font-weight:700;}.penalty{background:#fff8e1;padding:14px;border-radius:8px;text-align:center;margin:14px 0;}.p-amount{font-size:26px;font-weight:900;color:#d97706;}.footer{text-align:center;margin-top:20px;font-size:11px;color:#aaa;border-top:1px dashed #ddd;padding-top:14px;}</style>
    </head><body>
    <div class="header"><div style="font-size:36px;margin-bottom:8px;">🚦</div>
    <h1>Traffic Management & Enforcement Office</h1><h2>Lucena City — Official E-Receipt</h2>
    <div class="receipt-id">${v.id}</div></div>
    <div class="row"><span class="label">Violator</span><span class="val">${v.violatorName}</span></div>
    <div class="row"><span class="label">License No.</span><span class="val">${v.licenseNo}</span></div>
    <div class="row"><span class="label">Plate Number</span><span class="val">${v.plateNumber}</span></div>
    <div class="row"><span class="label">Vehicle</span><span class="val">${v.vehicleType}</span></div>
    <div class="row"><span class="label">Violation</span><span class="val">${v.violationType}</span></div>
    <div class="row"><span class="label">Date & Time</span><span class="val">${v.date} ${v.time}</span></div>
    <div class="row"><span class="label">Location</span><span class="val">${v.location}</span></div>
    <div class="row"><span class="label">Enforcer</span><span class="val">${v.enforcerName}</span></div>
    <div class="penalty"><div style="font-size:11px;color:#888;margin-bottom:4px;">PENALTY AMOUNT</div>
    <div class="p-amount">₱${parseFloat(v.penalty||0).toLocaleString('en-PH',{minimumFractionDigits:2})}</div></div>
    <div class="footer">Official receipt – TMEO Lucena City | Issued: ${new Date().toLocaleDateString('en-PH')}</div>
    <script>window.print();<\/script></body></html>
  `);
  w.document.close();
}

/* ===== UTILITIES ===== */
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
