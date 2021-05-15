const flags = {
  generatePdf: false,
  backupPdf: false,
  submitHours: false,
};

const halves = {
  first: {},
  second: {},
};

function parseArguments() {
  const args = process.argv.slice(2);
  args.forEach((arg) => {
    if (arg.match(/-[my]=\d/)) {
      let [unit, number] = arg.slice(1).split("=");
      number = parseInt(number);
      if (unit === "m") {
        halves.first.month = number - 1;
        halves.second.month = number;
      } else {
        halves.first.year = halves.second.year = number;
      }
    } else if (arg === "-gp") {
      flags.generatePdf = true;
    } else if (arg === "-gpb") {
      flags.generatePdf = true;
      flags.backupPdf = true;
    } else if (arg === "-s") {
      flags.submitHours = true;
    }
  });
  if (halves.first.month === 0) {
    halves.first = { month: 12, year: halves.first.year - 1 };
  }
  return { halves, flags };
}

module.exports = {
  parseArguments,
};
