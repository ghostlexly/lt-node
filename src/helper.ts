import chalk from "chalk";
import { spawn, SpawnOptions } from "child_process";

class Helper {
  asyncSpawn = (command: string, options: SpawnOptions = {}) => {
    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, {
        shell: true,
        stdio: ["inherit", "inherit", "inherit"], // This pipes both stdout and stderr to the parent process (same as: `childProcess.stdout?.pipe(process.stdout);`)
        ...options,
      });

      childProcess.on("exit", (code) => {
        if (code !== 0) {
          reject(`Child process exited with code ${code}.`);
        }

        resolve(true);
      });

      childProcess.on("error", (error) => {
        reject(`Error on process spawn: ${error.message}.`);
      });

      // Handle the SIGINT signal (Ctrl+C) to stop the child process before exiting
      process.on("exit", () => {
        childProcess.kill();
      });
    });
  };

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
