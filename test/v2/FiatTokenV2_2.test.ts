import {
  FiatTokenV22Instance,
  MockProofOfReserveFeedInstance,
} from "../../@types/generated";
import { behavesLikeFiatTokenV2 } from "./FiatTokenV2.test";
import { expectRevert } from "../helpers";
import {
  NewChainReserveFeed,
  ProofOfReserveEnabled,
  Mint,
} from "../../@types/generated/FiatTokenV22";
import { ProofOfReserveDisabled } from "../../@types/generated/FiatTokenV22";

const zeroAddress = "0x0000000000000000000000000000000000000000";
const FiatTokenV2_2 = artifacts.require("FiatTokenV2_2");
const MockProofOfReserveFeed = artifacts.require("MockProofOfReserveFeed");

contract("FiatTokenV2_2", (accounts) => {
  const fiatTokenOwner = accounts[9];
  let fiatToken: FiatTokenV22Instance;

  beforeEach(async () => {
    fiatToken = await FiatTokenV2_2.new();
    await fiatToken.initialize(
      "EUR Coin",
      "EURR",
      "EUR",
      6,
      fiatTokenOwner,
      fiatTokenOwner,
      fiatTokenOwner,
      fiatTokenOwner
    );

    await fiatToken.initializeV2("EUR Coin", { from: fiatTokenOwner });
    await fiatToken.initializeV2_1({ from: fiatTokenOwner });
  });

  behavesLikeFiatTokenV2(accounts, () => fiatToken, fiatTokenOwner);

  describe("initializeV2_2", () => {
    const [, user] = accounts;

    beforeEach(async () => {
      await fiatToken.configureMinter(fiatTokenOwner, 1000000e6, {
        from: fiatTokenOwner,
      });
      await fiatToken.mint(user, 100e6, { from: fiatTokenOwner });
    });

    describe("proof of reserve", () => {
      it("should set chain feed", async () => {
        const result = await fiatToken.setChainReserveFeed(
          MockProofOfReserveFeed.address,
          {
            from: fiatTokenOwner,
          }
        );

        const log = result.logs[0] as Truffle.TransactionLog<
          NewChainReserveFeed
        >;

        expect(log.event).to.equal("NewChainReserveFeed");
        expect(log.args[0]).to.equal(zeroAddress);
        expect(log.args[1]).to.equal(MockProofOfReserveFeed.address);
        expect(await fiatToken.chainReserveFeed()).to.equal(
          MockProofOfReserveFeed.address
        );
      });

      it("should enable/disable chain feed", async () => {
        await fiatToken.setChainReserveFeed(MockProofOfReserveFeed.address, {
          from: fiatTokenOwner,
        });

        await fiatToken.setChainReserveHeartbeat(36000, {
          from: fiatTokenOwner,
        });

        expect(await fiatToken.proofOfReserveEnabled()).to.equal(false);

        let result = await fiatToken.enableProofOfReserve({
          from: fiatTokenOwner,
        });

        const log = result.logs[0] as Truffle.TransactionLog<
          ProofOfReserveEnabled
        >;

        expect(log.event).to.equal("ProofOfReserveEnabled");
        expect(await fiatToken.proofOfReserveEnabled()).to.equal(true);

        result = await fiatToken.disableProofOfReserve({
          from: fiatTokenOwner,
        });

        const log2 = result.logs[0] as Truffle.TransactionLog<
          ProofOfReserveDisabled
        >;

        expect(log2.event).to.equal("ProofOfReserveDisabled");
        expect(await fiatToken.proofOfReserveEnabled()).to.equal(false);
      });

      it("should not enable without feed", async () => {
        await expectRevert(
          fiatToken.enableProofOfReserve({
            from: fiatTokenOwner,
          }),
          "chainReserveFeed not set"
        );
      });

      it("should not enable without heartbeat", async () => {
        await fiatToken.setChainReserveFeed(MockProofOfReserveFeed.address, {
          from: fiatTokenOwner,
        });

        await expectRevert(
          fiatToken.enableProofOfReserve({
            from: fiatTokenOwner,
          }),
          "chainReserveHeartbeat not set"
        );
      });

      it("should mint with disabled proof of reserve", async () => {
        await fiatToken.configureMinter(fiatTokenOwner, 1000000e6, {
          from: fiatTokenOwner,
        });

        const result = await fiatToken.mint(user, 10e6, {
          from: fiatTokenOwner,
        });

        const log = result.logs[0] as Truffle.TransactionLog<Mint>;

        expect(log.event).to.equal("Mint");
        expect(log.args[0]).to.equal(fiatTokenOwner);
        expect(log.args[1]).to.equal(user);
        expect(log.args[2].toNumber()).to.equal(10e6);
      });

      it("should mint when reserve is greater than new mint", async () => {
        const PoRInstance = await setupProofOfReserve(
          fiatToken,
          fiatTokenOwner
        );
        const dateInSeconds = Math.floor(Date.now() / 1000);

        await PoRInstance.setRoundData(
          2,
          120e6,
          dateInSeconds - 10,
          dateInSeconds - 10,
          2
        );

        const result = await fiatToken.mint(user, 1e6, {
          from: fiatTokenOwner,
        });

        const log = result.logs[0] as Truffle.TransactionLog<Mint>;

        expect(log.event).to.equal("Mint");
        expect(log.args[0]).to.equal(fiatTokenOwner);
        expect(log.args[1]).to.equal(user);
        expect(log.args[2].toNumber()).to.equal(1e6);
      });

      it("should not mint when reserve response is old", async () => {
        const PoRInstance = await setupProofOfReserve(
          fiatToken,
          fiatTokenOwner
        );
        const OneWeekInSec = 604800;
        await PoRInstance.setRoundData(2, 120e6, OneWeekInSec, OneWeekInSec, 2);

        await expectRevert(
          fiatToken.mint(user, 1e6, {
            from: fiatTokenOwner,
          }),
          "PoR answer is stale"
        );
      });

      it("should not mint when reserve decimal is different", async () => {
        const PoRInstance = await setupProofOfReserve(
          fiatToken,
          fiatTokenOwner
        );
        const dateInSeconds = Math.floor(Date.now() / 1000);
        await PoRInstance.setRoundData(
          2,
          120e6,
          dateInSeconds - 10,
          dateInSeconds - 10,
          2
        );
        await PoRInstance.setDecimal(8);

        await expectRevert(
          fiatToken.mint(user, 1e6, {
            from: fiatTokenOwner,
          }),
          "Unexpected decimals of PoR feed"
        );
      });

      it("should not mint when reserve is less than new mint", async () => {
        const PoRInstance = await setupProofOfReserve(
          fiatToken,
          fiatTokenOwner
        );
        const dateInSeconds = Math.floor(Date.now() / 1000);

        await PoRInstance.setRoundData(
          2,
          10e6,
          dateInSeconds - 10,
          dateInSeconds - 10,
          2
        );

        await expectRevert(
          fiatToken.mint(user, 1e6, {
            from: fiatTokenOwner,
          }),
          "Total supply would exceed reserves after mint"
        );
      });

      /**
       * Mainnet simulation of PoR minting using forked ganache.
       */
      it.skip("Manual: [MAINNET SIMULATION]", async () => {
        await fiatToken.configureMinter(fiatTokenOwner, 5000000e6, {
          from: fiatTokenOwner,
        });

        // ---- set proof of reserve settings
        await fiatToken.setChainReserveFeed(
          "0x652Ac4468688f277fB84b26940e736a20A87Ac2d",
          {
            from: fiatTokenOwner,
          }
        );
        await fiatToken.setChainReserveHeartbeat(36000, {
          from: fiatTokenOwner,
        });
        await fiatToken.enableProofOfReserve({ from: fiatTokenOwner });
        // ----------------------------------

        const mockPoR = await MockProofOfReserveFeed.at(
          "0x652Ac4468688f277fB84b26940e736a20A87Ac2d"
        );
        const result = await mockPoR.latestRoundData();

        console.log("should mint successfully.");
        await fiatToken.mint(user, 1e6, { from: fiatTokenOwner });

        console.log("should not mint over reserve amount.");
        await expectRevert(
          fiatToken.mint(user, result[1], {
            from: fiatTokenOwner,
          }),
          "Total supply would exceed reserves after mint"
        );

        console.log("should not mint with old reserve data.");
        await fiatToken.setChainReserveHeartbeat(1, {
          from: fiatTokenOwner,
        });

        await expectRevert(
          fiatToken.mint(user, 1e6, {
            from: fiatTokenOwner,
          }),
          "PoR answer is stale"
        );
      });
    });
  });
});

async function setupProofOfReserve(
  fiatToken: FiatTokenV22Instance,
  fiatTokenOwner: string
): Promise<MockProofOfReserveFeedInstance> {
  const PoRInstance = await MockProofOfReserveFeed.new();
  await fiatToken.setChainReserveFeed(PoRInstance.address, {
    from: fiatTokenOwner,
  });
  await fiatToken.setChainReserveHeartbeat(36000, { from: fiatTokenOwner });
  await fiatToken.enableProofOfReserve({ from: fiatTokenOwner });

  return PoRInstance;
}
