document.addEventListener("DOMContentLoaded",()=>{
  const form=document.getElementById("loginForm");
  const message=document.getElementById("loginMessage");

  form.addEventListener("submit",(e)=>{
    e.preventDefault();
    const id=document.getElementById("username").value.trim();
    const password=document.getElementById("password").value;
    const user=getAllUsers().find(u=>u.id.toLowerCase()===id.toLowerCase() && u.password===password);

    if(!user){
      message.textContent="Invalid ID or password.";
      message.className="form-message error";
      return;
    }

    /* Once-per-day login rule for this prototype. */
    if(user.lastLoginDate===todayKey()){
      message.textContent="This account has already logged in today. Please try again tomorrow.";
      message.className="form-message error";
      return;
    }

    const db=getDB();
    const target = user.role==="student"
      ? db.students.find(s=>s.id===user.id)
      : db.staff.find(s=>s.id===user.id);

    target.lastLoginDate=todayKey();
    saveDB(db);

    const sessionUser={id:user.id,name:user.name,role:user.role,loginDate:todayKey()};
    setSession(sessionUser);

    message.textContent="Login successful. Redirecting...";
    message.className="form-message success";

    setTimeout(()=>{
      location.href=user.role==="student" ? "student.html" : "admin.html";
    },450);
  });
});
