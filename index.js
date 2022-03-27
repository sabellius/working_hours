#!/usr/bin/env node

require("dotenv").config();
const path = require('path');
const puppeteer = require("puppeteer");
const uuid = require("uuid");

const { arguments, halves } = require("./lib/argument-helper");
const PdfHelper = require("./lib/pdf-helper");
const Scraper = require("./lib/scraper")

function createMonthAndYearParams({ month, year }) {
  const m = month / 10 < 1 ? "0" + month : month;
  console.log('`${m}-${year}`: ', `${m}-${year}`);
  return `${m}-${year}`;
}

(async () => {
  // const arguments = ArgumentParser.parseFlags();
  // if (arguments.showHelp) {
  //   return ArgumentParser.showHelp();
  // }

  // get months and year from input and parse them
  // const { }} = ArgumentParser.parseMonths();
  const [firstHalf, secondHalf] = halves;
  console.log('halves: ', halves);
  const { month: currentMonth, year: currentYear } = secondHalf;


  // start puppeteer
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {
      width: 1366,
      height: 790,
    },
  });
  const page = await browser.newPage();

  // login to biodata time-watch
  await Scraper.loginToBiodata(page);

  // get the url to the hours table from the link in the home page
  const linkCssSelector = "a#attRp.new-link"
  const selectCssSelector = "select.form-control"

  const pdfPaths = [];
  let combinedDays = [];
  const options = await page.$$eval(selectCssSelector + " option", (options) => options.map(opt => opt.textContent));
  console.log('options: ', options);
  for (const half of halves) {
    const monthAndYearParams = createMonthAndYearParams(half);
    if (options.includes(monthAndYearParams)) {
      await page.select(selectCssSelector, monthAndYearParams)
      await page.click(linkCssSelector)
      await page.click(linkCssSelector)
      // const [popup] = await Promise.all([
        // new Promise((resolve) => page.once('popup', resolve)),
      // ]);
      // await page.goto(popup.url());
      // if (arguments.generatePdf) {
      //     const pdfPath = `./tmp/${uuid.v4()}.pdf`;
      //     await page.pdf({
      //         path: pdfPath,
      //         format: "A4"
      //       });
      //       pdfPaths.push(pdfPath);
      //     }
      //     const days = await Scraper.getRowsFromBiodata(popup);
      //     combinedDays.push(...days);
      //     popup.close();
      await page.goBack();
    }
  }
  
  // // merge the pdf files of the both halves of the month
  if (arguments.generatePdf) {
    let fname = currentYear + "-";
    fname += currentMonth.toString().length === 1 ? `0${currentMonth}` : currentMonth;
    await PdfHelper.mergePdf(pdfPaths, fname);
    // copy merged pdf to a backup folder
    if (arguments.backupPdf) {
      const target_path = process.env.BACKUP_PATH + fname + ".pdf";
      await PdfHelper.backupFile(pdfPaths[pdfPaths.length-1], target_path);
    }
  } 

  // remove pdf files after submitting
  if (arguments.generatePdf && arguments.cleanFiles) {
    await cleanup(pdfPaths)
  }

  // this are all the working days of the given month
  const filteredDays = Scraper.filterCombinedDays(combinedDays, currentMonth);
  console.log('filteredDays: ', filteredDays);

  // fill login form and submit
  await Scraper.loginToExperis(page);

  await Scraper.fillHours(page, filteredDays)

  await page.waitForSelector("#button_save");
  await page.click("#button_save");

  if (arguments.submitHours) {
    if (arguments.generatePdf) {
      const uploadFileInput = await page.$("input[type=file]");
      const mergedPdfPath = path.dirname(require.main.filename) + "/" + pdfPaths[pdfPaths.length - 1].slice(1)
      await uploadFileInput.uploadFile(mergedPdfPath);
      await page.click("#upload");
      await page.click("#button_complete");
      await page.waitFor(5000);
    }
  }

  console.log("done");
  await browser.close();
})();
