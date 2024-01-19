const networkConfig = {
    31337: {
        name: "localhost",
        waitConfirmations: 1,
    },
    11155111: {
        name: "sepolia",
        waitConfirmations: 6,
    },
    80001: {
        name: "mumbai",
        waitConfirmations: 6,
    },
};
const developmentChains = ["localhost", "hardhat"];

module.exports = { developmentChains, networkConfig };
