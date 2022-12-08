# Merkle Distributor Test

Install packages

    npm install

Test smart contract

    npm run test

## Prepare test data

    Create 100 random test accounts:

    npm run generate

    This command will create a "test_data.csv" file which include address and amount.
    I made random amount because maybe airdrop amount is not fixed and have tiers in airdrop.
    But for this test case, airdrop amount is fixed for all users so we can simply use addresses only.

    We can create MerkleTree from merkletree npm package.
    get_merkleTree() function in util will provide merkleTree and accountList( 100 in test).
    MerkleTree is providing merkleRoot, merkleProof, etc...

## 1. Merkle Distributor version 1

    MerkleDistributor1.sol is Merkle-distributor contract.
    There is a claim function which includes 2 addresses and calldata.
    calldata will be MerkleProof and it is provided by MerkleTree.
    This function verifies account is part of the merkle tree and transfer token to account(100).

## Merkle Distributor version 1's vulnerabilities

    Claim function has airdrop token address and this can make some problems.
    1. Attacker can claim other tokens instead of airdrop token.
    2. Attacker can use fake token address to prevent users' claim.
    3. Claim function has external call so for secure purpose we need to use Checks-Effects-Interactions pattern. Also I
       used ReentrancyGuard.sol to use nonReentrant modifier.

## 2. Merkle Distributor version 2

    In MerleDistributor2.sol I fixed version 1's vulnerabilities.

    By removing token address in claim function, I prevented the vulnerabilities.
    Instead, I added airdrop token in constructor.

## 3. Merkle Distributor version 3

    In MerleDistributor3.sol I added additional functionalities.

    - Ensure that claims do not have to be from the msg.sender, such that this contract can be used with CoWs.
        I didn't set msg.sender in functions so that it can be used with CoWs.
    - Add a timeout to claims, such that we can add optimistic disputing.
        To Add a timeout to claims, I made submitClaim and executeClaim.
        And users can call executeClaim after certain time passed. ( I set 2 hours in the test)
    - Add a public dispute function, such that anyone can put down a stake to ensure a certain claim is frozen.
        I made dispute function which anyone can dispute for certain address.
    - Ensure that the dispute function cannot be front-run
        I am not sure for the front-run in dispute function.
        At first, I thought it is front running but it's not useful for airdrop.
        So I made the dispute function can be called after user submit the claim.
