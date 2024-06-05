require("dotenv").config();

const FiatTokenV2_1 = artifacts.require("FiatTokenV2_1");
const SignatureChecker = artifacts.require("SignatureChecker");

const THROWAWAY_ADDRESS = "0x0000000000000000000000000000000000000001";

module.exports = async (deployer) => {
  console.log("Deploying and linking SignatureChecker library contract...");
  await deployer.deploy(SignatureChecker);
  await deployer.link(SignatureChecker, FiatTokenV2_1);

  console.log("Deploying FiatTokenV2_1 implementation contract...");
  await deployer.deploy(FiatTokenV2_1);

  const fiatTokenV2_1 = await FiatTokenV2_1.deployed();
  console.log("Deployed FiatTokenV2_1 at", fiatTokenV2_1.address);
  console.log(
    "Initializing FiatTokenV2_1 implementation contract with dummy values..."
  );
  await fiatTokenV2_1.initialize(
    "",
    "",
    "",
    0,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS
  );
  await fiatTokenV2_1.initializeV2("");
  await fiatTokenV2_1.initializeV2_1();
};
