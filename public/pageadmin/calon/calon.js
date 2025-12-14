const inputFoto = document.getElementById("foto");
const previewImage = document.getElementById("preview-image");
const previewContainer = document.getElementById("preview-container");

/* =========================
   UPLOAD PHOTO
========================= */
async function uploadPhoto(file, calonId) {
  const formData = new FormData();
  formData.append("photo", file);
  formData.append("calonId", calonId);

  const res = await fetch("/uploadPhoto", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Upload failed");
  }

  return res.text(); // storage path
}

/* =========================
   SAVE DATA
========================= */
async function saveData(event) {
  event.preventDefault();

  const nama = document.getElementById("nama").value;
  const visiMisi = document.getElementById("visi-misi").value;

  let photoPath = null;
  if (inputFoto.files.length > 0) {
    photoPath = await uploadPhoto(inputFoto.files[0], CALON_ID);
  }

  const res = await fetch("/saveCandidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      calonId: CALON_ID,
      nama,
      visiMisi,
      photoPath,
    }),
  });

  if (!res.ok) {
    alert("❌ Gagal menyimpan data");
    return;
  }

  alert("✅ Data calon berhasil disimpan");
}

/* =========================
   LOAD DATA
========================= */
async function loadData() {
  const res = await fetch(`/getCandidate?id=${CALON_ID}`);
  const data = await res.json();

  document.getElementById("nama").value = data.nama || "";
  document.getElementById("visi-misi").value = data.visiMisi || "";

  if (data.photoPath) {
    previewImage.src = `/__storage/${data.photoPath}`;
    previewContainer.style.display = "block";
  }
}

/* =========================
   DELETE DATA
========================= */
async function deleteData() {
  if (!confirm("⚠️ Hapus data calon ini?")) return;

  await fetch("/deleteCandidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ calonId: CALON_ID }),
  });

  document.getElementById("isi").reset();
  previewContainer.style.display = "none";
  previewImage.src = "";

  alert("✅ Data berhasil dihapus");
}

/* =========================
   INIT
========================= */
window.onload = () => {
  loadData();
  document.getElementById("isi").addEventListener("submit", saveData);

  const overlay = document.querySelector(".page-overlay");
  if (overlay) {
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 300);
  }
};
