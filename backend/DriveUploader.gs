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
 * Websites/                       (created by setupWebsiteFolders, run once)
 *   Data/
 *   Music/
 *   Photos/
 *   AM369 Website Data            (a Google Sheet with Data/Music/Photos tabs)
 *
 * To create the Websites structure: run `setupWebsiteFolders` once from the
 * Apps Script editor, OR after deploying, visit:
 *   <your-deployment-url>?action=setup&key=YOUR_ADMIN_KEY
 *
 * SECURITY NOTE
 * "Anyone with the link" can call doPost, so this checks a shared secret
 * (ADMIN_KEY) sent from the admin panel. Change ADMIN_KEY below to your
 * own value and keep it out of any public repo if you want it private —
 * or accept it's a light deterrent only, matching the admin panel's own
 * client-side lock. Do not use this for anything truly sensitive.
 */

var ROOT_FOLDER_NAME = "AM369 Network Media";
var WEBSITE_FOLDER_NAME = "Websites";
var ADMIN_KEY = "AnkiMunky321"; // keep in sync with admin panel passcode, or set your own

function setup() {
  getOrCreateFolder_(ROOT_FOLDER_NAME, DriveApp.getRootFolder());
  Logger.log("Root media folder ready.");
}

/**
 * Creates:
 *   Websites/
 *     Data/
 *     Music/
 *     Photos/
 *     AM369 Website Data  (a new Google Sheet, one tab per data type)
 * Safe to run multiple times — reuses existing folders/sheet instead of duplicating.
 * Run this once from the editor (Run > setupWebsiteFolders), or hit the deployed
 * URL with ?action=setup&key=YOUR_ADMIN_KEY to trigger it remotely.
 */
function setupWebsiteFolders() {
  var root = getOrCreateFolder_(WEBSITE_FOLDER_NAME, DriveApp.getRootFolder());
  var dataFolder = getOrCreateFolder_("Data", root);
  var musicFolder = getOrCreateFolder_("Music", root);
  var photosFolder = getOrCreateFolder_("Photos", root);

  var sheet = getOrCreateSheetInFolder_("AM369 Website Data", root);

  var result = {
    ok: true,
    websitesFolder: root.getUrl(),
    dataFolder: dataFolder.getUrl(),
    musicFolder: musicFolder.getUrl(),
    photosFolder: photosFolder.getUrl(),
    sheetUrl: sheet.getUrl()
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function getOrCreateSheetInFolder_(name, folder) {
  var it = folder.getFilesByName(name);
  if (it.hasNext()) return SpreadsheetApp.open(it.next());
  var ss = SpreadsheetApp.create(name);
  var file = DriveApp.getFileById(ss.getId());
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file); // remove from default My Drive root, keep only in target folder
  // Set up starter tabs matching the site's data types.
  var first = ss.getSheets()[0];
  first.setName("Data");
  first.getRange(1, 1, 1, 3).setValues([["Key", "Value", "Notes"]]);
  var musicSheet = ss.insertSheet("Music");
  musicSheet.getRange(1, 1, 1, 4).setValues([["Title", "File URL", "Artist/Source", "Notes"]]);
  var photosSheet = ss.insertSheet("Photos");
  photosSheet.getRange(1, 1, 1, 4).setValues([["Title", "File URL", "Category", "Notes"]]);
  return ss;
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

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === "setup") {
    if (p.key !== ADMIN_KEY) return jsonOut_({ ok: false, error: "Unauthorized" });
    try {
      return jsonOut_(setupWebsiteFolders());
    } catch (err) {
      return jsonOut_({ ok: false, error: String(err) });
    }
  }
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
