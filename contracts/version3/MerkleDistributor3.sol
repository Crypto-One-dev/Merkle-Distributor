//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MerkleDistributor3 is ReentrancyGuard {
    bytes32 public immutable merkleRoot;
    address public immutable airdropToken;
    uint256 public immutable airdropAmount;
    uint256 public immutable reclamationPeriod;

    struct Claim {
        uint256 submitTime;
        bool isClaimed;
        bool isFrozen;
    }

    mapping(address => Claim) public claims;

    constructor(
        bytes32 _merkleRoot,
        address _airdropToken,
        uint256 _airdropAmount,
        uint256 _reclamationPeriod
    ) {
        merkleRoot = _merkleRoot;
        airdropToken = _airdropToken;
        airdropAmount = _airdropAmount;
        reclamationPeriod = _reclamationPeriod;
    }

    function submitClaim(address account, bytes32[] calldata merkleProof)
        external
        nonReentrant
    {
        Claim storage sClaim = claims[account];
        require(sClaim.submitTime == 0, "Already submitted.");

        bytes32 node = keccak256(abi.encodePacked(account));
        bool isValidProof = MerkleProof.verifyCalldata(
            merkleProof,
            merkleRoot,
            node
        );
        require(isValidProof, "Invalid Proof.");
        sClaim.submitTime = block.timestamp;
    }

    function executeClaim(address account) external nonReentrant {
        Claim storage eClaim = claims[account];
        require(eClaim.submitTime != 0, "Not submitted yet.");
        require(
            block.timestamp >= (eClaim.submitTime + reclamationPeriod),
            "Still not claimable."
        );
        require(!eClaim.isClaimed, "Already claimed.");
        require(!eClaim.isFrozen, "Account is frozen.");
        eClaim.isClaimed = true;
        require(
            IERC20(airdropToken).transfer(account, airdropAmount),
            "Transfer failed."
        );
    }

    function dispute(address account) external nonReentrant {
        Claim storage dClaim = claims[account];
        require(dClaim.submitTime != 0, "Not submitted yet.");
        require(!dClaim.isClaimed, "Already claimed.");
        require(!dClaim.isFrozen, "Account is already frozen.");

        dClaim.isFrozen = true;
    }
}
