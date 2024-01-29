const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { any } = require("hardhat/internal/core/params/argumentTypes");

function convertTokens(amount, decimals) {
    return BigInt(amount * 10 ** decimals);
}

describe("Faucet", function () {
    let owner, player, player2, faucetContract, testTokenContract;
    const amountTokens = 0.5,
        tokenDecimals = 18;
    beforeEach(async () => {
        const accounts = await ethers.getSigners();
        owner = accounts[0];
        player = accounts[1];
        player2 = accounts[2];
        const contracts = await loadFixture(deployFaucetFixture);
        faucetContract = contracts.faucetContract;
        testTokenContract = contracts.testTokenContract;
    });

    async function deployTestTokenFixture() {
        const initialSupply = convertTokens(100e6, 18);
        const testTokenContract = await ethers.deployContract(
            "TestToken",
            ["TestToken", "TET", initialSupply],
            owner,
        );
        await testTokenContract.waitForDeployment();

        //const decimals = Number(await testTokenContract.decimals());

        return { testTokenContract /*, decimals*/ };
    }

    async function deployFaucetFixture() {
        const { testTokenContract } = await loadFixture(deployTestTokenFixture);

        const tokensToDeposit = convertTokens(1000, tokenDecimals);
        const maxTokens = convertTokens(amountTokens, tokenDecimals);
        const interval = time.duration.hours(24);
        const faucetContract = await ethers.deployContract("Faucet", [
            testTokenContract.target,
            maxTokens,
            interval,
        ]);
        await faucetContract.waitForDeployment();

        //approve
        let tx = await testTokenContract
            .connect(owner)
            .approve(faucetContract.target, tokensToDeposit);
        await tx.wait();

        //deposit some tokens
        tx = await faucetContract.connect(owner).deposit(tokensToDeposit);
        await tx.wait();

        return { testTokenContract, faucetContract /*decimals*/ };
    }

    describe("constructor", () => {
        it("should initialize state variables", async () => {
            const maxTokens = convertTokens(amountTokens, tokenDecimals);
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

    describe("deposit", () => {
        it("can deposit tokens", async () => {
            const amount = convertTokens(amountTokens, tokenDecimals);
            let tx = await testTokenContract.approve(
                faucetContract.target,
                amount,
            );
            await tx.wait();

            await expect(
                faucetContract.connect(owner).deposit(amount),
            ).to.changeTokenBalances(
                testTokenContract,
                [owner, faucetContract],
                [-amount, amount],
            );
        });
    });

    describe("getTokens", () => {
        let tx, res;
        describe("Success", () => {
            beforeEach(async () => {
                tx = await faucetContract.connect(player).getTokens();
                res = await tx.wait();
            });

            it("saves the timestamp", async () => {
                const currTime = await time.latest();
                expect(
                    await faucetContract.timestamps(player.address),
                ).to.equal(currTime);
            });

            it("transfers tokens", async () => {
                const amount = await faucetContract.maxTokens();
                await expect(
                    faucetContract.connect(player2).getTokens(),
                ).to.changeTokenBalances(
                    testTokenContract,
                    [player2, faucetContract],
                    [amount, -amount],
                );
            });

            it("emits the Request event", async () => {
                const filter = faucetContract.filters.Request;
                const events = await faucetContract.queryFilter(filter, -1);
                const event = events[0];
                const args = event.args;
                expect(args.account).to.equal(player);
            });
        });
        describe("Failure", () => {
            it("reverts when paused is true", async () => {
                tx = await faucetContract.connect(owner).pause();
                await tx.wait();

                await expect(
                    faucetContract.connect(owner).getTokens(),
                ).to.be.revertedWithCustomError(
                    faucetContract,
                    "EnforcedPause",
                );
            });
            it("reverts when the caller is a contract", async () => {
                const helperContract = await ethers.deployContract("Helper");
                await helperContract.waitForDeployment();

                await expect(
                    helperContract
                        .connect(owner)
                        .getTokensThroughProxy(faucetContract.target),
                ).to.be.revertedWithCustomError(faucetContract, "NotAnEOA");
            });
            it("reverts if too little time has passed", async () => {
                const amount = convertTokens(amountTokens, tokenDecimals);
                tx = await faucetContract.connect(player).getTokens();
                await tx.wait();

                tx = await testTokenContract.transfer(owner, amount);
                await tx.wait();

                await expect(
                    faucetContract.connect(player).getTokens(),
                ).to.be.revertedWithCustomError(
                    faucetContract,
                    "WrongRequestTime",
                );
            });
            it("reverts if the caller's balance is enough", async () => {
                const amount = convertTokens(amountTokens, tokenDecimals);
                tx = await faucetContract.connect(player).getTokens();
                await tx.wait();

                const balancePlayer = await testTokenContract.balanceOf(
                    player.address,
                );

                await time.increase(time.duration.hours(25));

                await expect(faucetContract.connect(player).getTokens())
                    .to.be.revertedWithCustomError(
                        faucetContract,
                        "TooManyTokens",
                    )
                    .withArgs(balancePlayer);
            });
        });
    });
});
