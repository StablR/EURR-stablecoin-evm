import { FiatTokenV21Instance } from "../../@types/generated";
import { behavesLikeFiatTokenV2 } from "./FiatTokenV2.test";
import { expectRevert } from "../helpers";
import {
  IncreaseMinterAllowance,
  DecreaseMinterAllowance,
} from "../../@types/generated/FiatTokenV21";
import { MAX_UINT256 } from "../helpers/constants";

const FiatTokenV2_1 = artifacts.require("FiatTokenV2_1");

contract("FiatTokenV2_1", (accounts) => {
  const fiatTokenOwner = accounts[9];
  let fiatToken: FiatTokenV21Instance;

  beforeEach(async () => {
    fiatToken = await FiatTokenV2_1.new();
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
  });

  behavesLikeFiatTokenV2(accounts, () => fiatToken, fiatTokenOwner);

  describe("initializeV2_1", () => {
    const [, user] = accounts;

    beforeEach(async () => {
      await fiatToken.configureMinter(fiatTokenOwner, 1000000e6, {
        from: fiatTokenOwner,
      });
      await fiatToken.mint(user, 100e6, { from: fiatTokenOwner });
    });

    describe("version", () => {
      it("returns the version string", async () => {
        expect(await fiatToken.version()).to.equal("2");
      });
    });

    describe("minter allowance", () => {
      it("should increase minter allowance and emit event", async () => {
        const [, minter] = accounts;

        await fiatToken.configureMinter(minter, 1e6, {
          from: fiatTokenOwner,
        });

        let minterAllowance = await fiatToken.minterAllowance(minter);

        expect(minterAllowance.toNumber()).to.equal(1e6);

        const result = await fiatToken.increaseMinterAllowance(minter, 10e6, {
          from: fiatTokenOwner,
        });

        const log = result.logs[0] as Truffle.TransactionLog<
          IncreaseMinterAllowance
        >;

        minterAllowance = await fiatToken.minterAllowance(minter);

        expect(log.event).to.equal("IncreaseMinterAllowance");
        expect(log.args[0]).to.equal(minter);
        expect(log.args[1].toNumber()).to.equal(10e6);
        expect(minterAllowance.toNumber()).to.equal(11e6);
      });

      it("should decrease minter allowance and emit event", async () => {
        const [, minter] = accounts;

        await fiatToken.configureMinter(minter, 10e6, {
          from: fiatTokenOwner,
        });

        let minterAllowance = await fiatToken.minterAllowance(minter);

        expect(minterAllowance.toNumber()).to.equal(10e6);

        const result = await fiatToken.decreaseMinterAllowance(minter, 3e6, {
          from: fiatTokenOwner,
        });

        const log = result.logs[0] as Truffle.TransactionLog<
          DecreaseMinterAllowance
        >;

        minterAllowance = await fiatToken.minterAllowance(minter);

        expect(log.event).to.equal("DecreaseMinterAllowance");
        expect(log.args[0]).to.equal(minter);
        expect(log.args[1].toNumber()).to.equal(3e6);
        expect(minterAllowance.toNumber()).to.equal(7e6);
      });

      it("should not decrease minter allowance under 0", async () => {
        const [, minter] = accounts;

        await fiatToken.configureMinter(minter, 10e6, {
          from: fiatTokenOwner,
        });

        await expectRevert(
          fiatToken.decreaseMinterAllowance(minter, 20e6, {
            from: fiatTokenOwner,
          }),
          "decreased minter allowance below zero."
        );
      });

      it("should increase minter allowance over maximum int value", async () => {
        const [, minter] = accounts;

        await fiatToken.configureMinter(minter, 10e6, {
          from: fiatTokenOwner,
        });

        await expectRevert(
          fiatToken.increaseMinterAllowance(minter, MAX_UINT256, {
            from: fiatTokenOwner,
          }),
          "SafeMath: addition overflow."
        );
      });
    });
  });
});
