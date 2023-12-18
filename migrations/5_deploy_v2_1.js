require("dotenv").config();
const some = require("lodash/some");

const FiatTokenV2_1 = artifacts.require("FiatTokenV2_1");
const FiatTokenProxy = artifacts.require("FiatTokenProxy");

const THROWAWAY_ADDRESS = "0x0000000000000000000000000000000000000001";

const {
  PROXY_CONTRACT_ADDRESS = "",
} = process.env;

let proxyContractAddress = PROXY_CONTRACT_ADDRESS;

module.exports = async (deployer, network) => {
  if (
    !proxyContractAddress ||
    some(["development", "coverage"], (v) => network.includes(v))
  ) {
    proxyContractAddress = (await FiatTokenProxy.deployed()).address;
  }

  console.log(`FiatTokenProxy: ${proxyContractAddress}`);

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
  await fiatTokenV2_1.initializeV2_1(THROWAWAY_ADDRESS);
};
