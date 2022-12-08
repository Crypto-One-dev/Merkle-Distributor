import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleDistributor2__factory, MockERC20__factory } from "../typechain";
import { getRandomInt, get_MerkleTree } from "../util/util";
describe("Merkle distirubtor version 2 test", () => {
  // Define a fixture to reuse the same setup in every test.
  // Use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  const deployFixture = async () => {
    const [owner] = await ethers.getSigners();

    const mockERC20 = await new MockERC20__factory(owner).deploy("Test Token", "TT", ethers.utils.parseEther("20000"));
    const { merkleTree, accountList } = await get_MerkleTree();
    
    const merkleRoot = merkleTree.getHexRoot();
    const airdropAmount = ethers.utils.parseEther("100");

    const merkleDistributor = await new MerkleDistributor2__factory(owner).deploy(merkleRoot, mockERC20.address, airdropAmount);
    const accountNum = getRandomInt(0, 99);
    const testAddr = accountList[accountNum];
    const leafNode = ethers.utils.keccak256(Buffer.from(testAddr.replace("0x", ""), "hex"));
    return { owner, mockERC20, merkleDistributor, merkleTree, accountList, accountNum, testAddr, leafNode };
  }

  describe("Merkle Distributor version 2 unit test", () => {
    it("Should transfer airdrop token to target account", async () => {
      const { mockERC20, merkleDistributor, merkleTree, testAddr, leafNode } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("10000"));
      
      await merkleDistributor.claim(testAddr, merkleTree?.getHexProof(leafNode));
      expect(await mockERC20.balanceOf(testAddr)).to.equal(ethers.utils.parseEther("100"));
    });

    it("Should use right MerkleProof", async () => {
      const { mockERC20, merkleDistributor, merkleTree, accountList, accountNum, testAddr } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("10000"));
      let accountNum1 = 1;
      while (accountNum1 === accountNum)
          accountNum1 = getRandomInt(0, 99);
      const testAddr1 = accountList[accountNum1];
      const leafNode1 = ethers.utils.keccak256(Buffer.from(testAddr1.replace("0x", ""), "hex"));
      await expect(merkleDistributor.claim(testAddr, merkleTree?.getHexProof(leafNode1))).revertedWith("Invalid Proof.");

    });

    it("Should not claim double or more times", async function () {
      const { mockERC20, merkleDistributor, merkleTree, testAddr, leafNode } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("10000"));
      await merkleDistributor.claim(testAddr, merkleTree?.getHexProof(leafNode));
      await expect(merkleDistributor.claim(testAddr, merkleTree?.getHexProof(leafNode))).revertedWith("Already claimed.");
    });

    it("Should have enough airdrop tokens in contract", async function () {
      const { mockERC20, merkleDistributor, merkleTree, testAddr, leafNode } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("99"));
      await expect(merkleDistributor.claim(testAddr, merkleTree?.getHexProof(leafNode))).revertedWith("ERC20: transfer amount exceeds balance");
    });
  });
});
