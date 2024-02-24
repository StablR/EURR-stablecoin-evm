import { behavesLikeRescuable } from "../v1.1/Rescuable.behavior";
import { FiatTokenV3Instance, RescuableInstance } from "../../@types/generated";
import { usesOriginalStorageSlotPositions } from "../helpers/storageSlots.behavior";
import { hasSafeAllowance } from "../v2/safeAllowance.behavior";
import { hasGasAbstraction } from "../v2/GasAbstraction/GasAbstraction.behavior";
import { makeDomainSeparator } from "../v2/GasAbstraction/helpers";
import { expectRevert } from "../helpers";

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
    await fiatToken.initializeV3({ from: fiatTokenOwner });
  });

  behavesLikeFiatTokenV3(accounts, () => fiatToken, fiatTokenOwner);

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

  beforeEach(async () => {
    domainSeparator = makeDomainSeparator(
      "EUR Coin",
      "3",
      1, // hardcoded to 1 because of ganache bug: https://github.com/trufflesuite/ganache/issues/1643
      getFiatToken().address
    );
  });

  behavesLikeRescuable(getFiatToken as () => RescuableInstance, accounts);

  usesOriginalStorageSlotPositions({
    Contract: FiatTokenV3,
    version: 3,
    accounts,
  });

  it("has the expected domain separator", async () => {
    expect(await getFiatToken().DOMAIN_SEPARATOR()).to.equal(domainSeparator);
  });

  hasSafeAllowance(getFiatToken, fiatTokenOwner, accounts);

  hasGasAbstraction(
    getFiatToken,
    () => domainSeparator,
    fiatTokenOwner,
    accounts
  );

  it("disallows calling initializeV3 twice", async () => {
    await expectRevert(getFiatToken().initializeV3({ from: fiatTokenOwner }));
  });
}
