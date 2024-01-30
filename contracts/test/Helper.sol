// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.23;

import "../Faucet.sol";

contract Helper {
    function getTokensThroughProxy(address _faucetContract) external {
        Faucet(_faucetContract).getTokens();
    }
}
