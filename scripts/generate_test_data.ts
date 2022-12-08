import crypto from "crypto";
import { ethers } from "ethers";
import fs from "fs";
import { getRandomInt } from "../util/util";

//Generate 100 acounts and amount, Save as CSV file
const generate = () => {
    let test_data: any[] = ["account,amount"];
    for (let i = 0; i < 100; i++) {
        let id = crypto.randomBytes(32).toString("hex");
        let privateKey = "0x" + id;
        let wallet = new ethers.Wallet(privateKey);
        let amount = getRandomInt(50, 100);
        test_data.push([ wallet.address, ethers.utils.parseUnits(amount.toString(), 18) ]);
    }

    fs.writeFile("./data/test_data.csv", test_data.join("\n"), "utf-8", (err: any) => {
        if (err) {
          console.log("Some error occured - file either not saved or corrupted file saved.");
        } else{
          console.log("It\'s saved!");
        }
      });
}

generate();