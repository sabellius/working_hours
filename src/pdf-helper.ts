import fs from "fs";
import uuid from "uuid";
import PDFMerger from "pdf-merger-js";
import { PdfError } from "./custom-errors";
const merger = new PDFMerger();

class PdfHelper {
  backupPath: string | undefined

  constructor() {
    this.backupPath = process.env.BACKUP_PATH;
  }

  async mergePdf(paths: string[], filename: string = uuid.v4()) {
    try {
      paths.forEach((path) => merger.add(path));
      const mergedPath = `./tmp/${filename}.pdf`;
      await merger.save(mergedPath);
      paths.push(mergedPath);
    } catch (error) {
      throw new PdfError(`failed to combine the pdf from both month halves - ${error}`)
    }
  }

  async backupFile(sourcePath: string, targetPath: string | null = null) {
    try {
      fs.copyFile(sourcePath, (targetPath || this.backupPath as string), fs.constants.COPYFILE_EXCL as any);
    } catch (error) {
      throw new PdfError(`failed to backup the generated pdf - ${error}`)
    }
  }

  async cleanup(paths: string[]) {
    try {
      paths.forEach((path: string) => {
        if (fs.existsSync(path)) {
          fs.unlinkSync(path);
        }
      });
    } catch (error) {
      throw new PdfError(`failed to cleanup the generated pdf files - ${error}`)
    }
  }

}

export default new PdfHelper();
