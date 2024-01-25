// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestToken is Ownable, ERC20 {
    constructor(
        string memory name_,
        string memory symbol_
    ) Ownable(msg.sender) ERC20(name_, symbol_) {}

    function mint(address _to, uint _amount) external onlyOwner {
        _mint(_to, _amount);
    }

    function burn(address _from, uint _amount) external onlyOwner {
        _burn(_from, _amount);
    }
}
