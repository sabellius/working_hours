const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const options = {
  m: {
    alias: "month",
    describe: "the number of the month to fill",
    demandOption: true,
    group: "Required:"
  },
  y: {
    alias: "year",
    describe: "the full year",
    default: new Date().getFullYear(),
    defaultDescription: "the current year",
    group: "Required:"
  },
  c: {
    alias: "cleanup",
    describe: "remove the generated pdf files",
    implies: "g"
  },
  s: {
    alias: "submit",
    describe: "submit the filled hours and the generated files"
  },
  g: {
    alias: "generate-pdf",
    describe: "export working hours to pdf",
    type: "boolean"
  }
}

const report = [
  "report",
  "generate report of missing hours",
  {
    url: {
      alias: 'u',
      default: 'http://yargs.js.org/'
    },
    m: options.m,
    y: options.y
  }
]

const arguments = yargs(hideBin(process.argv))
.usage('Usage: $0 <command> [required][options]')
.help('h')
.alias('h', 'help')
.version(false)
.strict()
.command(...report)
.options(options)
.argv

console.log('arguments: ', arguments);
console.log('arguments: ', typeof arguments);
// class ArgumentsHelper {
//   constructor() {
//     this.args = process.argv.slice(2);
//     this.flags = {
//       generatePdf: false,
//       backupPdf: false,
//       submitHours: false,
//       cleanFiles: false,
//       showHelp: false
//     };
//   }

  // parseFlags() {
  //   this.args.forEach((arg) => {
  //     if (arg === "-gp") {
  //       this.flags.generatePdf = true;
  //     } else if (arg === "-gpb") {
  //       this.flags.generatePdf = true;
  //       this.flags.backupPdf = true;
  //     } else if (arg === "-s") {
  //       this.flags.submitHours = true;
  //     } else if (arg === "-c") {
  //       this.flags.cleanFiles = true;
  //     } else if (arg == "-h") {
  //       this.flags.showHelp = true
  //     }
  //   });
  //   return this.flags
  // }


  // showHelp() {
  //   console.log("Required arguments:")
  //   console.log("\t-m=<month> (no leading zero)")
  //   console.log("\t-y=<year> (YYYY format)")
  //   console.log("Possible flags:")
  //   const flags = [
  //     "-gp - will generate a pdf file",
  //     "-gpb - will generate a pdf file and back it up to the configured directory",
  //     "-c - will delete the generated pdf files after they are generated",
  //     "-s - will submit the working hours after filling them (and also upload the pdf if the flag was passed)",
  //     "-h - will show this help menu"
  //   ]
  //   flags.forEach(flag => console.log("\t" + flag));
  // }

  // createMonthAndYearParams({ month, year }) {
  //   const m = month / 10 < 1 ? "0" + month : month;
  //   return `${m}-${year}`;
  // }

// }

function parseMonths(arguments) {
  const { month, year } = arguments;
  console.log('month, year: ', month, year);
  return [
    { month: month == 12 ? 11 : month - 1, year: month == 1 ? year - 1 : year },
    { month, year }
  ]
}

const halves = parseMonths(arguments)

module.exports = {
  arguments,
  halves
}
