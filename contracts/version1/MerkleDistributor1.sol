//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract MerkleDistributor1 {
    bytes32 public immutable merkleRoot;
    uint256 public immutable airdropAmount;

    mapping(address => bool) public isClaimed;

    constructor(bytes32 _merkleRoot, uint256 _airdropAmount) {
        merkleRoot = _merkleRoot;
        airdropAmount = _airdropAmount;
    }

    function claim(
        address account,
        address token,
        bytes32[] calldata merkleProof
    ) public {
        require(!isClaimed[account], "Already claimed.");

        bytes32 node = keccak256(abi.encodePacked(account));
        bool isValidProof = MerkleProof.verifyCalldata(
            merkleProof,
            merkleRoot,
            node
        );
        require(isValidProof, "Invalid Proof.");
        require(
            IERC20(token).transfer(account, airdropAmount),
            "Transfer failed."
        );
        isClaimed[account] = true;
    }
}
