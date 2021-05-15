const fs = require("fs");


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
  })
}

async function backupFile(sourcePath, targetPath = process.env.BACKUP_PATH) {
  try {
    fs.copyFile(sourcePath, targetPath);
  } catch (error) {
    console.log('error: ', error);
  }
}