#!/usr/bin/env node

require("dotenv").config();
const path = require('path');
const puppeteer = require("puppeteer");
const uuid = require("uuid");

const { arguments, halves } = require("./src/arguments-helper");
console.log('arguments: ', arguments);
const PdfHelper = require("./src/pdf-helper");
const Scraper = require("./src/scraper")

function createMonthAndYearParams({ month, year }) {
  const m = month / 10 < 1 ? "0" + month : month;
  return `${m}-${year}`;
}
try {
  (async () => {
    // get months and year from input and parse them
    // const { }} = ArgumentParser.parseMonths();
    const [firstHalf, secondHalf] = halves;
    const currentYear = firstHalf.year;
    const currentMonth = secondHalf.month;
  
    // start puppeteer
    const browser = await puppeteer.launch({
      // headless: false,
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
    const linkCssSelector = "#attRp"
    const selectCssSelector = "select.form-control:nth-child(3)"
  
    const pdfPaths = [];
    let combinedDays = [];
    const options = await page.$$eval(selectCssSelector + " option", (options) => options.map(opt => opt.textContent));
    for (const half of halves) {
      const monthAndYearParams = createMonthAndYearParams(half);
      if (options.includes(monthAndYearParams)) {
        await page.select(selectCssSelector, monthAndYearParams);
        await page.click(linkCssSelector);
        const popup = await new Promise((resolve) => page.once('popup', resolve));
        await page.goto(popup.url())
        await popup.close();
        if (arguments.generatePdf) {
          const pdfPath = `./tmp/${uuid.v4()}.pdf`;
          await page.pdf({
              path: pdfPath,
              format: "A4"
            });
          pdfPaths.push(pdfPath);
        }
        const days = await Scraper.getRowsFromBiodata(page);
        combinedDays.push(...days);
        await page.goBack();
      }
    }  
  
    // merge the pdf files of the both halves of the month
    if (arguments.generatePdf) {
      let pdfFilename = currentYear + "-";
      pdfFilename += currentMonth.toString().length === 1 ? `0${currentMonth}` : currentMonth;
      await PdfHelper.mergePdf(pdfPaths, pdfFilename);
      // copy merged pdf to a backup folder
      if (arguments.backupPdf) {
        const target_path = process.env.BACKUP_PATH + pdfFilename + ".pdf";
        await PdfHelper.backupFile(pdfPaths[pdfPaths.length-1], target_path);
      }
    } 
  
    // remove pdf files after submitting
    if (arguments.generatePdf && arguments.cleanFiles) {
      await cleanup(pdfPaths)
    }
  
    // this are all the working days of the given month
    const filteredDays = Scraper.filterCombinedDays(combinedDays, currentMonth);
    // console.log('filteredDays: ', filteredDays);
  
    // fill login form and submit
    await Scraper.loginToExperis(page);
  
    await Scraper.fillHours(page, filteredDays)
  
    await page.waitForSelector("#button_save");
    await page.click("#button_save");
  
    if (arguments.submit && arguments.generatePdf) {
      const uploadFileInput = await page.$("input[type=file]");
      const mergedPdfPath = path.dirname(require.main.filename) + "/" + pdfPaths[pdfPaths.length - 1].slice(1)
      await uploadFileInput.uploadFile(mergedPdfPath);
      await page.click("#upload");
      await page.click("#button_complete");
      await page.waitFor(5000);
    }
  
    console.log("done");
    await browser.close();
  })();
} catch (error) {
  console.log(error);
}
