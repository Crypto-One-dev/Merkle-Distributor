import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { MerkleDistributor3__factory, MockERC20__factory } from "../typechain";
import { getRandomInt, get_MerkleTree } from "../util/util";
describe("Merkle distirubtor version 3 test", () => {
  // Define a fixture to reuse the same setup in every test.
  // Use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  const deployFixture = async () => {
    const [owner] = await ethers.getSigners();

    const mockERC20 = await new MockERC20__factory(owner).deploy("Test Token", "TT", ethers.utils.parseEther("20000"));
    const {merkleTree, accountList }= await get_MerkleTree();
    const merkleRoot = merkleTree.getHexRoot();
    const airdropAmount = ethers.utils.parseEther("100");
    const reclamationPeriod = 2 * 3600; //2 hours
    const merkleDistributor = await new MerkleDistributor3__factory(owner).deploy(merkleRoot, mockERC20.address, airdropAmount, reclamationPeriod);
    const accountNum = getRandomInt(0, 99);
    const testAddr = accountList[accountNum];
    const leafNode = ethers.utils.keccak256(Buffer.from(testAddr.replace("0x", ""), "hex"));
    return { owner, mockERC20, merkleDistributor, merkleTree, accountList, accountNum, testAddr, leafNode };
  }

  const increaseTime = async (seconds: any) => {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    const blockCount = parseInt(seconds) / 3;
    for (let i = 0; i <= blockCount; i++) {
      await ethers.provider.send('evm_mine', []);
    }
  }

  describe("submitClaim test", () => {
    it("Should update claim struct if submitClaim success", async function () {
      const { mockERC20, merkleDistributor, merkleTree, testAddr, leafNode } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("10000"));
      await merkleDistributor.submitClaim(testAddr, merkleTree?.getHexProof(leafNode));
      const submitTime = await (await merkleDistributor.claims(testAddr)).submitTime;
      const isClaimed = await (await merkleDistributor.claims(testAddr)).isClaimed;
      const isFrozen = await (await merkleDistributor.claims(testAddr)).isFrozen;
      expect(submitTime > BigNumber.from(0)).is.equal(true);
      expect(isClaimed).is.equal(false);
      expect(isFrozen).is.equal(false);
    });

    it("Should not submit claim again which is already submitted", async function () {
      const { mockERC20, merkleDistributor, merkleTree, testAddr, leafNode } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("10000"));
      await merkleDistributor.submitClaim(testAddr, merkleTree?.getHexProof(leafNode));
      await expect(merkleDistributor.submitClaim(testAddr, merkleTree?.getHexProof(leafNode))).revertedWith("Already submitted.");
    });

    it("Should use right MerkleProof", async () => {
      const { mockERC20, merkleDistributor, merkleTree, accountList, accountNum, testAddr } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("10000"));
      let accountNum1 = 1;
      while (accountNum === accountNum1)
          accountNum1 = getRandomInt(0, 99);
      const testAddr1 = accountList[accountNum1];
      const leafNode1 = ethers.utils.keccak256(Buffer.from(testAddr1.replace("0x", ""), "hex"));
      await expect(merkleDistributor.submitClaim(testAddr, merkleTree?.getHexProof(leafNode1))).revertedWith("Invalid Proof.");
    });
  });

  describe("executeClaim test", async () => {
    it("Should submitted before claim", async () => {
      const { mockERC20, merkleDistributor, testAddr } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("10000"));
      await expect(merkleDistributor.executeClaim(testAddr)).revertedWith("Not submitted yet.");  
    });

    it("Should claim after the reclamationPeriod passed", async () => {
      const { mockERC20, merkleDistributor, merkleTree, testAddr, leafNode } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("10000"));
      await merkleDistributor.submitClaim(testAddr, merkleTree?.getHexProof(leafNode));
      await increaseTime(1 * 3600);
      await expect(merkleDistributor.executeClaim(testAddr)).revertedWith("Still not claimable.");  
    });

    it("Should not claim 2 or more times", async () => {
      const { mockERC20, merkleDistributor, merkleTree, testAddr, leafNode } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("10000"));
      await merkleDistributor.submitClaim(testAddr, merkleTree?.getHexProof(leafNode));
      await increaseTime(2 * 3600);
      await merkleDistributor.executeClaim(testAddr);
      await expect(merkleDistributor.executeClaim(testAddr)).revertedWith("Already claimed.");  
    });

    it("Should not claim if account is frozen", async () => {
      const { mockERC20, merkleDistributor, merkleTree, testAddr, leafNode } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("10000"));
      await merkleDistributor.submitClaim(testAddr, merkleTree?.getHexProof(leafNode));
      await merkleDistributor.dispute(testAddr);
      await increaseTime(2 * 3600);
      await expect(merkleDistributor.executeClaim(testAddr)).revertedWith("Account is frozen.");  
    });

    it("Should have enough airdrop tokens in contract", async () => {
      const { mockERC20, merkleDistributor, merkleTree, testAddr, leafNode } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("99"));
      await merkleDistributor.submitClaim(testAddr, merkleTree?.getHexProof(leafNode));
      await increaseTime(2 * 3600);
      await expect(merkleDistributor.executeClaim(testAddr)).revertedWith("ERC20: transfer amount exceeds balance");  
    });

    it("Should update claim status if transaction success", async () => {
      const { mockERC20, merkleDistributor, merkleTree, testAddr, leafNode } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("10000"));
      await merkleDistributor.submitClaim(testAddr, merkleTree?.getHexProof(leafNode));
      await increaseTime(2 * 3600);
      await merkleDistributor.executeClaim(testAddr);
      const isClaimed = await (await merkleDistributor.claims(testAddr)).isClaimed;
      expect(isClaimed).to.equal(true);
    });
    
    it("Should transfer airdrop token to target account", async () => {
      const { mockERC20, merkleDistributor, merkleTree, testAddr, leafNode } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("10000"));
      await merkleDistributor.submitClaim(testAddr, merkleTree?.getHexProof(leafNode));
      await increaseTime(2 * 3600);
      await merkleDistributor.executeClaim(testAddr);
      expect(await mockERC20.balanceOf(testAddr)).to.equal(ethers.utils.parseEther("100"));
    });
  });

  describe("dispute test", () => {
    it("Should not dispute which is not submitted", async () => {
      const { merkleDistributor, testAddr} = await loadFixture(deployFixture);
      await expect(merkleDistributor.dispute(testAddr)).revertedWith("Not submitted yet.");
    });

    it("Should not dispute which is already claimed", async () => {
      const { mockERC20, merkleDistributor, merkleTree, testAddr, leafNode } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("10000"));
      await merkleDistributor.submitClaim(testAddr, merkleTree?.getHexProof(leafNode));
      await increaseTime(2 * 3600);
      await merkleDistributor.executeClaim(testAddr);
      await expect(merkleDistributor.dispute(testAddr)).revertedWith("Already claimed.");
    });

    it("Should not dispute which is already frozen", async () => {
      const { mockERC20, merkleDistributor, merkleTree, testAddr, leafNode } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("10000"));
      await merkleDistributor.submitClaim(testAddr, merkleTree?.getHexProof(leafNode));
      await merkleDistributor.dispute(testAddr);
      await expect(merkleDistributor.dispute(testAddr)).revertedWith("Account is already frozen.");
    });

    it("Should update isFrozen if transaction success", async () => {
      const { mockERC20, merkleDistributor, merkleTree, testAddr, leafNode } = await loadFixture(deployFixture);
      await mockERC20.transfer(merkleDistributor.address, ethers.utils.parseEther("10000"));
      await merkleDistributor.submitClaim(testAddr, merkleTree?.getHexProof(leafNode));
      await merkleDistributor.dispute(testAddr);
      const isFrozen = await (await merkleDistributor.claims(testAddr)).isFrozen;
      await expect(isFrozen).is.equal(true);
    });
  });
});
