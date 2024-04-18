import {
  AnyFiatTokenV2Instance,
  FiatTokenV21InstanceExtended,
} from "../../@types/AnyFiatTokenV2Instance";
import {
  DecreaseMinterAllowance,
  IncreaseMinterAllowance,
} from "../../@types/generated/FiatTokenV21";
import { expectRevert, initializeToVersion } from "../helpers";
import { MAX_UINT256_BN } from "../helpers/constants";
import { usesOriginalStorageSlotPositions } from "../helpers/storageSlots.behavior";
import { behavesLikeFiatTokenV2, getERC1271Wallet } from "./FiatTokenV2.test";
import { hasGasAbstraction } from "./GasAbstraction/GasAbstraction.behavior";
import {
  SignatureBytesType,
  WalletType,
  makeDomainSeparator,
  permitSignature,
  permitSignatureV22,
  transferWithAuthorizationSignature,
  transferWithAuthorizationSignatureV22,
  cancelAuthorizationSignature,
  cancelAuthorizationSignatureV22,
  receiveWithAuthorizationSignature,
  receiveWithAuthorizationSignatureV22,
} from "./GasAbstraction/helpers";

const FiatTokenV2_1 = artifacts.require("FiatTokenV2_1");

contract("FiatTokenV2_1", (accounts) => {
  const fiatTokenOwner = accounts[9];
  let fiatToken: FiatTokenV21InstanceExtended;

  const getFiatToken = (
    signatureBytesType: SignatureBytesType
  ): (() => AnyFiatTokenV2Instance) => {
    return () => {
      initializeOverloadedMethods(fiatToken, signatureBytesType);
      return fiatToken;
    };
  };

  beforeEach(async () => {
    fiatToken = await FiatTokenV2_1.new();
    // await fiatToken.initialize(
    //   "EUR Coin",
    //   "EURR",
    //   "EUR",
    //   6,
    //   fiatTokenOwner,
    //   fiatTokenOwner,
    //   fiatTokenOwner,
    //   fiatTokenOwner
    // );
    // await fiatToken.initializeV2("EUR Coin", { from: fiatTokenOwner });
    await initializeToVersion(fiatToken, "2.1", fiatTokenOwner);
  });

  usesOriginalStorageSlotPositions({
    Contract: FiatTokenV2_1,
    version: 2.1,
    accounts,
  });

  // behavesLikeFiatTokenV2_1(accounts, () => fiatToken, fiatTokenOwner);

  describe("Minter V2_1", () => {
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
          fiatToken.increaseMinterAllowance(minter, MAX_UINT256_BN, {
            from: fiatTokenOwner,
          }),
          "SafeMath: addition overflow."
        );
      });
    });
  });

  describe("initialized contract", () => {
    behavesLikeFiatTokenV2(
      accounts,
      2.1,
      getFiatToken(SignatureBytesType.Unpacked),
      fiatTokenOwner
    );

    behavesLikeFiatTokenV2_1(
      accounts,
      getFiatToken(SignatureBytesType.Packed),
      fiatTokenOwner
    );

    usesOriginalStorageSlotPositions({
      Contract: FiatTokenV2_1,
      version: 2.1,
      accounts,
    });
  });
});

export function behavesLikeFiatTokenV2_1(
  accounts: Truffle.Accounts,
  getFiatToken: () => AnyFiatTokenV2Instance,
  fiatTokenOwner: string
): void {
  // const [minter, arbitraryAccount] = accounts.slice(3);
  let domainSeparator: string;
  let fiatToken: FiatTokenV21InstanceExtended;

  beforeEach(async () => {
    fiatToken = getFiatToken() as FiatTokenV21InstanceExtended;
    domainSeparator = makeDomainSeparator(
      "EUR Coin",
      "2",
      1, // hardcoded to 1 because of ganache bug: https://github.com/trufflesuite/ganache/issues/1643
      fiatToken.address
    );
  });

  const v22TestParams = {
    version: 2.1,
    getFiatToken,
    getDomainSeparator: () => domainSeparator,
    getERC1271Wallet,
    fiatTokenOwner,
    accounts,
  };

  // Test gas abstraction functionalities with both EOA and AA wallets
  hasGasAbstraction({
    ...v22TestParams,
    signerWalletType: WalletType.EOA,
    signatureBytesType: SignatureBytesType.Packed,
  });

  hasGasAbstraction({
    ...v22TestParams,
    signerWalletType: WalletType.AA,
    signatureBytesType: SignatureBytesType.Packed,
  });
}

/**
 * With v2.2 we introduce overloaded functions for `permit`,
 * `transferWithAuthorization`, `receiveWithAuthorization`,
 * and `cancelAuthorization`.
 *
 * Since function overloading isn't supported by Javascript,
 * the typechain library generates type interfaces for overloaded functions differently.
 * For instance, we can no longer access the `permit` function with
 * `fiattoken.permit`. Instead, we need to need to use the full function signature e.g.
 * `fiattoken.methods["permit(address,address,uint256,uint256,uint8,bytes32,bytes32)"]` OR
 * `fiattoken.methods["permit(address,address,uint256,uint256,bytes)"]` (v22 interface).
 *
 * To preserve type-coherence and reuse test suites written for v2 & v2.1 contracts,
 * here we re-assign the overloaded method definition to the method name shorthand.
 */
export function initializeOverloadedMethods(
  fiatToken: FiatTokenV21InstanceExtended,
  signatureBytesType: SignatureBytesType
): void {
  if (signatureBytesType == SignatureBytesType.Unpacked) {
    fiatToken.permit = fiatToken.methods[permitSignature];
    fiatToken.transferWithAuthorization =
      fiatToken.methods[transferWithAuthorizationSignature];
    fiatToken.receiveWithAuthorization =
      fiatToken.methods[receiveWithAuthorizationSignature];
    fiatToken.cancelAuthorization =
      fiatToken.methods[cancelAuthorizationSignature];
  } else {
    fiatToken.permit = fiatToken.methods[permitSignatureV22];
    fiatToken.transferWithAuthorization =
      fiatToken.methods[transferWithAuthorizationSignatureV22];
    fiatToken.receiveWithAuthorization =
      fiatToken.methods[receiveWithAuthorizationSignatureV22];
    fiatToken.cancelAuthorization =
      fiatToken.methods[cancelAuthorizationSignatureV22];
  }
}
