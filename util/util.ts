import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";
import Web3 from "web3";

import csv from "csv-parser";
import fs from "fs";

const web3 = new Web3();

export const get_MerkleTree = async (): Promise<{merkleTree: MerkleTree, accountList: any[]}> => {
    let data: any[] = [];
    let balances: any[] = [];
    let accountList: any[] = [];
    let merkleTree: any;
    const promise = new Promise<{merkleTree: MerkleTree, accountList: any[]}>(resolve => {
        fs.createReadStream("./data/test_data.csv")
            .pipe(csv())
            .on("data", (item: any) => {
                return data.push(item);
            })
            .on("end", async () => {
                let attrs: any = {};
                for (let i = 0; i < data.length; i++) {
                    attrs["account"] = data[i]["account"];
                    attrs["amount"] = web3.eth.abi.encodeParameter(
                        "uint256",
                        data[i]["amount"]
                    );
                
                    balances.push(attrs);
                    attrs = {};
                }

                accountList = balances.map((balance) => {
                    balance = balance.account;
                    return balance;
                });

                //Seperate in 2 cases
                //1st case: radom airdrop amount
                const leafNodes1 = balances.map((balance) =>
                    keccak256(
                        Buffer.concat([
                            Buffer.from(balance.account.replace("0x", ""), "hex"),
                            Buffer.from(balance.amount.replace("0x", ""), "hex"),
                        ])
                    )
                );

                //2nd case: fixed airdrop amount
                let leafNodes2: any[] = balances.map((balance) =>
                    keccak256(
                        Buffer.from(balance.account.replace("0x", ""), "hex")
                    )
                );
                merkleTree = new MerkleTree(leafNodes2, keccak256, { sortPairs: true });
            
                resolve({ merkleTree, accountList });
            });
    });
    return promise;
}

export const getRandomInt = (min:any, max:any) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}