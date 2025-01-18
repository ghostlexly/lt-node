import chalk from "chalk";

class Logger {
  log = ({
    message,
    type = "info",
  }: {
    message: string;
    type?: "info" | "error";
  }) => {
    let typeTag = `info`;

    if (type === "error") {
      typeTag = `${chalk.red("error")}`;
    } else if (type === "info") {
      typeTag = `${chalk.yellow("info")}`;
    }

    console.log(`${chalk.green("[lt-node]")} - ${typeTag}: ${message}`);
  };
}

export const logger = new Logger();
