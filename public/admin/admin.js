document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "password=" + encodeURIComponent(password),
    });

    if (res.ok) {
      window.location.href = "/pageadmin/pageadmin.html";
    } else {
      alert("Password salah");
    }
  } catch (err) {
    alert("Server error");
    console.error(err);
  }
});

