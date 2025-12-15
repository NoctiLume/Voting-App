document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = document.getElementById("password").value;

  try {
    const res = await fetch("https://voting-app-api.shigoto.workers.dev/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      credentials: "include", // Required for cross-origin cookies
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

