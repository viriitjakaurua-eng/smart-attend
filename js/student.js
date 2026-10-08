let scanner=null;
let scannerRunning=false;

document.addEventListener("DOMContentLoaded",()=>{
  const user=requireAuth(["student"]);
  if(!user) return;

  const db=getDB();
  document.getElementById("topUserName").textContent=user.name;
  document.getElementById("studentFirstName").textContent=user.name.split(" ")[0];
  document.getElementById("studentMeta").textContent=`${user.id} • NQF L6 Advanced Diploma in IT`;

  const qrContainer=document.getElementById("personalQr");
  qrContainer.innerHTML="";
  const personalPayload=JSON.stringify({type:"SMART_ATTEND_STUDENT",studentId:user.id});
  if(typeof QRCode!=="undefined"){
    new QRCode(qrContainer,{text:personalPayload,width:210,height:210,colorDark:"#292735",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.H});
  }else{
    const img=document.createElement("img");img.alt="Personal student QR";img.width=210;img.height=210;img.src="https://api.qrserver.com/v1/create-qr-code/?size=210x210&data="+encodeURIComponent(personalPayload);qrContainer.appendChild(img);
  }
  document.getElementById("personalQrLabel").textContent=`${user.name} • ${user.id}`;

  document.getElementById("downloadQr").addEventListener("click",()=>{
    const img=qrContainer.querySelector("img");
    if(!img){showToast("QR image is not ready yet.","error");return;}
    const a=document.createElement("a");
    a.href=img.src;a.download=`SmartAttend-${user.id}.png`;a.click();
  });

  document.getElementById("startScanner").addEventListener("click",startScanner);
  document.getElementById("stopScanner").addEventListener("click",stopScanner);
  document.getElementById("manualSubmit").addEventListener("click",()=>{
    const value=document.getElementById("manualQr").value.trim();
    processScannedValue(value,user.id);
  });
  document.getElementById("manualQr").addEventListener("keydown",e=>{
    if(e.key==="Enter"){e.preventDefault();document.getElementById("manualSubmit").click();}
  });

  renderAttendance(user.id);
});

function startScanner(){
  if(scannerRunning) return;
  scanner=new Html5Qrcode("reader");
  scanner.start(
    {facingMode:"environment"},
    {fps:10,qrbox:{width:250,height:250}},
    decodedText=>processScannedValue(decodedText,getCurrentUser().id),
    ()=>{}
  ).then(()=>{
    scannerRunning=true;
    document.getElementById("startScanner").disabled=true;
    document.getElementById("stopScanner").disabled=false;
    showToast("Camera scanner started.","success");
  }).catch(err=>{
    showToast("Camera could not start. Use manual fallback or allow camera permission.","error");
  });
}
function stopScanner(){
  if(!scanner || !scannerRunning) return;
  scanner.stop().then(()=>{
    scanner.clear();
    scannerRunning=false;
    document.getElementById("startScanner").disabled=false;
    document.getElementById("stopScanner").disabled=true;
  }).catch(()=>{});
}
function processScannedValue(value,studentId){
  if(!value){showToast("Enter a session code or scan the class QR.","error");return;}
  const clean=value.trim();
  const portable=decodeSessionCode(clean);
  if(portable){
    const session=sessionFromCode(portable.code,5);
    const result=recordAttendance(studentId,session.id,"Manual Session Code");
    showToast(result.message,result.ok?"success":"error");
    if(result.ok){document.getElementById("manualQr").value="";renderAttendance(studentId);}
    return;
  }
  try{
    const payload=JSON.parse(clean);
    if(payload.type!=="SMART_ATTEND_SESSION")throw new Error("Wrong QR type");
    if(!payload.sessionCode){throw new Error("Missing session code")}
    const session=sessionFromCode(payload.sessionCode,Math.max(1,Math.ceil((Number(payload.expiresAt)-Number(payload.createdAt||Date.now()))/60000)));
    if(!session||Number(payload.expiresAt)<Date.now()){showToast("This class QR has expired.","error");return;}
    const result=recordAttendance(studentId,session.id,"QR Scan");
    showToast(result.message,result.ok?"success":"error");
    if(result.ok){document.getElementById("manualQr").value="";renderAttendance(studentId);}
  }catch(e){showToast("Invalid session. Enter the lecturer's SA code exactly as displayed.","error")}
}
function renderAttendance(studentId){
  const db=getDB();
  const rows=db.attendance.filter(a=>a.studentId===studentId).sort((a,b)=>new Date(b.date)-new Date(a.date));
  document.getElementById("attendanceCount").textContent=rows.length;
  const tbody=document.getElementById("studentAttendanceTable");
  tbody.innerHTML=rows.length ? rows.map(a=>`
    <tr>
      <td>${escapeHtml(formatDate(a.date))}</td>
      <td>${escapeHtml(a.module)}</td>
      <td>${escapeHtml(formatTime(a.date))}</td>
      <td><span class="status-pill" style="background:#eafff8;color:#087b5d"><span class="status-dot" style="background:#00b982"></span>${escapeHtml(a.status)}</span></td>
    </tr>`).join("") : `<tr><td colspan="4">No attendance records yet.</td></tr>`;
}
