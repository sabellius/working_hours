require("dotenv").config();
const path = require('path');
const puppeteer = require("puppeteer");
const uuid = require("uuid");

const ArgumentParser = require("./lib/argument-helper");
const PdfHelper = require("./lib/pdf-helper");
const Scraper = require("./lib/scraper")

function createMonthAndYearParams({ month, year }) {
  const m = month / 10 < 1 ? "0" + month : month;
  return `${m}-${year}`;
}

(async () => {
  const flags = ArgumentParser.parseFlags();
  if (flags.showHelp) {
    return ArgumentParser.showHelp();
  }

  // get months and year from input and parse them
  const halves = ArgumentParser.parseMonths();
  const currentMonth = halves.second.month;
  const currentYear = halves.second.year;

  // start puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1366,
      height: 790,
    },
  });
  const page = await browser.newPage();

  // login to biodata time-watch
  await Scraper.loginToBiodata(page);

  // get the url to the hours table from the link in the home page
  const linkCssSelector = "#cpick > div:nth-child(23) > div > div > div.reports-info > h6 > a"
  const selectCssSelector = "select.form-control"

  const pdfPaths = [];
  let combinedDays = [];
  const options = await page.$$eval(selectCssSelector + " option", (options) => options.map(opt => opt.textContent));
  for (const half of Object.values(halves)) {
    const monthAndYearParams = createMonthAndYearParams(half);
    if (options.includes(monthAndYearParams)) {
      await page.select(selectCssSelector, monthAndYearParams)
      const [popup] = await Promise.all([
        new Promise((resolve) => page.once('popup', resolve)),
        await page.click(linkCssSelector)
      ]);
      await page.goto(popup.url());
      if (flags.generatePdf) {
          const pdfPath = `./tmp/${uuid.v4()}.pdf`;
          await page.pdf({
              path: pdfPath,
              format: "A4"
            });
            pdfPaths.push(pdfPath);
          }
          const days = await Scraper.getRowsFromBiodata(popup);
          combinedDays.push(...days);
          popup.close();
      await page.goBack();
    }
  }
  
  // // merge the pdf files of the both halves of the month
  if (flags.generatePdf) {
    let fname = currentYear + "-";
    fname += currentMonth.toString().length === 1 ? `0${currentMonth}` : currentMonth;
    await PdfHelper.mergePdf(pdfPaths, fname);
    // copy merged pdf to a backup folder
    if (flags.backupPdf) {
      const target_path = process.env.BACKUP_PATH + fname + ".pdf";
      await PdfHelper.backupFile(pdfPaths[pdfPaths.length-1], target_path);
    }
  } 

  // remove pdf files after submitting
  if (flags.generatePdf && flags.cleanFiles) {
    await cleanup(pdfPaths)
  }

  // this are all the working days of the given month
  const filteredDays = Scraper.filterCombinedDays(combinedDays, currentMonth);
  console.log('filteredDays: ', filteredDays);

  // fill login form and submit
  await Scraper.loginToExperis(page);

  await Scraper.fillHours(page, filteredDays)

  await page.click("#button_save");

  if (flags.submitHours) {
    if (flags.generatePdf) {
      const uploadFileInput = await page.$("input[type=file]");
      const mergedPdfPath = path.dirname(require.main.filename) + "/" + pdfPaths[pdfPaths.length - 1].slice(1)
      await uploadFileInput.uploadFile(mergedPdfPath);
      await page.click("#upload");
      await page.click("#button_complete");
      await page.waitFor(5000);
    }
  }

  await browser.close();
})();