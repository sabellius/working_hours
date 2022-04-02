const fs = require("fs");
const uuid = require("uuid")
const PDFMerger = require("pdf-merger-js");
const { PdfError } = require("./custom-errors");
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
      throw new PdfError(`failed to combine the pdf from both month halves - ${error}`)
    }
  }

  async backupFile(sourcePath, targetPath = null) {
    try {
      fs.copyFile(sourcePath, (targetPath || this.backupPath));
    } catch (error) {
      throw new PdfError(`failed to backup the generated pdf - ${error}`)
    }
  }

  async cleanup(paths) {
    try {
      paths.forEach((path) => {
        if (fs.existsSync(path)) {
          fs.unlinkSync(path, (path) => console.log("removed " + path));
        }
      });
    } catch (error) {
      throw new PdfError(`failed to cleanup the generated pdf files - ${error}`)
    }
  }

}

module.exports = new PdfHelper();
