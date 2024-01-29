const hre = require("hardhat");
const {
    developmentChains,
    networkConfig,
} = require("../hardhat-helper-config");
const { network } = require("hardhat");
const { verify, convertTokens } = require("../utils/utils");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

async function main() {
    const chainId = network.config.chainId;
    const blockConfirmations = networkConfig[chainId].waitConfirmations || 1;
    const initialSupply = convertTokens(1e8, 18);
    const tokenArgs = ["TestToken", "TET", initialSupply];
    const testToken = await ethers.deployContract("TestToken", tokenArgs);
    await testToken.waitForDeployment();

    console.log(`TestToken deployed to ${testToken.target}`);

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        console.log("Verifying...");
        await testToken.deploymentTransaction().wait(blockConfirmations);
        await verify(testToken.target, tokenArgs);
    }

    const tokensPerDay = convertTokens(0.5, 18);
    const faucetInterval = time.duration.hours(24);
    const faucetArgs = [testToken.target, tokensPerDay, faucetInterval];
    const faucetContract = await hre.ethers.deployContract(
        "Faucet",
        faucetArgs,
    );
    await faucetContract.waitForDeployment();
    console.log(`Faucet deployed to ${faucetContract.target}`);

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        console.log("Verifying...");
        await faucetContract.deploymentTransaction().wait(blockConfirmations);
        await verify(faucetContract.target, faucetArgs);
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
