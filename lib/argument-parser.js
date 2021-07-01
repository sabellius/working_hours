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
    this.halves = {
      
    }
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
    const halves = {};
    this.args.forEach(arg => {
      if (arg.match(/-[my]=\d/)) {
        let [unit, number] = arg.slice(1).split("=");
        number = parseInt(number);
        if (unit === "m") {
          halves.first.month = number - 1;
          halves.second.month = number;
        } else {
          halves.first.year = halves.second.year = number;
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

}

module.exports = new ArgumentsHelper();
