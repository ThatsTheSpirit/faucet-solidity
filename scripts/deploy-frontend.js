const fs = require("fs");
const { ethers, network } = require("hardhat");

const FRONT_END_ABI_FAUCET_FILE = "FaucetABI.json";
const FRONT_END_ABI_TEST_TOKEN_FILE = "TestTokenABI.json";
const FRONT_END_ADDRESSES_FILE = "ContractAddresses.json";

async function writeAbiToFile() {
    const faucetContract = await ethers.getContractAt("Faucet");
    const faucetAbi = faucetContract.interface.formatJson();
    fs.writeFileSync(FRONT_END_ABI_FAUCET_FILE, faucetAbi);
}

async function writeAddressesToFile() {
    const faucetContract = await ethers.getContractAt("Faucet");
    const chainId = network.config.chainId.toString();
    const currentAddresses = JSON.parse(
        fs.readFileSync(FRONT_END_ABI_TEST_TOKEN_FILE, "utf8"),
    );

    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(faucetContract.target)) {
            currentAddresses[chainId].push(faucetContract.target);
        }
    } else {
        currentAddresses[chainId] = [faucetContract.target];
    }

    fs.writeFileSync(
        FRONT_END_ADDRESSES_FILE,
        JSON.stringify(currentAddresses),
    );
}

module.exports = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating frontend...");
        await writeAbiToFile();
        await writeAddressesToFile();
    }
};
