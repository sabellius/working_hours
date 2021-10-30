const fs = require("fs");
const uuid = require("uuid")
const PDFMerger = require("pdf-merger-js");
const merger = new PDFMerger();

class PdfHelper {
  constructor() {
    this.backupPath = process.env.BACKUP_PATH;
  }

  async mergePdf(paths, filename = uuid.v4()) {
    try {
      paths.forEach((path) => merger.add(path));
      const mergedPath = `./tmp/${filename}.pdf`;
      await merger.save(mergedPath);
      paths.push(mergedPath);
    } catch (error) {
      console.log(error);
    }
  }

  async backupFile(sourcePath, targetPath = null) {
    try {
      fs.copyFile(sourcePath, (targetPath || this.backupPath), () => console.log("success"));
    } catch (error) {
      console.log("error: ", error);
    }
  }

  async cleanup(paths) {
    paths.forEach((path) => {
      if (fs.existsSync(path)) {
        fs.unlinkSync(path, (path) => console.log("removed " + path));
      }
    });
  }

}

module.exports = new PdfHelper();
