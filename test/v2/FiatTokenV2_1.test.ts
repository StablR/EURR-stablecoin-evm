import { FiatTokenV21Instance } from "../../@types/generated";
import { behavesLikeFiatTokenV2 } from "./FiatTokenV2.test";

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
  });
});
