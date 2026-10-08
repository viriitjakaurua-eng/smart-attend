let timerInterval=null;

document.addEventListener("DOMContentLoaded",()=>{
  const user=requireAuth(["lecturer","admin","developer"]);
  if(!user) return;

  document.getElementById("topUserName").textContent=user.name;
  document.getElementById("roleLabel").textContent=user.role.toUpperCase();

  populateSelectors();
  renderAll();
  document.getElementById("sessionForm").addEventListener("submit",handleSession);
  document.getElementById("manualAttendanceForm").addEventListener("submit",handleManualAttendance);
  document.getElementById("copySessionCode").addEventListener("click",copySessionCode);
  document.getElementById("exportCsv").addEventListener("click",exportAttendanceCsv);
  document.getElementById("clearAttendance").addEventListener("click",clearAttendance);
  document.getElementById("resetDemo").addEventListener("click",resetDemo);

  if(user.role!=="developer" && user.role!=="admin"){
    document.getElementById("developerPanel").querySelector("h2").textContent="System information";
  }
});

function populateSelectors(){
  const db=getDB();
  document.getElementById("moduleSelect").innerHTML=db.modules.map(m=>`<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("");
  document.getElementById("manualModule").innerHTML=db.modules.map(m=>`<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("");
  document.getElementById("manualStudent").innerHTML=db.students.map(s=>`<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)} — ${escapeHtml(s.id)}</option>`).join("");
}
function handleSession(e){
  e.preventDefault();
  const user=getCurrentUser();
  const module=document.getElementById("moduleSelect").value;
  const duration=Number(document.getElementById("durationSelect").value);
  const session=createSession(module,duration,user.id);
  showQr(session);
  renderAll();
  showToast(`Temporary QR generated for ${module}.`,"success");
}
function showQr(session){
  const box=document.getElementById("activeQrBox");
  box.classList.remove("hidden");
  document.getElementById("sessionQr").innerHTML="";
  const qr=document.getElementById("sessionQr");
  const payload=makeQrPayload(session);
  if(typeof QRCode!=="undefined"){
    new QRCode(qr,{text:payload,width:230,height:230,colorDark:"#292735",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.H});
  }else{
    const img=document.createElement("img");
    img.alt="Smart Attend class QR"; img.width=230; img.height=230;
    img.src="https://api.qrserver.com/v1/create-qr-code/?size=230x230&data="+encodeURIComponent(payload);
    qr.appendChild(img);
    showToast("QR library unavailable; loading online QR fallback.","error");
  }
  document.getElementById("sessionModuleName").textContent=session.module;
  document.getElementById("sessionCode").textContent=session.sessionCode || "Legacy session";
  document.getElementById("copySessionCode").dataset.code=session.sessionCode || "";
  updateTimer(session);
  clearInterval(timerInterval);
  timerInterval=setInterval(()=>updateTimer(session),1000);
}
function copySessionCode(){
  const code=document.getElementById("copySessionCode").dataset.code;
  if(!code){showToast("No active session code available.","error");return;}
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(code).then(()=>showToast(`Session code ${code} copied.`,"success"));
  }else{
    const input=document.createElement("input");input.value=code;document.body.appendChild(input);input.select();
    try{document.execCommand("copy");showToast(`Session code ${code} copied.`,"success");}
    catch(e){showToast(`Session code: ${code}`,"success");}
    input.remove();
  }
}

function updateTimer(session){
  const remaining=Math.max(0,session.expiresAt-Date.now());
  const sec=Math.floor(remaining/1000);
  const min=Math.floor(sec/60), seconds=sec%60;
  const el=document.getElementById("sessionTimer");
  if(!el) return;
  el.textContent=remaining>0 ? `Expires in ${min}:${String(seconds).padStart(2,"0")}` : "EXPIRED";
  if(remaining<=0){clearInterval(timerInterval);el.style.color="#dc3545";}
}
function handleManualAttendance(e){
  e.preventDefault();
  const result=recordManualAttendance(
    document.getElementById("manualStudent").value,
    document.getElementById("manualModule").value
  );
  showToast(result.message,result.ok?"success":"error");
  renderAll();
}
function renderAll(){
  const db=getDB();
  document.getElementById("studentStat").textContent=db.students.length;
  document.getElementById("moduleStat").textContent=db.modules.length;
  document.getElementById("attendanceStat").textContent=db.attendance.length;
  document.getElementById("sessionStat").textContent=db.sessions.filter(s=>Date.now()<s.expiresAt).length;

  document.getElementById("studentTable").innerHTML=db.students.map(s=>`
    <tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.id)}</td><td>${escapeHtml(s.programme)}</td><td>${s.lastLoginDate===todayKey() ? "Logged in today" : "Not logged in today"}</td></tr>
  `).join("");

  const rows=[...db.attendance].sort((a,b)=>new Date(b.date)-new Date(a.date));
  document.getElementById("attendanceTable").innerHTML=rows.length ? rows.map(a=>`
    <tr>
      <td>${escapeHtml(formatDate(a.date))}</td>
      <td>${escapeHtml(formatTime(a.date))}</td>
      <td>${escapeHtml(a.studentName)}</td>
      <td>${escapeHtml(a.studentNo)}</td>
      <td>${escapeHtml(a.module)}</td>
      <td>${escapeHtml(a.method)}</td>
    </tr>`).join("") : `<tr><td colspan="6">No attendance records yet.</td></tr>`;
}
function exportAttendanceCsv(){
  const db=getDB();
  const header=["Date","Time","Student Name","Student No.","Module","Method","Status"];
  const lines=[header,...db.attendance.map(a=>[
    formatDate(a.date),formatTime(a.date),a.studentName,a.studentNo,a.module,a.method,a.status
  ])];
  const csv=lines.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  downloadText(`Smart-Attend-Attendance-${todayKey()}.csv`,csv);
  showToast("CSV report exported.","success");
}
function clearAttendance(){
  if(!confirm("Clear ALL attendance records from this browser?")) return;
  const db=getDB();db.attendance=[];saveDB(db);renderAll();showToast("Attendance records cleared.","success");
}
function resetDemo(){
  if(!confirm("Reset the entire prototype database to the original demo students and users?")) return;
  resetDB();populateSelectors();renderAll();showToast("Demo database reset.","success");
}
