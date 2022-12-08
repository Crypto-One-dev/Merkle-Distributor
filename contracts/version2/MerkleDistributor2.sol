//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract MerkleDistributor2 {
    bytes32 public immutable merkleRoot;
    address public immutable airdropToken;
    uint256 public immutable airdropAmount;

    mapping(address => bool) public isClaimed;

    constructor(
        bytes32 _merkleRoot,
        address _airdropToken,
        uint256 _airdropAmount
    ) {
        merkleRoot = _merkleRoot;
        airdropToken = _airdropToken;
        airdropAmount = _airdropAmount;
    }

    function claim(address account, bytes32[] calldata merkleProof) external {
        require(!isClaimed[account], "Already claimed.");

        bytes32 node = keccak256(abi.encodePacked(account));
        bool isValidProof = MerkleProof.verifyCalldata(
            merkleProof,
            merkleRoot,
            node
        );
        require(isValidProof, "Invalid Proof.");
        isClaimed[account] = true;
        require(
            IERC20(airdropToken).transfer(account, airdropAmount),
            "Transfer failed."
        );
    }
}
