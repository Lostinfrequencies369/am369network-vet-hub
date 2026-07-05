/**
 * AM 369 Network — Drive Image Uploader (Google Apps Script)
 * ------------------------------------------------------------------
 * Deploy this as a Web App (Extensions > Apps Script in a Google Sheet,
 * or script.google.com > New Project). It receives an image from the
 * admin panel, sorts it into Drive folders by section/species, and
 * returns a public view URL to paste back into the thumbnail field.
 *
 * DEPLOY STEPS
 * 1. script.google.com -> New project -> paste this file as Code.gs
 * 2. Run `setup` once from the editor to create the root folder and
 *    authorize Drive access.
 * 3. Deploy -> New deployment -> type "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone with the link
 * 4. Copy the deployment URL into Admin -> Settings -> Drive Upload URL.
 *
 * FOLDER STRUCTURE CREATED AUTOMATICALLY
 * AM369 Network Media/
 *   Apps/
 *   Blogs/
 *   Directories/
 *   Species/
 *     Cattle/
 *     Buffalo/
 *     ... (created on first upload per species)
 *
 * SECURITY NOTE
 * "Anyone with the link" can call doPost, so this checks a shared secret
 * (ADMIN_KEY) sent from the admin panel. Change ADMIN_KEY below to your
 * own value and keep it out of any public repo if you want it private —
 * or accept it's a light deterrent only, matching the admin panel's own
 * client-side lock. Do not use this for anything truly sensitive.
 */

var ROOT_FOLDER_NAME = "AM369 Network Media";
var ADMIN_KEY = "AnkiMunky321"; // keep in sync with admin panel passcode, or set your own

function setup() {
  getOrCreateFolder_(ROOT_FOLDER_NAME, DriveApp.getRootFolder());
  Logger.log("Root media folder ready.");
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.key !== ADMIN_KEY) {
      return jsonOut_({ ok: false, error: "Unauthorized" });
    }
    if (!body.dataBase64 || !body.filename) {
      return jsonOut_({ ok: false, error: "Missing file data" });
    }

    var section = sanitize_(body.section || "Misc");   // e.g. "Species", "Apps", "Blogs", "Directories"
    var subfolder = sanitize_(body.subfolder || "");    // e.g. species name or category

    var root = getOrCreateFolder_(ROOT_FOLDER_NAME, DriveApp.getRootFolder());
    var sectionFolder = getOrCreateFolder_(section, root);
    var targetFolder = subfolder ? getOrCreateFolder_(subfolder, sectionFolder) : sectionFolder;

    var bytes = Utilities.base64Decode(body.dataBase64.split(",").pop());
    var mime = body.mimeType || "image/png";
    var blob = Utilities.newBlob(bytes, mime, body.filename);
    var file = targetFolder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var directUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();

    return jsonOut_({
      ok: true,
      fileId: file.getId(),
      url: directUrl,
      viewUrl: file.getUrl(),
      folder: section + (subfolder ? "/" + subfolder : "")
    });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return jsonOut_({ ok: true, message: "AM 369 Network Drive Uploader is running." });
}

function getOrCreateFolder_(name, parent) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

function sanitize_(s) {
  return String(s).replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 60) || "Misc";
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
