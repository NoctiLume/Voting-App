const inputFoto = document.getElementById("foto");
const previewImage = document.getElementById("preview-image");
const previewContainer = document.getElementById("preview-container");
const fileNameSpan = document.getElementById("file-name");

// Toast notification function
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === "success" ? "#4CAF50" : "#f44336"};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 10000;
    font-family: 'Poppins', sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add CSS animation styles
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

/* =========================
   UPLOAD PHOTO
========================= */
async function uploadPhoto(file, calonId) {
  const formData = new FormData();
  formData.append("photo", file);
  formData.append("calonId", calonId);

  const res = await fetch("https://voting-app-api.shigoto.workers.dev/uploadPhoto", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage = "Upload failed";
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      errorMessage = errorText || `Server error: ${res.status}`;
    }
    throw new Error(errorMessage);
  }

  const data = await res.json();
  return data.photoData; // base64 data URL
}

/* =========================
   SAVE DATA
========================= */
async function saveData(event) {
  event.preventDefault();

  const nama = document.getElementById("nama").value;
  const visiMisi = document.getElementById("visi-misi").value;

  let photoData = null;
  if (inputFoto.files.length > 0) {
    try {
      photoData = await uploadPhoto(inputFoto.files[0], CALON_ID);
      // Also update preview immediately
      previewImage.src = photoData;
      previewContainer.style.display = "block";
      // Hide the "Belum ada file dipilih" text
      if (fileNameSpan) {
        fileNameSpan.style.display = "none";
      }
      // Show success toast
      showToast("✅ Foto berhasil diunggah!", "success");
    } catch (error) {
      showToast("❌ Gagal mengunggah foto: " + error.message, "error");
      return;
    }
  }

  const res = await fetch("https://voting-app-api.shigoto.workers.dev/saveCandidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      calonId: CALON_ID,
      nama,
      visiMisi,
      photoData,
    }),
  });

  if (!res.ok) {
    showToast("❌ Gagal menyimpan data", "error");
    return;
  }

  showToast("✅ Data calon berhasil disimpan!", "success");
}

/* =========================
   LOAD DATA
========================= */
async function loadData() {
  const res = await fetch(
    `https://voting-app-api.shigoto.workers.dev/getCandidate?id=${CALON_ID}`
  );
  const data = await res.json();

  document.getElementById("nama").value = data.nama || "";
  document.getElementById("visi-misi").value = data.visiMisi || "";

  if (data.photoData) {
    // Use base64 data directly
    previewImage.src = data.photoData;
    previewContainer.style.display = "block";
  } else if (data.photoPath) {
    // Fallback to photoPath if photoData not available
    previewImage.src = data.photoPath;
    previewContainer.style.display = "block";
  } else {
    previewContainer.style.display = "none";
    previewImage.src = "";
  }
}

/* =========================
   DELETE DATA
========================= */
async function deleteData() {
  if (!confirm("⚠️ Hapus data calon ini?")) return;

  const res = await fetch("https://voting-app-api.shigoto.workers.dev/deleteCandidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ calonId: CALON_ID }),
  });

  if (res.ok) {
    document.getElementById("isi").reset();
    previewContainer.style.display = "none";
    previewImage.src = "";
    if (fileNameSpan) {
      fileNameSpan.style.display = "none";
    }
    showToast("✅ Data berhasil dihapus", "success");
  } else {
    showToast("❌ Gagal menghapus data", "error");
  }
}

/* =========================
   INIT
========================= */
window.onload = () => {
  loadData();
  document.getElementById("isi").addEventListener("submit", saveData);

  // Hide file name text initially if preview exists
  if (previewContainer && previewContainer.style.display !== "none" && fileNameSpan) {
    fileNameSpan.style.display = "none";
  }

  // Hide file name when file is selected
  if (inputFoto) {
    inputFoto.addEventListener("change", (e) => {
      if (e.target.files.length > 0 && fileNameSpan) {
        fileNameSpan.style.display = "none";
      } else if (fileNameSpan) {
        fileNameSpan.style.display = "inline";
      }
    });
  }

  const overlay = document.querySelector(".page-overlay");
  if (overlay) {
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 300);
  }
};
