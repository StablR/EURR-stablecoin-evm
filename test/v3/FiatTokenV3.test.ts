import { behavesLikeRescuable } from "../v1.1/Rescuable.behavior";
import { FiatTokenV3Instance, RescuableInstance } from "../../@types/generated";
import { usesOriginalStorageSlotPositions } from "../helpers/storageSlots.behavior";
import { hasSafeAllowance } from "../v2/safeAllowance.behavior";
import { hasGasAbstraction } from "../v2/GasAbstraction/GasAbstraction.behavior";
import { makeDomainSeparator } from "../v2/GasAbstraction/helpers";
import { expectRevert } from "../helpers";
import { behavesLikeFiatTokenV2 } from "../v2/FiatTokenV2.test";

const FiatTokenV3 = artifacts.require("FiatTokenV3");

contract("FiatTokenV3", (accounts) => {
  const fiatTokenOwner = accounts[9];
  let fiatToken: FiatTokenV3Instance;

  beforeEach(async () => {
    fiatToken = await FiatTokenV3.new();
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

  describe("version", () => {
    it("returns the version string", async () => {
      expect(await fiatToken.version()).to.equal("3");
    });
  });
});

export function behavesLikeFiatTokenV3(
  accounts: Truffle.Accounts,
  getFiatToken: () => FiatTokenV3Instance,
  fiatTokenOwner: string
): void {
  let domainSeparator: string;
  let fiatToken = getFiatToken();

  beforeEach(async () => {
    domainSeparator = makeDomainSeparator(
      "EUR Coin",
      "3",
      1, // hardcoded to 1 because of ganache bug: https://github.com/trufflesuite/ganache/issues/1643
      getFiatToken().address
    );
  });
  describe("initializeV3", () => {
    const [, user, lostAndFound] = accounts;

    beforeEach(async () => {
      await fiatToken.configureMinter(fiatTokenOwner, 1000000e6, {
        from: fiatTokenOwner,
      });
      await fiatToken.mint(user, 100e6, { from: fiatTokenOwner });
    });

    it("transfers funds to a given address", async () => {
      // send tokens to the contract address
      await fiatToken.transfer(fiatToken.address, 100e6, { from: user });

      expect(
        (await fiatToken.balanceOf(fiatToken.address)).toNumber()
      ).to.equal(100e6);

      // initialize v3
      await fiatToken.initializeV3({ from: fiatTokenOwner });

      expect(
        (await fiatToken.balanceOf(fiatToken.address)).toNumber()
      ).to.equal(0);

      expect((await fiatToken.balanceOf(lostAndFound)).toNumber()).to.equal(
        100e6
      );
    });

    it("disallows calling initializeV3 twice", async () => {
      await fiatToken.initializeV3({ from: fiatTokenOwner });
      await expectRevert(fiatToken.initializeV3({ from: fiatTokenOwner }));
    });
  });
}
