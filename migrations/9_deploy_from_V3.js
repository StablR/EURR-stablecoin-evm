require("dotenv").config();
const some = require("lodash/some");

const FiatTokenV3 = artifacts.require("FiatTokenV3");

const THROWAWAY_ADDRESS = "0x0000000000000000000000000000000000000001";

const { PROXY_ADMIN_ADDRESS = "", OWNER_ADDRESS = "" } = process.env;

let proxyAdminAddress = PROXY_ADMIN_ADDRESS;
let ownerAddress = OWNER_ADDRESS;

module.exports = async (deployer, network) => {
  if (some(["development", "coverage"], (v) => network.includes(v))) {
    // DO NOT USE THESE ADDRESSES IN PRODUCTION - these are the deterministic
    // addresses from ganache, so the private keys are well known and match the
    // values we use in the tests
    proxyAdminAddress = "0x69D7b24ADC049Fc1337F1F6F5593D19d8D605B04";
    ownerAddress = "0x13a06C2df9Ccc5C0352aFEDB363dB8D4b9F8FD08";
  }

  console.log(`Proxy Admin:   ${proxyAdminAddress}`);
  console.log(`Owner:         ${ownerAddress}`);

  if (!proxyAdminAddress || !ownerAddress) {
    throw new Error(
      "PROXY_ADMIN_ADDRESS, OWNER_ADDRESS and MASTERMINTER_ADDRESS must be provided in the env variables"
    );
  }

  console.log("Deploying implementation contract...");
  await deployer.deploy(FiatTokenV3);
  const fiatTokenV3 = await FiatTokenV3.deployed();
  console.log("Deployed implementation contract at", FiatTokenV3.address);

  console.log("Initializing implementation contract with dummy values...");
  await fiatTokenV3.initialize(
    "",
    "",
    "",
    0,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS
  );
  await fiatTokenV3.initializeV2("");
  await fiatTokenV3.initializeV3();
};
