require("dotenv").config();
const path = require('path');
const uuid = require("uuid")
const puppeteer = require("puppeteer");

const { mergePdfs, backupFile, cleanup } = require("./lib/pdf-helper");
const ArgumentParser = require("./lib/argument-helper");

async function loginToBiodataTimeWatch(page) {
  const loginButtonSelector = ".roundedcornr_content_840695 > p:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(4) > td:nth-child(2) > input:nth-child(1)";
  await page.type("#compKeyboard", process.env.BD_COMPANY_NUMBER);
  await page.type("#nameKeyboard", process.env.BD_EMPLOYEE_NUMBER);
  await page.type("#pwKeyboard", process.env.BD_PASSWORD);
  await page.click(loginButtonSelector);
  await page.waitForNavigation();
}

async function loginToExperisTimeWatch(page) {
  await page.type("#login", process.env.EX_LOGIN);
  await page.type("#password", process.env.EX_PASSWORD);
  await page.click("#login_commit");
  await page.waitForNavigation();
}

function createMonthAndYearParams({ month, year }) {
  const m = month / 10 < 1 ? "0" + month : month;
  return `${m}-${year}`;
}

async function getRawRowsData(page) {
  const rowsData = await page.evaluate(() => {
    const rowsCssSelector =
      "body > div:nth-child(2) > span:nth-child(1) > p:nth-child(2) > table:nth-child(2) > tbody:nth-child(1) tr";
    const rows = Array.from(document.querySelectorAll(rowsCssSelector));
    return rows.map((tr) => (tr.childElementCount === 14 ? tr.innerText : null)).filter((row) => row !== null);
  });
  return rowsData;
}

function parseRows(rawData) {
  const rows = rawData.map((row) => {
    const rowArray = row.split("\t");
    const date = rowArray[0].match(/^\d{1,2}\-\d{1,2}\-\d{4}/)[0];
    const start = rowArray[4].trim();
    const end = rowArray[5].trim();
    return { date, start, end };
  });
  return rows;
}

function filterIrrelevantDays(days, currentMonth) {
  const month = currentMonth / 10 < 1 ? "0" + currentMonth : currentMonth;
  const result = days.filter((day) => day.date.includes(`-${month}-`) && day.start && day.end);
  return result;
}

(async () => {
  const flags = ArgumentParser.parseFlags();
  if (flags.showHelp) {
    return ArgumentParser.showHelp();
  }

  // get months and year from input and parse them
  const halves = ArgumentParser.parseMonths();
  // const { halves, flags } = parseArguments();
  const currentMonth = halves.second.month;
  const currentYear = halves.second.year;

  // start puppeteer
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {
      width: 1366,
      height: 790,
    },
  });
  const page = await browser.newPage();

  // browse to sign in page of biodata timewatch
  await page.goto("https://checkin.timewatch.co.il/punch/punch.php?e=1");

  // login to biodata time-watch
  await loginToBiodataTimeWatch(page);

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
      // if (flags.generatePdf) {
        //   const pdfPath = `./tmp/${uuid.v4()}.pdf`;
        //   await page.pdf({
          //     path: pdfPath,
          //     format: "A4"
          //   });
          //   pdfPaths.push(pdfPath);
          // }
          const rowsData = await getRawRowsData(popup);
          const days = await parseRows(rowsData);
          combinedDays.push(...days);
          popup.close();
          console.log('combinedDays: ', combinedDays);
      await page.goBack();
    }
  }
  
  console.log('combinedDays: ', combinedDays);
  // // merge the pdf files of the both halves of the month
  // if (flags.generatePdf) {
  //   let fname = currentYear + "-";
  //   fname += currentMonth.toString().length === 1 ? `0${currentMonth}` : currentMonth;
  //   await mergePdfs(pdfPaths, fname);
  //   // copy merged pdf to a backup folder
  //   if (flags.backupPdf) {
  //     const target_path = process.env.BACKUP_PATH + fname + ".pdf";
  //     await backupFile(pdfPaths[pdfPaths.length-1], target_path);
  //   }
  // } 

  // // remove pdf files after submitting
  // if (flags.generatePdf && flags.cleanFiles) {
  //   await cleanup(pdfPaths)
  // }

  // this are all the working days of the given month
  const filteredDays = filterIrrelevantDays(combinedDays, currentMonth);

  // go to experis login page
  const experisLoginPage = "https://bo.experis.co.il/login";
  await page.goto(experisLoginPage);

  // fill login form and submit
  await loginToExperisTimeWatch(page);

  // map the raw data to rows of date and id
  const experisRowsData = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("table.tbl_chart:nth-child(1) > tbody:nth-child(2) tr"));
    return rows
      .map((tr) => {
        return {
          dateText: tr.children[0].innerText.match(/^\d{1,2}\-\d{1,2}/),
          rowId: tr.getAttribute("id"),
        };
      })
      .filter((row) => row.rowId !== null);
  });

  for (day of filteredDays) {
    // try to find a matching row in the experisRows
    const correspondingRow = experisRowsData.find((row) => {
      // HACK: add a '0' to dates like 1/11 so it wont be matched with 11/11
      // TODO: move this hack to where the experis rows are parsed
      let experisDateArray = row.dateText[0].toString().split("-");
      let [d, m] = experisDateArray;
      d = d.length === 1 ? "0" + d : d;
      m = m.length === 1 ? "0" + m : m;
      const experisDate = d + "-" + m;
      return day.date.includes(experisDate);
    });
    if (correspondingRow) {
      // if the row was matched with a row in experisRows, type in the hours
      const rowId = correspondingRow.rowId.slice(11);
      const startId = "time_report_" + rowId + "_start_time";
      const endId = "time_report_" + rowId + "_end_time";
      await page.type(`#${startId}`, day.start);
      await page.type(`#${endId}`, day.end);
    }
  }

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