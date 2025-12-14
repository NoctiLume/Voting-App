const functions = require("firebase-functions");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");

admin.initializeApp();

const PASSWORD_HASH = "$2b$10$/V9PVyVowqw9WlNjoLQXhOGH..bez.8QRSnSBmHgRHol3IAKOhUl.";

exports.login = functions.https.onRequest((req, res) => {
  bodyParser.urlencoded({ extended: false })(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("hey no no yah");
    }

    const password = req.body.password || "";
    const ok = await bcrypt.compare(password, PASSWORD_HASH);

    if (!ok) return res.status(401).send("SALAAAAH");

    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";

    res.cookie("admin", "true", {
      httpOnly: true,
      secure: !isEmulator,
      sameSite: "strict",
      path: "/"
    });

    return res.status(200).send("ok");
  });
});

exports.logout = functions.https.onRequest((req, res) => {
  res.clearCookie("admin", {
    path: "/",
    secure: !isEmulator,
    sameSite: "strict"
  });

  return res.redirect("/admin/admin.html");
});

exports.checkAdmin = functions.https.onRequest((req, res) => {
  cookieParser()(req, res, () => {
    if (req.cookies.admin === "true") {
      res.set("Cache-Control", "no-store");

      const filePath =
        req.path.replace("/pageadmin", "") || "/pageadmin.html";

      return res.sendFile(
        __dirname + "/../public/pageadmin" + filePath
      );
    }

    return res.redirect("/admin/admin.html");
  });
});

exports.saveCandidate = functions.https.onRequest(async (req, res) => {
  cookieParser()(req, res, async () => {
    if (req.cookies.admin !== "true") {
      return res.status(403).send("Forbidden");
    }

    if (req.method !== "POST") {
      return res.status(405).send("Method not allowed");
    }

    const { calonId, nama, visiMisi, photoPath } = req.body;

    if (!["calon1", "calon2", "calon3", "calon4"].includes(calonId)) {
      return res.status(400).send("Invalid calon");
    }

    await admin.firestore().collection("candidates").doc(calonId).set(
      {
        nama,
        visiMisi,
        photoPath,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    res.send("Saved");
  });
});

exports.getCandidate = functions.https.onRequest(async (req, res) => {
  const calonId = req.query.id;

  if (!["calon1", "calon2", "calon3", "calon4"].includes(calonId)) {
    return res.status(400).send("Invalid calon");
  }

  const doc = await admin.firestore().collection("candidates").doc(calonId).get();
  res.json(doc.exists ? doc.data() : {});
});

const busboy = require("busboy");
const os = require("os");
const fs = require("fs");
const path = require("path");

exports.uploadPhoto = functions.https.onRequest((req, res) => {
  cookieParser()(req, res, () => {
    if (req.cookies.admin !== "true") {
      return res.status(403).send("Forbidden");
    }

    if (req.method !== "POST") {
      return res.status(405).send("Method not allowed");
    }

    const bb = busboy({ headers: req.headers });
    let uploadPath;
    let calonId;

    bb.on("field", (name, value) => {
      if (name === "calonId") calonId = value;
    });

    bb.on("file", (name, file, info) => {
      const tmp = path.join(os.tmpdir(), `${calonId}.jpg`);
      uploadPath = tmp;
      file.pipe(fs.createWriteStream(tmp));
    });

    bb.on("finish", async () => {
      if (!calonId || !uploadPath) {
        return res.status(400).send("Invalid upload");
      }

      await admin.storage().bucket().upload(uploadPath, {
        destination: `candidates/${calonId}.jpg`,
        metadata: { contentType: "image/jpeg" },
      });

      fs.unlinkSync(uploadPath);
      res.send(`candidates/${calonId}.jpg`);
    });

    bb.end(req.rawBody);
  });
});

exports.deleteCandidate = functions.https.onRequest((req, res) => {
  cookieParser()(req, res, async () => {
    if (req.cookies.admin !== "true") {
      return res.status(403).send("Forbidden");
    }

    if (req.method !== "POST") {
      return res.status(405).send("Method not allowed");
    }

    const { calonId } = req.body;

    if (!["calon1", "calon2", "calon3", "calon4"].includes(calonId)) {
      return res.status(400).send("Invalid calon");
    }

    // Delete Firestore document
    await admin.firestore().collection("candidates").doc(calonId).delete();

    // Delete photo from Storage (ignore if missing)
    const file = admin.storage().bucket().file(`candidates/${calonId}.jpg`);
    await file.delete().catch(() => {});

    res.send("Deleted");
  });
});

