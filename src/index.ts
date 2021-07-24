#!/usr/bin/env node
var HTMLParser = require("node-html-parser");
const prettier = require("prettier");
import {
  fileExists,
  mkDir,
  readFile,
  readFilesInDir,
  readFileSync,
  rmDir,
  saveDataToFile,
} from "./utils/fs";

const defaultConfig = {
  partialDirectory: "partials",
  syntax: "partial",
  output: "dist",
  ext: ".html",
  src: ".",
};

export class Gluu {
  private config = { ...defaultConfig };
  private showLogs = false;
  constructor(args: any) {
    if (args.includes("--logs") || args.includes("-l")) {
      this.showLogs = true;
      console.log("================");
      console.log("Debug Mode Enabled");
      console.log("================");
    }
    this.initialize();
    if (args.includes("init")) {
      this.createConfigFile();
    } else {
      this.readConfigFile();
      this.readEntryDir(this.config.src);
    }
  }

  private readEntryDir = async (path: string) => {
    const files = await readFilesInDir(path, this.config.ext);
    files.forEach((file) => this.processFile(file));
  };
  private readConfigFile = () => {
    if (fileExists("./gluu.config.json")) {
      readFile("./gluu.config.json", (data) => {
        this.config = { ...JSON.parse(data) };
      });
    } else {
      if (this.showLogs)
        console.log("cannot read: gluu.config.json doesn't exists.");
    }
  };

  private initialize = () => {
    if (this.showLogs)
      console.log("creating " + this.config.output + " directory");
    if (fileExists("./" + this.config.output + "/")) {
      rmDir("./" + this.config.output + "/", () => {
        mkDir("./" + this.config.output + "/");
      });
    } else {
      mkDir("./" + this.config.output + "/");
    }
  };

  private saveFile = (data: any, fileName: string) => {
    if (this.showLogs) console.log("generating " + fileName);
    const formattedData = prettier.format("" + data, {
      semi: false,
      parser: "html",
    });
    saveDataToFile(fileName, formattedData);
  };

  private processFile = (fileName: string) => {
    readFile(fileName, (data) => {
      const root = HTMLParser.parse(data);
      const partials = root.querySelectorAll(this.config.syntax);
      if (partials.length === 0)
        return this.saveFile(root, this.config.output + "/" + fileName);
      console.log(partials.length);
      partials.forEach((partial: HTMLElement, index: number) => {
        const partialName = partial.getAttribute("name");
        const attrs = partial.attributes;
        const keys = Object.keys(attrs);
        const partialFileData = readFileSync(
          "./" + this.config.partialDirectory + "/" + partialName
        );
        let filteredData = "" + this.filterPartialHTML(partialFileData);
        keys.forEach((key) => {
          let reg = new RegExp("\\{\\b" + key + "\\b\\}");

          filteredData = filteredData.replace(reg, attrs[key]);
          filteredData = filteredData.replace("{content}", partial.innerHTML);
        });
        partial.insertAdjacentHTML("afterend", filteredData);
        partial.remove();
        if (partials.length === index + 1) {
          this.saveFile(root, this.config.output + "/" + fileName);
        }
      });
    });
  };

  private filterPartialHTML = (rawHtml: string) => {
    const htmlTree = HTMLParser.parse(rawHtml);
    htmlTree.querySelectorAll("ignore").forEach((element) => {
      element.remove();
    });
    return htmlTree;
  };

  private createConfigFile = () => {
    if (!fileExists("./gluu.config.json")) {
      this.saveFile(JSON.stringify(this.config), "gluu.config.json");
    }
    if (!fileExists(this.config.partialDirectory)) {
      mkDir("./" + this.config.partialDirectory + "/");
    }
  };
}