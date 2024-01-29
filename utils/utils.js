const { run } = require("hardhat");

const verify = async (contractAddress, args) => {
    console.log("Verifying...");
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        });
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already verified");
        } else {
            console.log(e);
        }
    }
};

const convertTokens = (amount, decimals) => {
    return BigInt(amount * 10 ** decimals);
};

module.exports = {
    verify,
    convertTokens,
};
