const fs = require("fs");
const PDFMerger = require("pdf-merger-js");
const merger = new PDFMerger();

async function mergePdfs(paths, filename) {
  try {
    paths.forEach((path) => merger.add(path));
    const mergedPath = `./tmp/${filename}.pdf`;
    await merger.save(mergedPath);
    paths.push(mergedPath);
  } catch (error) {
    console.log(error);
  }
}

async function cleanup(paths) {
  paths.forEach((path) => {
    if (fs.existsSync(path)) {
      fs.unlinkSync(path, (path) => console.log("removed " + path));
    }
  });
}

async function backupFile(sourcePath, targetPath = process.env.BACKUP_PATH) {
  try {
    fs.copyFile(sourcePath, targetPath, () => console.log("success"));
  } catch (error) {
    console.log("error: ", error);
  }
}

module.exports = {
  mergePdfs,
  cleanup,
  backupFile,
};
