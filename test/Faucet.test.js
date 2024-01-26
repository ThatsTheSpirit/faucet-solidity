const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Faucet", function () {
    let owner, player, faucetContract, testTokenContract;
    beforeEach(async () => {
        const accounts = await ethers.getSigners();
        owner = accounts[0];
        player = accounts[1];
        const contracts = await loadFixture(deployFaucetFixture);
        faucetContract = contracts.faucetContract;
        testTokenContract = contracts.testTokenContract;
    });

    async function deployTestTokenFixture() {
        const testTokenContract = await ethers.deployContract("TestToken", [
            "TestToken",
            "TET",
        ]);
        await testTokenContract.waitForDeployment();

        const decimals = Number(await testTokenContract.decimals());

        return { testTokenContract, decimals };
    }

    async function deployFaucetFixture() {
        const { testTokenContract, decimals } = await loadFixture(
            deployTestTokenFixture,
        );
        const amountTokens = 0.5;
        const maxTokens = BigInt(amountTokens * 10 ** decimals);
        const interval = time.duration.hours(24);
        const faucetContract = await ethers.deployContract("Faucet", [
            testTokenContract.target,
            maxTokens,
            interval,
        ]);
        await faucetContract.waitForDeployment();
        return { testTokenContract, faucetContract };
    }

    describe("constructor", () => {
        it("should initialize state variables", async () => {
            const amountTokens = 0.5;
            const decimals = Number(await testTokenContract.decimals());
            const maxTokens = BigInt(amountTokens * 10 ** decimals);
            const interval = time.duration.hours(24);

            expect(await faucetContract.faucetToken()).to.equal(
                testTokenContract.target,
            );
            expect(await faucetContract.maxTokens()).to.equal(maxTokens);
            expect(await faucetContract.interval()).to.equal(interval);
        });
    });

    describe("pause", function () {
        it("only owner can pause", async () => {
            expect(await faucetContract.connect(owner).pause())
                .to.emit(faucetContract, "Paused")
                .withArgs(owner.address);
        });
        it("can't pause if the caller is not the owner", async () => {
            await expect(faucetContract.connect(player).pause())
                .to.be.revertedWithCustomError(
                    faucetContract,
                    "OwnableUnauthorizedAccount",
                )
                .withArgs(player.address);
        });
    });

    describe("unpause", function () {
        let tx, res;
        beforeEach(async () => {
            tx = await faucetContract.connect(owner).pause();
            res = await tx.wait();
        });
        it("only owner can unpause", async () => {
            expect(await faucetContract.connect(owner).unpause())
                .to.emit(faucetContract, "Unpaused")
                .withArgs(owner.address);
        });
        it("can't unpause if the caller is not the owner", async () => {
            await expect(faucetContract.connect(player).unpause())
                .to.be.revertedWithCustomError(
                    faucetContract,
                    "OwnableUnauthorizedAccount",
                )
                .withArgs(player.address);
        });

        it("can't unpause if paused is false", async () => {
            await faucetContract.connect(owner).unpause();
            await expect(
                faucetContract.connect(owner).unpause(),
            ).to.be.revertedWithCustomError(faucetContract, "ExpectedPause");
        });
    });
});
