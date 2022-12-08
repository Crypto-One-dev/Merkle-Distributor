//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.17;

// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FakeERC20 {
    function transfer(address to, uint256 amount) external returns (bool) {
        return true;
    }
}
