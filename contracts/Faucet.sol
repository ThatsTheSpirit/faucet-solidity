// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Faucet is Pausable, Ownable {
    /**
     * @dev Emitted when the request is sent.
     */
    event Request(address indexed account);

    /**
     * @dev The operation failed because too little time has passed.
     */
    error WrongRequestTime();

    /**
     * @dev The operation failed because the account has enough tokens.
     */
    error TooManyTokens(uint balance);

    IERC20 public faucetToken;
    uint public immutable maxTokens;
    uint public immutable interval;
    mapping(address => uint) public timestamps;

    /**
     * @dev Throws if too little time has passed.
     */
    modifier onlyOnTime() {
        if (block.timestamp <= timestamps[msg.sender] + interval) {
            revert WrongRequestTime();
        }
        _;
    }

    /**
     * @dev Throws if the caller has enough tokens.
     */
    modifier onlyCorrectBalance() {
        uint userBalance = faucetToken.balanceOf(msg.sender);
        if (userBalance >= maxTokens) {
            revert TooManyTokens(userBalance);
        }
        _;
    }

    /**
     * @dev Initializes the contract setting the address of ERC20 token, the max amount of one-time payment and the time interval between payments.
     */
    constructor(
        address _faucetToken,
        uint _maxTokens,
        uint _interval
    ) Ownable(msg.sender) {
        faucetToken = IERC20(_faucetToken);
        maxTokens = _maxTokens;
        interval = _interval;
    }

    /**
     * @dev Transfers tokens to the caller and stores last time.
     */
    function getTokens() external whenNotPaused onlyOnTime onlyCorrectBalance {
        timestamps[msg.sender] = block.timestamp;
        faucetToken.transfer(msg.sender, maxTokens);
        emit Request(msg.sender);
    }

    function deposit(uint _amount) external {
        faucetToken.transferFrom(msg.sender, address(this), _amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
