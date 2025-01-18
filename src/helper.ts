import chalk from "chalk";
import { spawn, SpawnOptions } from "child_process";

class Helper {
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
    }

    console.log(`${chalk.green("[lt-node]")} - ${typeTag}: ${message}`);
  };
}

export const helper = new Helper();
