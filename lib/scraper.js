class Scraper {
  async loginToBiodata(page) {
    await page.goto("https://checkin.timewatch.co.il/punch/punch.php?e=1");
    await page.type("#compKeyboard", process.env.BD_COMPANY_NUMBER);
    await page.type("#nameKeyboard", process.env.BD_EMPLOYEE_NUMBER);
    await page.type("#pwKeyboard", process.env.BD_PASSWORD);
    const loginButtonSelector = ".roundedcornr_content_840695 > p:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(4) > td:nth-child(2) > input:nth-child(1)";
    await page.click(loginButtonSelector);
    await page.waitForNavigation();
  }

  async loginToExperis(page) {
    await page.goto("https://bo.experis.co.il/login");
    await page.type("#login", process.env.EX_LOGIN);
    await page.type("#password", process.env.EX_PASSWORD);
    await page.click("#login_commit");
    await page.waitForNavigation();
  }

  async getRowsFromBiodata(page) {
    // get raw rows data:
    const rawRows = await page.evaluate(() => {
      const rowsCssSelector = "body > div:nth-child(2) > span:nth-child(1) > p:nth-child(2) > table:nth-child(2) > tbody:nth-child(1) tr";
      const rows = Array.from(document.querySelectorAll(rowsCssSelector));
      return rows.map((tr) => (tr.childElementCount === 14 ? tr.innerText : null)).filter((row) => row !== null);
    });
    // parse rows to wanted format:
    const rows = rawRows.map((row) => {
      const rowArray = row.split("\t");
      const date = rowArray[0].match(/^\d{1,2}\-\d{1,2}\-\d{4}/)[0];
      const dayOff = rowArray[3].trim() === "חופש";
      const start = rowArray[4].trim();
      const end = rowArray[5].trim();
      return { date, start, end, dayOff };
    });
    return rows;
  }

  filterCombinedDays(days, currentMonth) {
    const month = currentMonth / 10 < 1 ? "0" + currentMonth : currentMonth;
    const result = days.filter((day) => day.date.includes(`-${month}-`) && (day.start && day.end || day.dayOff === true));
    return result;
  }

  async fillHours(page, filteredDays) {
    const experisHoursTable = await page.evaluate(() => {
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
    //
    for (const day of filteredDays) {
      // try to find a matching row in the experisRows
      const correspondingRow = experisHoursTable.find((row) => {
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
        const rowId = correspondingRow.rowId.slice(11);
        // if the row was matched with a row in experisRows, type in the hours
        if (day.dayOff === true) {
          const absenceReasonSelectSelector = "#time_report_" + rowId + "_time_report_cat_id";
          await page.select(absenceReasonSelectSelector, "477");
          
        } else {
          const startId = "time_report_" + rowId + "_start_time";
          const endId = "time_report_" + rowId + "_end_time";
          await page.type(`#${startId}`, day.start);
          await page.type(`#${endId}`, day.end);
        }
      }
    }
  }

}

module.exports = new Scraper();