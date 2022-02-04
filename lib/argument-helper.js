const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <command> [options]')
  .help('h')
  .alias('h', 'help')
  .argv

class ArgumentsHelper {
  constructor() {
    this.args = process.argv.slice(2);
    this.flags = {
      generatePdf: false,
      backupPdf: false,
      submitHours: false,
      cleanFiles: false,
      showHelp: false
    };
  }

  parseFlags() {
    this.args.forEach((arg) => {
      if (arg === "-gp") {
        this.flags.generatePdf = true;
      } else if (arg === "-gpb") {
        this.flags.generatePdf = true;
        this.flags.backupPdf = true;
      } else if (arg === "-s") {
        this.flags.submitHours = true;
      } else if (arg === "-c") {
        this.flags.cleanFiles = true;
      } else if (arg == "-h") {
        this.flags.showHelp = true
      }
    });
    return this.flags
  }

  parseMonths() {
    const halves = { first: {}, second: {} };
    this.args.forEach(arg => {
      if (arg.match(/-[my]=\d/)) {
        const [unit, number] = arg.slice(1).split("=");
        const parsedNumber = parseInt(number);
        if (unit === "m") {
          halves.first.month = parsedNumber - 1;
          halves.second.month = parsedNumber;
        } else {
          halves.first.year = halves.second.year = parsedNumber;
        }
      }
    });
    if (halves.first?.month === 0) {
      halves.first = { month: 12, year: halves.first.year - 1 };
    }
    return halves
  }

  showHelp() {
    console.log("Required arguments:")
    console.log("\t-m=<month> (no leading zero)")
    console.log("\t-y=<year> (YYYY format)")
    console.log("Possible flags:")
    const flags = [
      "-gp - will generate a pdf file",
      "-gpb - will generate a pdf file and back it up to the configured directory",
      "-c - will delete the generated pdf files after they are generated",
      "-s - will submit the working hours after filling them (and also upload the pdf if the flag was passed)",
      "-h - will show this help menu"
    ]
    flags.forEach(flag => console.log("\t" + flag));
  }

  createMonthAndYearParams({ month, year }) {
    const m = month / 10 < 1 ? "0" + month : month;
    return `${m}-${year}`;
  }

}

module.exports = new ArgumentsHelper();
