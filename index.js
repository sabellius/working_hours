const puppeteer = require('puppeteer');
require('dotenv').config();

async function loginToBiodataTimeWatch(page) {
  const loginButtonSelector = '.roundedcornr_content_840695 > p:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(4) > td:nth-child(2) > input:nth-child(1)'
  await page.type('#compKeyboard', process.env.BD_COMPANY_NUMBER);
  await page.type('#nameKeyboard', process.env.BD_EMPLOYEE_NUMBER);
  await page.type('#pwKeyboard', process.env.BD_PASSWORD)
  await page.click(loginButtonSelector);
  await page.waitForNavigation();
}

async function loginToExperisTimeWatch(page) {
  await page.type('#login', process.env.EX_LOGIN);
  await page.type('#password', process.env.EX_PASSWORD);
  await page.click('#login_commit');
  await page.waitForNavigation();
}

function parseArguments(){
  const [month, year] = process.argv.slice(2).map(value => parseInt(value));
  const first = { month: month - 1, year };
  const second = { month, year };
  if (month === 1) {
    first["month"] = 12
    first["year"] = year - 1;
  } 
  return { first, second }
}

function createMonthAndYearParams({ month, year }){
  const m = (month / 10 < 1) ? '0' + month : month;
  return `&m=${m}&y=${year}`;
}

async function getRawRowsData(page){
  const rowsData = await page.evaluate(() => {
    const rowsCssSelector = 'body > div:nth-child(2) > span:nth-child(1) > p:nth-child(2) > table:nth-child(2) > tbody:nth-child(1) tr';
    const rows = Array.from(document.querySelectorAll(rowsCssSelector));
    return rows.map((tr) => tr.childElementCount === 14 ? tr.innerText : null).filter((row) => row !== null);
  });
  return rowsData;
}

function parseRows(rawData){
  const rows = rawData.map(row => {
    const rowArray = row.split('\t');
    const date = rowArray[0].match(/^\d{1,2}\-\d{1,2}\-\d{4}/)[0];
    const start = rowArray[4].trim();
    const end = rowArray[5].trim();
    return { date, start, end }
  });
  return rows;
}

function filterIrrelevantDays(days, currentMonth){
  const month = (currentMonth / 10 < 1) ? '0' + currentMonth : currentMonth; 
  const result = days.filter((day) => day.date.includes(`-${month}-`) && day.start && day.end);
  return result;
}

(async () => {
  // get months and year from input and parse them
  const halves = parseArguments();
  const currentMonth = halves["second"]["month"];
  const currentYear = halves["second"]["year"];

  // start puppeteer
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {
        width: 1366,
        height: 790
      }
    });
  const page = await browser.newPage();

  // browse to sign in page of biodata timewatch
  await page.goto('https://checkin.timewatch.co.il/punch/punch.php?e=1');

  // login to biodata time-watch
  await loginToBiodataTimeWatch(page);

  // get the url to the hours table from the link in the home page
  const linkCssSelector = 'body > div:nth-child(2) > span:nth-child(1) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > form:nth-child(1) > div:nth-child(1) > div:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(1) > b:nth-child(1) > a:nth-child(1)'
  const link = await page.$(linkCssSelector);
  const href = await page.evaluate(anchor => anchor.getAttribute('href'), link);

  // construct the full url
  const baseUrl = 'https://checkin.timewatch.co.il/punch/';
  const params = href.substring(25, (href.length-3));
  
  let combinedDays = []
  for (const half of Object.values(halves)) {
    const monthAndYearParams = createMonthAndYearParams(half);
    await page.goto(baseUrl + params + monthAndYearParams);
    const rowsData = await getRawRowsData(page);
    const days = parseRows(rowsData);
    combinedDays.push(...days)
  }
  
  // this are all the working days of the given month
  const filteredDays = filterIrrelevantDays(combinedDays, currentMonth);

  // go to experis login page
  const experisLoginPage = 'https://bo.experis.co.il/login';
  await page.goto(experisLoginPage);

  // fill login form and submit
  await loginToExperisTimeWatch(page, experisCredentials);

  // map the raw data to rows of date and id
  const experisRowsData = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table.tbl_chart:nth-child(1) > tbody:nth-child(2) tr'))
    return rows.map((tr) => {
      return {
        dateText: tr.children[0].innerText.match(/^\d{1,2}\-\d{1,2}/),
        rowId: tr.getAttribute('id')
      }
    }).filter(row => row.rowId !== null)
  });

  for (day of filteredDays) {
    // try to find a matching row in the experisRows
    correspondingRow = experisRowsData.find(row => {
      // HACK: add a '0' to dates like 1/11 so it wont be matched with 11/11
      // TODO: move this hack to where the experis rows are parsed
      let experisDateArray = row.dateText[0].toString().split("-");
      let [d, m] = experisDateArray;
      d = (d.length === 1) ? "0" + d : d;
      m = (m.length === 1) ? "0" + m : m;
      const experisDate = d + "-" + m;
      return day.date.includes(experisDate);
    });
    if (correspondingRow) {
      // if the row was matched with a row in experisRows, type in the hours
      const rowId = correspondingRow.rowId.slice(11);
      const startId = 'time_report_' + rowId + '_start_time';
      const endId = 'time_report_' + rowId + '_end_time';
      await page.type(`#${startId}`, day.start);
      await page.type(`#${endId}`, day.end);
    }
  }

  await page.click('#button_save');

  await browser.close();
})();