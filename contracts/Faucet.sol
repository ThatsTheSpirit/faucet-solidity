// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Faucet is Pausable, Ownable {
    /**
     * @dev Emitted when the request is sent.
     */
    event Request(address indexed account, uint amount, uint timestamp);

    /**
     * @dev The operation failed because too little time has passed.
     */
    error WrongRequestTime();

    /**
     * @dev The operation failed because the account has enough tokens.
     */
    error TooManyTokens(uint balance);

    /**
     * @dev The operation failed because the caller is not an EOA.
     */
    error NotAnEOA();

    IERC20 public faucetToken;
    uint public maxTokens;
    uint public interval;
    mapping(address => uint) public timestamps;

    /**
     * @dev Throws if too little time has passed.
     */
    modifier onlyOnTime(address _receiver) {
        if (block.timestamp <= timestamps[_receiver] + interval) {
            revert WrongRequestTime();
        }
        _;
    }

    modifier onlyEOA() {
        if (msg.sender != tx.origin) {
            revert NotAnEOA();
        }
        _;
    }

    /**
     * @dev Throws if the caller has enough tokens.
     */
    modifier onlyCorrectBalance(address _receiver) {
        uint userBalance = faucetToken.balanceOf(_receiver);
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

    function setMaxTokensToGet(uint _maxTokens) external onlyOwner {
        maxTokens = _maxTokens;
    }

    function setInterval(uint _interval) external onlyOwner {
        interval = _interval;
    }

    /**
     * @dev Transfers tokens to the caller and stores last time.
     * The caller has to call approve function on this contract.
     */
    function getTokens(
        address _receiver
    )
        external
        whenNotPaused
        onlyEOA
        onlyOnTime(_receiver)
        onlyCorrectBalance(_receiver)
    {
        timestamps[_receiver] = block.timestamp;
        faucetToken.transfer(_receiver, maxTokens);
        emit Request(_receiver, maxTokens, block.timestamp);
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

    function getBalance() external view returns (uint) {
        return faucetToken.balanceOf(address(this));
    }
}
